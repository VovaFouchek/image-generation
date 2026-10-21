"use client";

import { useEffect, useRef, useState } from "react";
import { createBatch, getBatch, runItem } from "../client/api";
import { VARIATIONS_TEXT } from "../texts";
import type { BatchView, ItemView } from "../domain/views";

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 130_000;

/** One period while the page is mounted and visible; runs started in it stop when it ends. */
type Session = symbol;

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
 *
 * Next.js hides pages with <Activity> on navigation instead of unmounting them, which runs
 * effect cleanups. Hiding ends the session (no new runs, results ignored); showing the page
 * again starts a new one that continues the current batch.
 */
export function useBatchRunner({
  sourceBatchId,
  concurrency,
  initialBatch,
}: BatchRunnerOptions) {
  const [batch, setBatch] = useState<BatchView | null>(initialBatch);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<Session | null>(null);
  const latestBatch = useRef(initialBatch);

  useEffect(() => {
    latestBatch.current = batch;
  }, [batch]);

  function isLive(current: Session) {
    return session.current === current;
  }

  function updateItem(current: Session, batchId: string, item: ItemView) {
    if (!isLive(current)) return;
    setBatch((shown) =>
      shown?.id === batchId
        ? {
            ...shown,
            items: shown.items.map((existing) =>
              existing.id === item.id ? item : existing,
            ),
          }
        : shown,
    );
  }

  async function runOne(current: Session, batchId: string, item: ItemView) {
    updateItem(current, batchId, {
      id: item.id,
      index: item.index,
      attempts: item.attempts,
      status: "running",
    });
    try {
      const result = await runItem(batchId, item.id);
      updateItem(current, batchId, result);
      // Another request (e.g. the page before a reload) already claimed it: follow it to the end.
      if (result.status === "running") {
        await pollRunning(current, batchId, [item.id]);
      }
    } catch {
      updateItem(current, batchId, {
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

  async function runAll(
    current: Session,
    target: BatchView,
    items: ItemView[],
  ) {
    let next = 0;
    const workers = Array.from(
      { length: Math.min(concurrency, items.length) },
      async () => {
        while (next < items.length && isLive(current)) {
          const item = items[next++];
          if (item) await runOne(current, target.id, item);
        }
      },
    );
    await Promise.all(workers);
  }

  /** Follows items started elsewhere (another page load or session) until the server settles them. */
  async function pollRunning(
    current: Session,
    batchId: string,
    itemIds: string[],
  ) {
    const watching = new Set(itemIds);
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (watching.size > 0 && isLive(current) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const fresh = await getBatch(batchId).catch(() => null);
      for (const item of fresh?.items ?? []) {
        if (watching.has(item.id) && item.status !== "running") {
          watching.delete(item.id);
          updateItem(current, batchId, item);
        }
      }
    }
  }

  async function resume(current: Session, target: BatchView) {
    const queued = target.items.filter((item) => item.status === "queued");
    const running = target.items.flatMap((item) =>
      item.status === "running" ? [item.id] : [],
    );
    await Promise.all([
      runAll(current, target, queued),
      pollRunning(current, target.id, running),
    ]);
  }

  useEffect(() => {
    const current: Session = Symbol("batch-runner-session");
    session.current = current;
    // First mount (incl. a batch restored from the URL) or the page shown again: carry on.
    if (latestBatch.current) void resume(current, latestBatch.current);
    return () => {
      session.current = null; // hidden or left: stop starting runs and applying results
    };
    // Runs once per mount/show; the runner reads the current batch from a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    const current = session.current;
    if (!current) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createBatch({
        kind: "variations",
        from: sourceBatchId,
      });
      setBatch(created);
      setCreating(false);
      const params = new URLSearchParams(window.location.search);
      params.set("batch", created.id);
      window.history.replaceState(null, "", `?${params.toString()}`);
      await runAll(current, created, created.items);
    } catch {
      setCreating(false);
      setError(VARIATIONS_TEXT.network);
    }
  }

  function retry(itemIds: string[]) {
    const current = session.current;
    if (!current || !batch) return;
    const items = batch.items.filter(
      (item) =>
        itemIds.includes(item.id) &&
        item.status === "failed" &&
        item.error.retryable,
    );
    void runAll(current, batch, items);
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
