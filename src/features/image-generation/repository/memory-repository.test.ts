import { describe, expect, it } from "vitest";
import { buildBrief } from "../brief/build-brief";
import { GLOBAL_KNOWLEDGE } from "../knowledge/mock-knowledge";
import { freshRequest, demoTenant } from "../test-fixtures";
import { MemoryGenerationRepository } from "./memory-repository";
import { ITEM_LEASE_MS, type GenerationBatch, type NewBatch } from "./types";

const request = freshRequest();
const brief = buildBrief(GLOBAL_KNOWLEDGE, demoTenant("demo-fresh"), request);

function newBatch(tenantId: string): NewBatch {
  return {
    tenantId,
    kind: "variations",
    sourceBatchId: null,
    request,
    brief,
    items: [0, 1].map((index) => ({
      variation: {
        index,
        axes: { cameraAngle: "at eye level", placement: "centred" },
      },
      prompt: { templateVersion: "v1", systemInstruction: "", prompt: "" },
      config: {
        provider: "mock",
        model: "mock",
        aspectRatio: "16:9",
        imageSize: "1K",
        thinkingLevel: "medium",
      },
    })),
  };
}

function firstItem(batch: GenerationBatch) {
  const item = batch.items[0];
  if (!item) throw new Error("batch has no items");
  return item;
}

const image = {
  mimeType: "image/png",
  data: new Uint8Array([1]),
  model: "mock",
  durationMs: 5,
};

describe("MemoryGenerationRepository", () => {
  it("does not expose another tenant's batch or items", async () => {
    const repo = new MemoryGenerationRepository();
    const batch = await repo.createBatch(newBatch("tenant-a"));
    const item = firstItem(batch);

    expect(await repo.getBatch("tenant-b", batch.id)).toBeNull();
    expect(await repo.claimItem("tenant-b", batch.id, item.id)).toBeNull();
    expect(await repo.getImage("tenant-b", item.id)).toBeNull();
  });

  it("only claims an item through its own batch", async () => {
    const repo = new MemoryGenerationRepository();
    const a = await repo.createBatch(newBatch("tenant-a"));
    const b = await repo.createBatch(newBatch("tenant-a"));
    expect(await repo.claimItem("tenant-a", b.id, firstItem(a).id)).toBeNull();
  });

  it("claims once and allows a retry only after failure", async () => {
    const repo = new MemoryGenerationRepository();
    const batch = await repo.createBatch(newBatch("tenant-a"));
    const { id } = firstItem(batch);

    expect((await repo.claimItem("tenant-a", batch.id, id))?.attempts).toBe(1);
    expect(await repo.claimItem("tenant-a", batch.id, id)).toBeNull();

    await repo.failItem("tenant-a", batch.id, id, 1, {
      kind: "transient",
      message: "timeout",
      retryable: true,
    });
    expect((await repo.claimItem("tenant-a", batch.id, id))?.attempts).toBe(2);
  });

  it("keeps succeeded items untouched on retry", async () => {
    const repo = new MemoryGenerationRepository();
    const batch = await repo.createBatch(newBatch("tenant-a"));
    const { id } = firstItem(batch);
    await repo.claimItem("tenant-a", batch.id, id);
    await repo.completeItem("tenant-a", batch.id, id, 1, image);

    expect(await repo.claimItem("tenant-a", batch.id, id)).toBeNull();
    expect(await repo.getImage("tenant-a", id)).toMatchObject({
      mimeType: "image/png",
    });
  });

  it("drops a late result from an older attempt", async () => {
    const repo = new MemoryGenerationRepository();
    const batch = await repo.createBatch(newBatch("tenant-a"));
    const { id } = firstItem(batch);
    await repo.claimItem("tenant-a", batch.id, id); // attempt 1
    await repo.failItem("tenant-a", batch.id, id, 1, {
      kind: "transient",
      message: "timeout",
      retryable: true,
    });
    await repo.claimItem("tenant-a", batch.id, id); // attempt 2 is now running

    expect(
      await repo.completeItem("tenant-a", batch.id, id, 1, image),
    ).toBeNull();
    const item = firstItem(
      (await repo.getBatch("tenant-a", batch.id)) ?? batch,
    );
    expect(item).toMatchObject({ status: "running", attempts: 2 });
    expect(await repo.getImage("tenant-a", id)).toBeNull();
  });

  it("claims a running item again only after its lease expired", async () => {
    const repo = new MemoryGenerationRepository();
    const batch = await repo.createBatch(newBatch("tenant-a"));
    const item = firstItem(batch);
    const start = Date.parse("2026-10-21T12:00:00.000Z");

    const first = await repo.claimItem("tenant-a", batch.id, item.id, start);
    expect(first?.attempts).toBe(1);
    expect(
      await repo.claimItem(
        "tenant-a",
        batch.id,
        item.id,
        start + ITEM_LEASE_MS,
      ),
    ).toBeNull();

    const reclaimed = await repo.claimItem(
      "tenant-a",
      batch.id,
      item.id,
      start + ITEM_LEASE_MS + 1,
    );
    expect(reclaimed?.attempts).toBe(2);
    // The first, superseded attempt can no longer record a result.
    expect(
      await repo.completeItem("tenant-a", batch.id, item.id, 1, image),
    ).toBeNull();
  });

  it("counts attempts per tenant", async () => {
    const repo = new MemoryGenerationRepository();
    const batch = await repo.createBatch(newBatch("tenant-a"));
    await repo.claimItem("tenant-a", batch.id, firstItem(batch).id);
    await repo.createBatch(newBatch("tenant-b"));

    const since = new Date(Date.now() - 60_000);
    expect(await repo.countAttemptsSince("tenant-a", since)).toBe(1);
    expect(await repo.countAttemptsSince("tenant-b", since)).toBe(0);
  });
});
