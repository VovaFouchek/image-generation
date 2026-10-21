import "server-only";
import {
  GoogleGenAI,
  ThinkingLevel as SdkThinkingLevel,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from "@google/genai";
import { ProviderError, type ProviderErrorKind } from "../domain/errors";
import type {
  GeneratedImage,
  ImageGenerationInput,
  ImageProvider,
  ThinkingLevel,
} from "./types";

/** The slice of the SDK this provider uses; injectable for tests. */
export interface GeminiModelsClient {
  models: {
    generateContent(
      params: GenerateContentParameters,
    ): Promise<GenerateContentResponse>;
  };
}

const THINKING: Record<ThinkingLevel, SdkThinkingLevel> = {
  minimal: SdkThinkingLevel.MINIMAL,
  medium: SdkThinkingLevel.MEDIUM,
  high: SdkThinkingLevel.HIGH,
};

// The image itself was refused; the same prompt will be refused again.
const SAFETY_FINISH_REASONS = new Set([
  "SAFETY",
  "IMAGE_SAFETY",
  "PROHIBITED_CONTENT",
  "IMAGE_PROHIBITED_CONTENT",
  "RECITATION",
  "IMAGE_RECITATION",
  "BLOCKLIST",
  "SPII",
]);

export function createGeminiImageProvider(apiKey: string) {
  return new GeminiImageProvider(new GoogleGenAI({ apiKey }));
}

export class GeminiImageProvider implements ImageProvider {
  readonly name = "gemini";

  constructor(private readonly client: GeminiModelsClient) {}

  async generate(input: ImageGenerationInput): Promise<GeneratedImage> {
    const { config } = input;
    const response = await this.client.models
      .generateContent({
        model: config.model,
        contents: [
          {
            role: "user",
            parts: [{ text: input.prompt }],
          },
        ],
        config: {
          systemInstruction: input.systemInstruction,
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: config.aspectRatio,
            imageSize: config.imageSize,
          },
          thinkingConfig: { thinkingLevel: THINKING[config.thinkingLevel] },
          abortSignal: input.signal,
        },
      })
      .catch((error: unknown) => {
        throw fromRequestError(error);
      });

    const blockReason = response.promptFeedback?.blockReason;
    if (blockReason) {
      throw new ProviderError(`Prompt blocked (${blockReason})`, "safety");
    }

    const candidate = response.candidates?.[0];
    // Thinking can return interim "thought" images; only the final image counts.
    const image = candidate?.content?.parts?.find(
      (part) => !part.thought && part.inlineData?.data,
    )?.inlineData;
    if (!image?.data) throw fromFinishReason(candidate?.finishReason);

    const usage = response.usageMetadata;
    return {
      mimeType: image.mimeType ?? "image/png",
      data: Buffer.from(image.data, "base64"),
      model: config.model,
      providerRequestId: response.responseId,
      usage: {
        inputTokens: usage?.promptTokenCount,
        outputTokens: usage?.candidatesTokenCount,
        thoughtTokens: usage?.thoughtsTokenCount,
      },
    };
  }
}

/**
 * Classify by HTTP status, not by the status string: Gemini answers RESOURCE_EXHAUSTED both
 * for rate limits (429, retry) and for depleted prepaid credits (402, do not retry).
 */
function fromRequestError(error: unknown): ProviderError {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number(error.status)
      : undefined;
  const message =
    error instanceof Error ? error.message : "Provider request failed";
  return new ProviderError(message, kindForStatus(status));
}

function kindForStatus(status: number | undefined): ProviderErrorKind {
  if (status === undefined || Number.isNaN(status)) return "transient"; // network
  if (status === 429) return "rate_limit";
  if (status === 402) return "billing";
  if (status >= 500) return "transient";
  return "invalid"; // 400 bad request, 401/403 key or permission, 404 model
}

function fromFinishReason(reason: string | undefined): ProviderError {
  const label = reason ?? "unknown";
  return SAFETY_FINISH_REASONS.has(label)
    ? new ProviderError(`Image refused (${label})`, "safety")
    : new ProviderError(`No image returned (${label})`, "transient");
}
