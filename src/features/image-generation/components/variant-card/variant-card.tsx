import {
  Badge,
  Button,
  MediaFrame,
  Surface,
  type BadgeTone,
  type MediaState,
} from "@/ui";
import type { ItemView } from "../../domain/views";
import { VARIATIONS_TEXT } from "../../texts";

const STATUS: Record<ItemView["status"], { tone: BadgeTone; label: string }> = {
  queued: { tone: "warning", label: VARIATIONS_TEXT.status.busy },
  running: { tone: "warning", label: VARIATIONS_TEXT.status.busy },
  succeeded: { tone: "success", label: VARIATIONS_TEXT.status.done },
  failed: { tone: "danger", label: VARIATIONS_TEXT.status.failed },
};

export interface VariantCardProps {
  item: ItemView;
  onRetry: () => void;
}

export function VariantCard({ item, onRetry }: VariantCardProps) {
  const status = STATUS[item.status];
  return (
    <Surface radius="card" className="flex flex-col gap-2 p-2.5">
      <MediaFrame
        variant="tile"
        state={toMediaState(item)}
        statusLabel={
          item.status === "failed"
            ? VARIATIONS_TEXT.failedLabel
            : VARIATIONS_TEXT.busyLabel
        }
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-badge text-text">
          {VARIATIONS_TEXT.variant(item.index)}
        </span>
        <Badge tone={status.tone} size="sm">
          {status.label}
        </Badge>
      </div>
      {item.status === "failed" ? (
        <>
          <Button
            variant="danger-outline"
            size="sm"
            disabled={!item.error.retryable}
            onClick={onRetry}
          >
            {VARIATIONS_TEXT.retry}
          </Button>
          {item.error.retryable ? null : (
            <p className="text-badge-sm text-text-muted">
              {VARIATIONS_TEXT.reasons[item.error.kind]}
            </p>
          )}
        </>
      ) : null}
    </Surface>
  );
}

function toMediaState(item: ItemView): MediaState {
  switch (item.status) {
    case "queued":
    case "running":
      return { kind: "loading" };
    case "succeeded":
      return {
        kind: "image",
        src: item.imageUrl,
        alt: VARIATIONS_TEXT.imageAlt(item.index),
      };
    case "failed":
      return { kind: "error" };
  }
}
