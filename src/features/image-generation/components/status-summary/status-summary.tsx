import { Badge, cn, focusRing } from "@/ui";
import type { ItemView } from "../../domain/views";
import { VARIATIONS_TEXT } from "../../texts";

export interface StatusSummaryProps {
  items: ItemView[];
  onRetryFailed: () => void;
}

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
        {VARIATIONS_TEXT.counts.done(done)}
      </Badge>
      <Badge tone="warning" size="pill">
        {VARIATIONS_TEXT.counts.busy(busy)}
      </Badge>
      {failed.length > 0 ? (
        <button
          type="button"
          disabled={!retryable}
          onClick={onRetryFailed}
          className={cn("rounded-pill disabled:cursor-not-allowed", focusRing)}
        >
          <Badge tone="danger" size="pill">
            {VARIATIONS_TEXT.counts.failed(failed.length)}
          </Badge>
        </button>
      ) : null}
    </div>
  );
}
