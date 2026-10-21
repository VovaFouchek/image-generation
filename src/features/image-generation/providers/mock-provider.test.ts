import { describe, expect, it } from "vitest";
import { ProviderError } from "../domain/errors";
import { MockImageProvider } from "./mock-provider";
import type { ImageGenerationInput, ProviderConfig } from "./types";

function input(
  aspectRatio: ProviderConfig["aspectRatio"],
  idempotencyKey: string,
  attempt = 1,
): ImageGenerationInput {
  return {
    config: {
      provider: "mock",
      model: "mock",
      aspectRatio,
      imageSize: "1K",
      thinkingLevel: "medium",
    },
    systemInstruction: "",
    prompt: "",
    idempotencyKey,
    attempt,
  };
}

const keys = Array.from({ length: 40 }, (_, index) => `item-${index}`);

describe("MockImageProvider", () => {
  it.each([
    ["1:1", 'width="1024" height="1024"'],
    ["4:5", 'width="928" height="1152"'],
    ["16:9", 'width="1376" height="768"'],
  ] as const)("renders %s at the model's native size", async (ratio, size) => {
    const image = await new MockImageProvider({ delayMs: 0 }).generate(
      input(ratio, "item-1"),
    );
    expect(image.mimeType).toBe("image/svg+xml");
    expect(new TextDecoder().decode(image.data)).toContain(size);
  });

  it("never fails with the default failure rate", async () => {
    const provider = new MockImageProvider({ delayMs: 0 });
    await expect(
      Promise.all(keys.map((key) => provider.generate(input("1:1", key)))),
    ).resolves.toHaveLength(keys.length);
  });

  it("fails some first attempts and lets the retry succeed", async () => {
    const provider = new MockImageProvider({ delayMs: 0, failureRate: 0.5 });
    const results = await Promise.allSettled(
      keys.map((key) => provider.generate(input("1:1", key))),
    );
    const failedKeys = keys.filter(
      (_, index) => results[index]?.status === "rejected",
    );

    expect(failedKeys.length).toBeGreaterThan(0);
    expect(failedKeys.length).toBeLessThan(keys.length);
    for (const result of results) {
      if (result.status === "rejected") {
        expect(result.reason).toBeInstanceOf(ProviderError);
        expect(result.reason.retryable).toBe(true);
      }
    }
    await expect(
      Promise.all(
        failedKeys.map((key) => provider.generate(input("1:1", key, 2))),
      ),
    ).resolves.toHaveLength(failedKeys.length);
  });

  it("makes the same failure decision for the same item", async () => {
    const provider = new MockImageProvider({ delayMs: 0, failureRate: 0.5 });
    const run = () =>
      Promise.allSettled(
        keys.map((key) => provider.generate(input("1:1", key))),
      ).then((results) => results.map((result) => result.status));
    expect(await run()).toEqual(await run());
  });
});
