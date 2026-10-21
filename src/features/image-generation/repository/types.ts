import type { Variation, VisualBrief } from "../brief/types";
import type { ProviderErrorKind } from "../domain/errors";
import type { GenerationRequest } from "../domain/request";
import type { ComposedPrompt } from "../prompt/compose-prompt";
import type { GeneratedImage, ProviderConfig } from "../providers/types";

// A single generation is a batch of one, so both Figma screens share one pipeline.

export { ITEM_LEASE_MS } from "../domain/lease";

export type BatchKind = "single" | "variations";

export interface ItemError {
  kind: ProviderErrorKind;
  message: string;
  retryable: boolean;
}

interface ItemBase {
  id: string;
  batchId: string;
  tenantId: string;
  index: number;
  variation: Variation;
  prompt: ComposedPrompt;
  /** Provider settings snapshotted at planning time; every attempt uses these. */
  config: ProviderConfig;
  /** Number of claims so far; the current attempt's number while running. */
  attempts: number;
  updatedAt: string;
}

export type GenerationItem =
  | (ItemBase & { status: "queued" })
  | (ItemBase & {
      status: "running";
      /** Start of the current attempt's lease (ISO). */
      runningSince: string;
    })
  | (ItemBase & {
      status: "succeeded";
      model: string;
      providerRequestId?: string;
      /** Token usage and call duration, kept for cost and latency reporting. */
      usage?: GeneratedImage["usage"];
      durationMs: number;
    })
  | (ItemBase & { status: "failed"; error: ItemError });

export type RunningItem = Extract<GenerationItem, { status: "running" }>;

export interface GenerationBatch {
  id: string;
  tenantId: string;
  kind: BatchKind;
  /** For variations: the single-generation batch whose request and brief were reused. */
  sourceBatchId: string | null;
  request: GenerationRequest;
  brief: VisualBrief;
  createdAt: string;
  items: GenerationItem[];
}

export interface NewBatch {
  tenantId: string;
  kind: BatchKind;
  sourceBatchId: string | null;
  request: GenerationRequest;
  brief: VisualBrief;
  items: {
    variation: Variation;
    prompt: ComposedPrompt;
    config: ProviderConfig;
  }[];
}

export interface StoredImage {
  mimeType: string;
  data: Uint8Array;
}

export interface CompletedResult extends StoredImage {
  model: string;
  providerRequestId?: string;
  usage?: GeneratedImage["usage"];
  durationMs: number;
}

/**
 * Persistence seam. Every method takes tenantId and implementations must scope by it. The
 * Supabase implementation runs with the user's session, so RLS enforces the same scope in the
 * database; the in-memory one is the unit-test double.
 */
export interface GenerationRepository {
  createBatch(input: NewBatch): Promise<GenerationBatch>;
  getBatch(tenantId: string, batchId: string): Promise<GenerationBatch | null>;
  /**
   * Atomically moves an item of this batch from queued/failed (or running with an expired
   * lease) to running and bumps attempts. Returns null if it is running or succeeded, which
   * makes run/retry idempotent.
   */
  claimItem(
    tenantId: string,
    batchId: string,
    itemId: string,
  ): Promise<RunningItem | null>;
  /**
   * Records the outcome only if the item is still running the given attempt. Returns null when
   * a newer attempt has taken over, so a late result can never overwrite it.
   */
  completeItem(
    tenantId: string,
    batchId: string,
    itemId: string,
    attempt: number,
    result: CompletedResult,
  ): Promise<GenerationItem | null>;
  failItem(
    tenantId: string,
    batchId: string,
    itemId: string,
    attempt: number,
    error: ItemError,
  ): Promise<GenerationItem | null>;
  getImage(tenantId: string, itemId: string): Promise<StoredImage | null>;
  /** Attempts made on items the tenant created since then; feeds the daily limit. */
  countAttemptsSince(tenantId: string, since: Date): Promise<number>;
}
