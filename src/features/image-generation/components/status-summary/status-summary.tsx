import { Badge, cn, focusRing } from "@/ui";
import type { ItemView } from "../../domain/views";
import { SCREEN_2 } from "../copy";

export interface StatusSummaryProps {
  items: ItemView[];
  /** Retries every failed item that is worth retrying. */
  onRetryFailed: () => void;
}

/** Counters computed from the real item statuses (Figma 13:14). */
export function StatusSummary({ items, onRetryFailed }: StatusSummaryProps) {
  const done = items.filter((item) => item.status === "succeeded").length;
  const busy = items.filter(
    (item) => item.status === "queued" || item.status === "running",
  ).length;
  const failed = items.filter((item) => item.status === "failed");
  const retryable = failed.some(
    (item) => item.status === "failed" && item.error.retryable,
  );

  return (
    <div className="flex flex-wrap items-center gap-3" aria-live="polite">
      <Badge tone="success" size="pill">
        {SCREEN_2.counts.done(done)}
      </Badge>
      <Badge tone="warning" size="pill">
        {SCREEN_2.counts.busy(busy)}
      </Badge>
      {failed.length > 0 ? (
        <button
          type="button"
          disabled={!retryable}
          onClick={onRetryFailed}
          className={cn("rounded-pill disabled:cursor-not-allowed", focusRing)}
        >
          <Badge tone="danger" size="pill">
            {SCREEN_2.counts.failed(failed.length)}
          </Badge>
        </button>
      ) : null}
    </div>
  );
}
