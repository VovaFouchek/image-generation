import { ProviderError } from "../domain/errors";
import type {
  GeneratedImage,
  ImageGenerationInput,
  ImageProvider,
  ProviderConfig,
} from "./types";

// Native sizes Nano Banana 2.1 returned at 1K in the 21.10.2026 check (plan §12).
const SIZES: Record<ProviderConfig["aspectRatio"], [number, number]> = {
  "1:1": [1024, 1024],
  "4:5": [928, 1152],
  "16:9": [1376, 768],
};

export interface MockProviderOptions {
  delayMs?: number;
  /** Share of items (0–1) whose first attempt fails, so retry UI can be exercised. */
  failureRate?: number;
}

/**
 * Offline provider: an SVG placeholder in the requested format after a short delay. Free and
 * deterministic: the same item always gets the same colour and the same failure decision.
 */
export class MockImageProvider implements ImageProvider {
  readonly name = "mock";
  private readonly delayMs: number;
  private readonly failureRate: number;

  constructor({ delayMs = 800, failureRate = 0 }: MockProviderOptions = {}) {
    this.delayMs = delayMs;
    this.failureRate = failureRate;
  }

  async generate(input: ImageGenerationInput): Promise<GeneratedImage> {
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    const bucket = hash(input.idempotencyKey) % 100;
    if (input.attempt === 1 && bucket < this.failureRate * 100) {
      throw new ProviderError("Simulated provider failure (mock)", "transient");
    }

    const [width, height] = SIZES[input.config.aspectRatio];
    const hue = hash(input.idempotencyKey) % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="hsl(${hue} 55% 75%)"/><text x="50%" y="50%" font-family="sans-serif" font-size="40" text-anchor="middle" fill="#1f1f1f">mock ${input.config.aspectRatio}</text></svg>`;
    return {
      mimeType: "image/svg+xml",
      data: new TextEncoder().encode(svg),
      model: "mock",
    };
  }
}

function hash(value: string) {
  let h = 0;
  for (const char of value) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}
