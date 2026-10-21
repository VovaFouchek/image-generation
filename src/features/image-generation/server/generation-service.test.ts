import { describe, expect, it } from "vitest";
import {
  BriefConflictError,
  InvalidSourceBatchError,
  NotFoundError,
  ProviderError,
  type ProviderErrorKind,
} from "../domain/errors";
import { BATCH_SIZE } from "../domain/options";
import { mockKnowledgeSource } from "../knowledge/mock-knowledge";
import type {
  ImageGenerationInput,
  ImageProvider,
  ProviderConfig,
} from "../providers/types";
import { MemoryGenerationRepository } from "../repository/memory-repository";
import type { GenerationBatch } from "../repository/types";
import {
  demoTenant,
  freshRequest,
  travelRequest,
  withNoPeopleRule,
} from "../test-fixtures";
import type { RequestContext } from "./context";
import {
  createSingleBatch,
  createVariationsBatch,
  runItem,
} from "./generation-service";

/** Provider that replays a script of outcomes and records every call. */
function scriptedProvider(
  script: Array<"ok" | ProviderErrorKind | "hang">,
): ImageProvider & { calls: ImageGenerationInput[] } {
  const calls: ImageGenerationInput[] = [];
  return {
    name: "fake",
    calls,
    async generate(input) {
      const step = script[calls.length] ?? "ok";
      calls.push(input);
      if (step === "hang") {
        return new Promise((_, reject) =>
          input.signal?.addEventListener("abort", () =>
            reject(new ProviderError("aborted", "transient")),
          ),
        );
      }
      if (step !== "ok") throw new ProviderError(`fake ${step}`, step);
      return {
        mimeType: "image/png",
        data: new Uint8Array([1]),
        model: "fake",
        usage: { inputTokens: 10, outputTokens: 1120, thoughtTokens: 5 },
      };
    },
  };
}

function context(
  tenantId: string,
  provider: ImageProvider,
  repository = new MemoryGenerationRepository(),
): RequestContext {
  return {
    tenant: { tenantId, userId: "test-user", role: "user" },
    repository,
    knowledge: mockKnowledgeSource,
    resolveProvider: () => provider,
    providerConfigFor: (aspectRatio): ProviderConfig => ({
      provider: "fake",
      model: "fake",
      aspectRatio,
      imageSize: "1K",
      thinkingLevel: "medium",
    }),
  };
}

function onlyItem(batch: GenerationBatch) {
  const item = batch.items[0];
  if (!item) throw new Error("batch has no items");
  return item;
}

async function succeededSingle(ctx: RequestContext) {
  const batch = await createSingleBatch(ctx, freshRequest());
  await runItem(ctx, batch.id, onlyItem(batch).id);
  return batch;
}

