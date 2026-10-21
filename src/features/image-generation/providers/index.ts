import "server-only";
import { ProviderError } from "../domain/errors";
import type { AspectRatio } from "../domain/options";
import { getServerConfig } from "../server/config";
import { createGeminiImageProvider } from "./gemini-provider";
import { MockImageProvider } from "./mock-provider";
import type { ImageProvider, ProviderConfig } from "./types";

const providers = new Map<string, ImageProvider>();

/**
 * Resolves the provider named in an item's config snapshot, not the current env choice, so a
 * permitted run uses the provider the item was planned for. The service checks the current
 * server policy before resolving it; a snapshot cannot authorise a revoked provider.
 */
export function resolveImageProvider(name: string): ImageProvider {
  const cached = providers.get(name);
  if (cached) return cached;
  const config = getServerConfig();
  let provider: ImageProvider;
  if (name === "mock") {
    provider = new MockImageProvider({ failureRate: config.MOCK_FAILURE_RATE });
  } else if (name === "gemini") {
    if (!config.GEMINI_API_KEY) {
      throw new ProviderError(
        "Gemini is not configured on this server (GEMINI_API_KEY is missing)",
        "invalid",
      );
    }
    provider = createGeminiImageProvider(config.GEMINI_API_KEY);
  } else {
    throw new ProviderError(`Unknown image provider "${name}"`, "invalid");
  }
  providers.set(name, provider);
  return provider;
}

/** Snapshot of the current provider settings, stored on each item when a batch is planned. */
export function providerConfigFor(aspectRatio: AspectRatio): ProviderConfig {
  const config = getServerConfig();
  const gemini = config.IMAGE_PROVIDER === "gemini";
  return {
    provider: config.IMAGE_PROVIDER,
    model: gemini ? config.GEMINI_IMAGE_MODEL : "mock",
    aspectRatio,
    imageSize: config.GEMINI_IMAGE_SIZE,
    thinkingLevel: config.GEMINI_THINKING_LEVEL,
  };
}

export type { ImageProvider, ProviderConfig } from "./types";
