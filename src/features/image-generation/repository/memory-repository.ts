import type {
  CompletedResult,
  GenerationBatch,
  GenerationItem,
  GenerationRepository,
  ItemError,
  NewBatch,
  RunningItem,
  StoredImage,
} from "./types";

type StoredBatch = Omit<GenerationBatch, "items"> & { itemIds: string[] };

// TEMPORARY (until stage D): process-local store for running the app without Supabase.
// Not shared between serverless instances, no RLS and no lease on stuck items; the Supabase
// repository replaces it.
export class MemoryGenerationRepository implements GenerationRepository {
  private readonly batches = new Map<string, StoredBatch>();
  private readonly items = new Map<string, GenerationItem>();
  private readonly images = new Map<string, StoredImage>();

  async createBatch({ items: planned, ...input }: NewBatch) {
    const now = new Date().toISOString();
    const batchId = crypto.randomUUID();
    const items = planned.map<GenerationItem>((item, index) => ({
      ...item,
      id: crypto.randomUUID(),
      batchId,
      tenantId: input.tenantId,
      index,
      status: "queued",
      attempts: 0,
      updatedAt: now,
    }));
    this.batches.set(batchId, {
      ...input,
      id: batchId,
      createdAt: now,
      itemIds: items.map((item) => item.id),
    });
    for (const item of items) this.items.set(item.id, item);
    return this.snapshot(batchId);
  }

  async getBatch(tenantId: string, batchId: string) {
    const batch = this.batches.get(batchId);
    return batch && batch.tenantId === tenantId ? this.snapshot(batchId) : null;
  }

  async claimItem(tenantId: string, batchId: string, itemId: string) {
    const item = this.ownedItem(tenantId, batchId, itemId);
    if (!item || item.status === "running" || item.status === "succeeded") {
      return null;
    }
    // Built field by field so a previous attempt's error does not carry over.
    const running: RunningItem = {
      id: item.id,
      batchId: item.batchId,
      tenantId: item.tenantId,
      index: item.index,
      variation: item.variation,
      prompt: item.prompt,
      config: item.config,
      status: "running",
      attempts: item.attempts + 1,
      updatedAt: new Date().toISOString(),
    };
    this.items.set(itemId, running);
    return structuredClone(running);
  }

  async completeItem(
    tenantId: string,
    batchId: string,
    itemId: string,
    attempt: number,
    { mimeType, data, ...outcome }: CompletedResult,
  ) {
    const item = this.runningAttempt(tenantId, batchId, itemId, attempt);
    if (!item) return null;
    this.images.set(itemId, { mimeType, data });
    return this.save({ ...item, status: "succeeded", ...outcome });
  }

  async failItem(
    tenantId: string,
    batchId: string,
    itemId: string,
    attempt: number,
    error: ItemError,
  ) {
    const item = this.runningAttempt(tenantId, batchId, itemId, attempt);
    if (!item) return null;
    return this.save({ ...item, status: "failed", error });
  }

  async getImage(tenantId: string, itemId: string) {
    const item = this.items.get(itemId);
    if (!item || item.tenantId !== tenantId) return null;
    return this.images.get(itemId) ?? null;
  }

  private ownedItem(tenantId: string, batchId: string, itemId: string) {
    const item = this.items.get(itemId);
    return item && item.tenantId === tenantId && item.batchId === batchId
      ? item
      : undefined;
  }

  /** The item, but only while it is still running this exact attempt. */
  private runningAttempt(
    tenantId: string,
    batchId: string,
    itemId: string,
    attempt: number,
  ) {
    const item = this.ownedItem(tenantId, batchId, itemId);
    return item?.status === "running" && item.attempts === attempt
      ? item
      : undefined;
  }

  private save(item: GenerationItem) {
    const next = { ...item, updatedAt: new Date().toISOString() };
    this.items.set(item.id, next);
    return structuredClone(next);
  }

  private snapshot(batchId: string): GenerationBatch {
    const stored = this.batches.get(batchId);
    if (!stored) throw new Error(`Batch ${batchId} disappeared`);
    const { itemIds, ...batch } = stored;
    const items = itemIds.flatMap((id) => {
      const item = this.items.get(id);
      return item ? [item] : [];
    });
    return structuredClone({ ...batch, items });
  }
}
