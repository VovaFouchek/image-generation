import {
  BlockedReason,
  FinishReason,
  GenerateContentResponse,
  ThinkingLevel,
  type GenerateContentParameters,
} from "@google/genai";
import { describe, expect, it } from "vitest";
import { ProviderError } from "../domain/errors";
import { GeminiImageProvider } from "./gemini-provider";
import type { ImageGenerationInput } from "./types";

const PNG_BASE64 = Buffer.from("fake-png").toString("base64");

const input: ImageGenerationInput = {
  config: {
    provider: "gemini",
    model: "gemini-nano-banana-2.1",
    aspectRatio: "4:5",
    imageSize: "1K",
    thinkingLevel: "medium",
  },
  systemInstruction: "Goldfizh vision",
  prompt: "A courier on a cargo bike",
  idempotencyKey: "item-1",
  attempt: 1,
};

function response(fields: Partial<GenerateContentResponse>) {
  return Object.assign(new GenerateContentResponse(), fields);
}

function imageResponse() {
  return response({
    responseId: "resp-1",
    candidates: [
      {
        finishReason: FinishReason.STOP,
        content: {
          parts: [
            {
              thought: true,
              inlineData: { mimeType: "image/png", data: "eA==" },
            },
            { inlineData: { mimeType: "image/jpeg", data: PNG_BASE64 } },
          ],
        },
      },
    ],
    usageMetadata: {
      promptTokenCount: 71,
      candidatesTokenCount: 1120,
      thoughtsTokenCount: 600,
    },
  });
}

/** Records the request and replies with the given response or error. */
function fakeClient(reply: () => Promise<GenerateContentResponse>) {
  const calls: GenerateContentParameters[] = [];
  return {
    calls,
    client: {
      models: {
        generateContent: (params: GenerateContentParameters) => {
          calls.push(params);
          return reply();
        },
      },
    },
  };
}

function httpError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), { status });
}

async function caught(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ProviderError) return error;
    throw error;
  }
  throw new Error("expected a ProviderError");
}

describe("GeminiImageProvider", () => {
  it("returns the final image and skips interim thought images", async () => {
    const { client } = fakeClient(async () => imageResponse());
    const image = await new GeminiImageProvider(client).generate(input);

    expect(image.mimeType).toBe("image/jpeg");
    expect(Buffer.from(image.data).toString()).toBe("fake-png");
    expect(image).toMatchObject({
      model: "gemini-nano-banana-2.1",
      providerRequestId: "resp-1",
      usage: { inputTokens: 71, outputTokens: 1120, thoughtTokens: 600 },
    });
  });

  it("sends the snapshot config and no seed or temperature", async () => {
    const { client, calls } = fakeClient(async () => imageResponse());
    await new GeminiImageProvider(client).generate(input);

    const call = calls[0];
    expect(call?.model).toBe("gemini-nano-banana-2.1");
    expect(call?.config).toMatchObject({
      systemInstruction: "Goldfizh vision",
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio: "4:5", imageSize: "1K" },
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
    });
    expect(call?.config).not.toHaveProperty("seed");
    expect(call?.config).not.toHaveProperty("temperature");
  });

  it.each([
    [429, "rate_limit", true],
    [402, "billing", false],
    [500, "transient", true],
    [503, "transient", true],
    [400, "invalid", false],
    [403, "invalid", false],
  ] as const)(
    "classifies HTTP %i as %s (retryable: %s)",
    async (status, kind, retryable) => {
      const { client } = fakeClient(async () => {
        throw httpError(status);
      });
      const error = await caught(
        new GeminiImageProvider(client).generate(input),
      );
      expect(error.kind).toBe(kind);
      expect(error.retryable).toBe(retryable);
    },
  );

  it("treats a network error without status as transient", async () => {
    const { client } = fakeClient(async () => {
      throw new TypeError("fetch failed");
    });
    const error = await caught(new GeminiImageProvider(client).generate(input));
    expect(error.kind).toBe("transient");
  });

  it("does not retry a blocked prompt", async () => {
    const { client } = fakeClient(async () =>
      response({ promptFeedback: { blockReason: BlockedReason.IMAGE_SAFETY } }),
    );
    const error = await caught(new GeminiImageProvider(client).generate(input));
    expect(error.kind).toBe("safety");
    expect(error.retryable).toBe(false);
  });

  it.each([
    [FinishReason.IMAGE_SAFETY, "safety"],
    [FinishReason.IMAGE_PROHIBITED_CONTENT, "safety"],
    [FinishReason.OTHER, "transient"],
    [FinishReason.MAX_TOKENS, "transient"],
  ] as const)(
    "classifies finishReason %s without an image as %s",
    async (finishReason, kind) => {
      const { client } = fakeClient(async () =>
        response({
          candidates: [{ finishReason, content: { parts: [] } }],
        }),
      );
      const error = await caught(
        new GeminiImageProvider(client).generate(input),
      );
      expect(error.kind).toBe(kind);
    },
  );
});
