"use client";

import type { BatchView } from "../../domain/views";
import { useBatchRunner } from "../../hooks/use-batch-runner";
import { BatchEmptyState } from "../batch-empty-state";
import { BatchToolbar } from "../batch-toolbar";
import { StatusSummary } from "../status-summary";
import { VariantCard } from "../variant-card";
import { VariantGrid } from "../variant-grid";

export interface VariationsViewProps {
  /** The single-generation batch whose settings the variations reuse. */
  sourceBatchId: string;
  concurrency: number;
  /** The variations batch from the URL (?batch=), restored after a reload. */
  initialBatch: BatchView | null;
}

export function VariationsView({
  sourceBatchId,
  concurrency,
  initialBatch,
}: VariationsViewProps) {
  const { batch, creating, busy, error, generate, retry } = useBatchRunner({
    sourceBatchId,
    concurrency,
    initialBatch,
  });
  const retryableFailed = (batch?.items ?? []).flatMap((item) =>
    item.status === "failed" && item.error.retryable ? [item.id] : [],
  );

  return (
    <>
      <BatchToolbar
        onGenerate={() => void generate()}
        loading={creating}
        disabled={busy}
      />
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
      {batch ? (
        <>
          <StatusSummary
            items={batch.items}
            onRetryFailed={() => retry(retryableFailed)}
          />
          <VariantGrid>
            {batch.items.map((item) => (
              <VariantCard
                key={item.id}
                item={item}
                onRetry={() => retry([item.id])}
              />
            ))}
          </VariantGrid>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <BatchEmptyState />
        </div>
      )}
    </>
  );
}
