"use client";

import { useEffect, useRef, useState } from "react";
import { createBatch, getBatch, runItem } from "../client/api";
import { VARIATIONS_TEXT } from "../texts";
import type { BatchView, ItemView } from "../domain/views";

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 130_000;

export interface BatchRunnerOptions {
  sourceBatchId: string;
  concurrency: number;
  /** A variations batch restored from the URL after a reload, if any. */
  initialBatch: BatchView | null;
}

/**
 * Screen 2: creates the variations batch and runs its items with limited parallelism.
 * Only the batch on screen is run or updated; results for an older batch are ignored.
 * The batch id goes into the URL, so a reload restores it instead of paying again.
 */
export function useBatchRunner({
  sourceBatchId,
  concurrency,
  initialBatch,
}: BatchRunnerOptions) {
  const [batch, setBatch] = useState<BatchView | null>(initialBatch);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeBatchId = useRef<string | null>(null);
  const resumed = useRef(false);

  function updateItem(batchId: string, item: ItemView) {
    if (activeBatchId.current !== batchId) return;
    setBatch((current) =>
      current?.id === batchId
        ? {
            ...current,
            items: current.items.map((existing) =>
              existing.id === item.id ? item : existing,
            ),
          }
        : current,
    );
  }

  async function runOne(batchId: string, item: ItemView) {
    updateItem(batchId, {
      id: item.id,
      index: item.index,
      attempts: item.attempts,
      status: "running",
    });
    try {
      updateItem(batchId, await runItem(batchId, item.id));
    } catch {
      updateItem(batchId, {
        id: item.id,
        index: item.index,
        attempts: item.attempts,
        status: "failed",
        error: {
          kind: "transient",
          message: VARIATIONS_TEXT.network,
          retryable: true,
        },
      });
    }
  }

  async function runAll(target: BatchView, items: ItemView[]) {
    let next = 0;
    const workers = Array.from(
      { length: Math.min(concurrency, items.length) },
      async () => {
        while (next < items.length && activeBatchId.current === target.id) {
          const item = items[next++];
          if (item) await runOne(target.id, item);
        }
      },
    );
    await Promise.all(workers);
  }

  /** Follows items another page load started until the server settles them. */
  async function pollRunning(batchId: string, itemIds: string[]) {
    const watching = new Set(itemIds);
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (
      watching.size > 0 &&
      activeBatchId.current === batchId &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const fresh = await getBatch(batchId).catch(() => null);
      for (const item of fresh?.items ?? []) {
        if (watching.has(item.id) && item.status !== "running") {
          watching.delete(item.id);
          updateItem(batchId, item);
        }
      }
    }
  }

  async function resume(restored: BatchView) {
    const queued = restored.items.filter((item) => item.status === "queued");
    const running = restored.items.flatMap((item) =>
      item.status === "running" ? [item.id] : [],
    );
    await Promise.all([
      runAll(restored, queued),
      pollRunning(restored.id, running),
    ]);
  }

  useEffect(() => {
    activeBatchId.current = initialBatch?.id ?? null;
    if (initialBatch && !resumed.current) {
      resumed.current = true;
      void resume(initialBatch);
    }
    return () => {
      activeBatchId.current = null; // stop applying results after leaving the page
    };
    // Runs once per restored batch; the runner functions read refs, not render state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBatch]);

  async function generate() {
    setCreating(true);
    setError(null);
    try {
      const created = await createBatch({
        kind: "variations",
        from: sourceBatchId,
      });
      activeBatchId.current = created.id;
      setBatch(created);
      setCreating(false);
      const params = new URLSearchParams(window.location.search);
      params.set("batch", created.id);
      window.history.replaceState(null, "", `?${params.toString()}`);
      await runAll(created, created.items);
    } catch {
      setCreating(false);
      setError(VARIATIONS_TEXT.network);
    }
  }

  function retry(itemIds: string[]) {
    if (!batch) return;
    const items = batch.items.filter(
      (item) =>
        itemIds.includes(item.id) &&
        item.status === "failed" &&
        item.error.retryable,
    );
    void runAll(batch, items);
  }

  const busy =
    creating ||
    Boolean(
      batch?.items.some(
        (item) => item.status === "queued" || item.status === "running",
      ),
    );

  return { batch, creating, busy, error, generate, retry };
}