describe("generation service", () => {
  it("rejects a rule conflict before storing anything or calling the provider", async () => {
    const provider = scriptedProvider([]);
    const repository = new MemoryGenerationRepository();
    const ctx = context("demo-travel", provider, repository);
    ctx.knowledge = {
      ...mockKnowledgeSource,
      getTenant: async (tenantId) => withNoPeopleRule(demoTenant(tenantId)),
    };

    await expect(
      createSingleBatch(ctx, travelRequest({ brandSegmentId: "families" })),
    ).rejects.toBeInstanceOf(BriefConflictError);
    expect(provider.calls).toHaveLength(0);
  });

  it("snapshots the provider config on every planned item", async () => {
    const ctx = context("demo-fresh", scriptedProvider([]));
    const batch = await createSingleBatch(ctx, freshRequest());
    expect(onlyItem(batch).config).toEqual({
      provider: "fake",
      model: "fake",
      aspectRatio: "16:9",
      imageSize: "1K",
      thinkingLevel: "medium",
    });
  });

  describe("variations", () => {
    it("reuse the example's request and brief for 15 items", async () => {
      const ctx = context("demo-fresh", scriptedProvider([]));
      const single = await succeededSingle(ctx);
      const batch = await createVariationsBatch(ctx, single.id);

      expect(batch.items).toHaveLength(BATCH_SIZE);
      expect(batch.sourceBatchId).toBe(single.id);
      expect(batch.brief).toEqual(single.brief);
      expect(batch.request).toEqual(single.request);
    });

    it("cannot start from another tenant's batch", async () => {
      const repository = new MemoryGenerationRepository();
      const fresh = context("demo-fresh", scriptedProvider([]), repository);
      const travel = context("demo-travel", scriptedProvider([]), repository);
      const single = await succeededSingle(fresh);

      await expect(
        createVariationsBatch(travel, single.id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("need a successful example first", async () => {
      const ctx = context("demo-fresh", scriptedProvider(["safety"]));
      const single = await createSingleBatch(ctx, freshRequest());
      await expect(
        createVariationsBatch(ctx, single.id),
      ).rejects.toBeInstanceOf(InvalidSourceBatchError);

      await runItem(ctx, single.id, onlyItem(single).id); // fails: safety
      await expect(
        createVariationsBatch(ctx, single.id),
      ).rejects.toBeInstanceOf(InvalidSourceBatchError);
    });

    it("cannot start from another variations batch", async () => {
      const ctx = context("demo-fresh", scriptedProvider([]));
      const variations = await createVariationsBatch(
        ctx,
        (await succeededSingle(ctx)).id,
      );
      await expect(
        createVariationsBatch(ctx, variations.id),
      ).rejects.toBeInstanceOf(InvalidSourceBatchError);
    });
  });

  describe("runItem", () => {
    it("rejects an item that does not belong to the batch", async () => {
      const ctx = context("demo-fresh", scriptedProvider([]));
      const a = await createSingleBatch(ctx, freshRequest());
      const b = await createSingleBatch(ctx, freshRequest());
      await expect(runItem(ctx, b.id, onlyItem(a).id)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("retries a transient error once automatically", async () => {
      const provider = scriptedProvider(["transient", "ok"]);
      const ctx = context("demo-fresh", provider);
      const batch = await createSingleBatch(ctx, freshRequest());
      const item = await runItem(ctx, batch.id, onlyItem(batch).id);

      expect(item).toMatchObject({ status: "succeeded", attempts: 1 });
      expect(provider.calls).toHaveLength(2);
    });

    it("fails after the automatic retry and succeeds on a manual retry", async () => {
      const provider = scriptedProvider(["transient", "transient", "ok"]);
      const ctx = context("demo-fresh", provider);
      const batch = await createSingleBatch(ctx, freshRequest());
      const { id } = onlyItem(batch);

      expect(await runItem(ctx, batch.id, id)).toMatchObject({
        status: "failed",
        error: { kind: "transient", retryable: true },
      });
      expect(await runItem(ctx, batch.id, id)).toMatchObject({
        status: "succeeded",
        attempts: 2,
      });
    });

    it.each(["billing", "safety", "invalid"] as const)(
      "does not retry a %s error",
      async (kind) => {
        const provider = scriptedProvider([kind]);
        const ctx = context("demo-fresh", provider);
        const batch = await createSingleBatch(ctx, freshRequest());
        const item = await runItem(ctx, batch.id, onlyItem(batch).id);

        expect(item).toMatchObject({
          status: "failed",
          error: { kind, retryable: false },
        });
        expect(provider.calls).toHaveLength(1);
      },
    );

    it("aborts a hung provider call within the time budget", async () => {
      const provider = scriptedProvider(["hang"]);
      const ctx = context("demo-fresh", provider);
      const batch = await createSingleBatch(ctx, freshRequest());
      const item = await runItem(ctx, batch.id, onlyItem(batch).id, {
        budgetMs: 20,
      });

      // Too little budget left for an automatic retry: one call, then failed.
      expect(item).toMatchObject({
        status: "failed",
        error: { kind: "transient" },
      });
      expect(provider.calls).toHaveLength(1);
    });

    it("passes the item's snapshot and prompt to the provider", async () => {
      const provider = scriptedProvider(["ok"]);
      const ctx = context("demo-fresh", provider);
      const batch = await createSingleBatch(ctx, freshRequest());
      const item = onlyItem(batch);
      await runItem(ctx, batch.id, item.id);

      expect(provider.calls[0]).toMatchObject({
        config: item.config,
        prompt: item.prompt.prompt,
        systemInstruction: item.prompt.systemInstruction,
        idempotencyKey: item.id,
        attempt: 1,
      });
    });
  });

  it("records token usage and call duration on a succeeded item", async () => {
    const ctx = context("demo-fresh", scriptedProvider(["ok"]));
    const batch = await createSingleBatch(ctx, freshRequest());
    const item = await runItem(ctx, batch.id, onlyItem(batch).id);

    expect(item.status).toBe("succeeded");
    if (item.status !== "succeeded") return;
    expect(item.durationMs).toBeGreaterThanOrEqual(0);
    expect(item.usage).toEqual({
      inputTokens: 10,
      outputTokens: 1120,
      thoughtTokens: 5,
    });
  });

  it("plans variations with the example's provider snapshot, not the current env", async () => {
    const repository = new MemoryGenerationRepository();
    const before = context("demo-fresh", scriptedProvider([]), repository);
    const single = await succeededSingle(before);

    const after: RequestContext = {
      ...before,
      providerConfigFor: (aspectRatio) => ({
        provider: "fake",
        model: "a-newer-model",
        aspectRatio,
        imageSize: "2K",
        thinkingLevel: "high",
      }),
    };
    const variations = await createVariationsBatch(after, single.id);
    const exampleItem = onlyItem(single);

    for (const item of variations.items) {
      expect(item.config).toEqual(exampleItem.config);
      expect(item.prompt.systemInstruction).toBe(
        exampleItem.prompt.systemInstruction,
      );
    }
  });
});
