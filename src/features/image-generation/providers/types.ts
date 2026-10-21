import type { AspectRatio } from "../domain/options";

export const IMAGE_SIZES = ["1K", "2K", "4K"] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

export const THINKING_LEVELS = ["minimal", "medium", "high"] as const;
export type ThinkingLevel = (typeof THINKING_LEVELS)[number];

/**
 * Everything that shapes the provider call, snapshotted on each item when the batch is
 * planned. Retries use this snapshot only while the current server policy still permits it;
 * revoked settings fail rather than being silently replaced with the current configuration.
 * No seed or temperature: Nano Banana 2.1 rejects them.
 */
export interface ProviderConfig {
  provider: string;
  model: string;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  thinkingLevel: ThinkingLevel;
}

export interface ImageGenerationInput {
  config: ProviderConfig;
  systemInstruction: string;
  prompt: string;
  /** Stable per item, e.g. the item id. Used for tracing and by the mock. */
  idempotencyKey: string;
  /** 1 for the first try; increases with each retry. */
  attempt: number;
  signal?: AbortSignal;
}

export interface GeneratedImage {
  mimeType: string;
  data: Uint8Array;
  model: string;
  providerRequestId?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    thoughtTokens?: number;
  };
}

/**
 * Provider seam. Brief and prompt are provider-agnostic; only this layer knows the SDK.
 * Implementations throw ProviderError with a kind that decides retry and the UI message.
 */
export interface ImageProvider {
  readonly name: string;
  generate(input: ImageGenerationInput): Promise<GeneratedImage>;
}
