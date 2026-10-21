import { describe, expect, it } from "vitest";
import {
  BriefConflictError,
  DailyLimitError,
  InvalidSourceBatchError,
  NotFoundError,
  ProviderError,
  type ProviderErrorKind,
} from "../domain/errors";
import { BATCH_SIZE } from "../domain/options";
import type {
  ImageGenerationInput,
  ImageProvider,
  ProviderConfig,
} from "../providers/types";
import { providerConfigSchema } from "../repository/rows";
import { MemoryGenerationRepository } from "../repository/memory-repository";
import type { GenerationBatch } from "../repository/types";
import {
  demoTenant,
  freshRequest,
  mockKnowledgeSource,
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
  dailyAttemptLimit = 100,
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
    dailyAttemptLimit,
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

  it.each([
    { model: "another-expensive-model" },
    { imageSize: "2K" },
    { imageSize: "4K" },
    { provider: "mock" },
    { thinkingLevel: "high" },
  ] satisfies Partial<ProviderConfig>[])(
    "blocks a directly inserted snapshot with forbidden settings %j before resolving the provider",
    async (override) => {
      const provider = scriptedProvider([]);
      const ctx = context("demo-fresh", provider);
      ctx.providerConfigFor = (aspectRatio) => ({
        provider: "gemini",
        model: "gemini-demo-approved",
        aspectRatio,
        imageSize: "1K",
        thinkingLevel: "medium",
      });
      let resolutions = 0;
      ctx.resolveProvider = () => {
        resolutions += 1;
        return provider;
      };
      const original = await createSingleBatch(ctx, freshRequest());
      const example = onlyItem(original);
      // Simulates a row inserted through the Data API: structurally valid, not server-planned.
      const forgedConfig = providerConfigSchema.parse({
        ...example.config,
        ...override,
      });
      const forged = await ctx.repository.createBatch({
        tenantId: ctx.tenant.tenantId,
        kind: "single",
        sourceBatchId: null,
        request: original.request,
        brief: original.brief,
        items: [
          {
            variation: example.variation,
            prompt: example.prompt,
            config: forgedConfig,
          },
        ],
      });

      const result = await runItem(ctx, forged.id, onlyItem(forged).id);

      expect(result).toMatchObject({
        status: "failed",
        attempts: 1,
        config: forgedConfig,
        error: { kind: "invalid", retryable: false },
      });
      expect(resolutions).toBe(0);
      expect(provider.calls).toHaveLength(0);
    },
  );

  describe("variations", () => {
    it("reuse the example's request, brief and provider settings for 15 items", async () => {
      const ctx = context("demo-fresh", scriptedProvider([]));
      const single = await succeededSingle(ctx);
      const batch = await createVariationsBatch(ctx, single.id);

      expect(batch.items).toHaveLength(BATCH_SIZE);
      expect(batch.sourceBatchId).toBe(single.id);
      expect(batch.brief).toEqual(single.brief);
      expect(batch.request).toEqual(single.request);
      for (const item of batch.items) {
        expect(item.config).toEqual(onlyItem(single).config);
        expect(item.prompt.systemInstruction).toBe(
          onlyItem(single).prompt.systemInstruction,
        );
      }
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

  it("refuses variations when the example snapshot has been revoked by server policy", async () => {
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
    await expect(
      createVariationsBatch(after, single.id),
    ).rejects.toBeInstanceOf(InvalidSourceBatchError);
    const stored = await repository.getBatch(before.tenant.tenantId, single.id);
    expect(stored?.items[0]?.config).toEqual(onlyItem(single).config);
  });

  it("refuses a queued snapshot after a policy change without silently updating it", async () => {
    const provider = scriptedProvider([]);
    const ctx = context("demo-fresh", provider);
    const batch = await createSingleBatch(ctx, freshRequest());
    const original = onlyItem(batch);
    const previousConfigFor = ctx.providerConfigFor;
    ctx.providerConfigFor = (aspectRatio) => ({
      ...previousConfigFor(aspectRatio),
      model: "new-approved-model",
    });

    const result = await runItem(ctx, batch.id, original.id);

    expect(result).toMatchObject({
      status: "failed",
      config: original.config,
      error: { kind: "invalid", retryable: false },
    });
    expect(provider.calls).toHaveLength(0);
  });

  describe("daily attempt limit", () => {
    it("refuses to start a run past the limit without calling the provider", async () => {
      const provider = scriptedProvider([]);
      const ctx = context("demo-fresh", provider, undefined, 1);
      await succeededSingle(ctx);
      const second = await createSingleBatch(ctx, freshRequest());

      await expect(
        runItem(ctx, second.id, onlyItem(second).id),
      ).rejects.toBeInstanceOf(DailyLimitError);
      expect(provider.calls).toHaveLength(1);
    });

    it("still returns finished items once the limit is reached", async () => {
      const ctx = context("demo-fresh", scriptedProvider([]), undefined, 1);
      const batch = await succeededSingle(ctx);

      const item = await runItem(ctx, batch.id, onlyItem(batch).id);
      expect(item.status).toBe("succeeded");
    });

    it("counts each tenant separately", async () => {
      const repository = new MemoryGenerationRepository();
      const provider = scriptedProvider([]);
      await succeededSingle(context("demo-fresh", provider, repository, 1));

      const travel = context("demo-travel", provider, repository, 1);
      const batch = await createSingleBatch(travel, travelRequest());
      const item = await runItem(travel, batch.id, onlyItem(batch).id);
      expect(item.status).toBe("succeeded");
    });
  });

  it("stores a generic message for a failure, not the provider's raw text", async () => {
    const ctx = context("demo-fresh", scriptedProvider(["billing"]));
    const batch = await createSingleBatch(ctx, freshRequest());

    const item = await runItem(ctx, batch.id, onlyItem(batch).id);
    expect(item.status).toBe("failed");
    if (item.status === "failed") {
      expect(item.error.kind).toBe("billing");
      expect(item.error.message).not.toContain("fake billing");
    }
  });
});
