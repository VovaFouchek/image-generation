import {
  Badge,
  Button,
  MediaFrame,
  Surface,
  type BadgeTone,
  type MediaState,
} from "@/ui";
import type { ItemView } from "../../domain/views";
import { SCREEN_2 } from "../copy";

const STATUS: Record<ItemView["status"], { tone: BadgeTone; label: string }> = {
  queued: { tone: "warning", label: SCREEN_2.status.busy },
  running: { tone: "warning", label: SCREEN_2.status.busy },
  succeeded: { tone: "success", label: SCREEN_2.status.done },
  failed: { tone: "danger", label: SCREEN_2.status.failed },
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
          item.status === "failed" ? SCREEN_2.failedLabel : SCREEN_2.busyLabel
        }
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-badge text-text">
          {SCREEN_2.variant(item.index)}
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
            {SCREEN_2.retry}
          </Button>
          {item.error.retryable ? null : (
            <p className="text-badge-sm text-text-muted">
              {SCREEN_2.reasons[item.error.kind]}
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
        alt: SCREEN_2.imageAlt(item.index),
      };
    case "failed":
      return { kind: "error" };
  }
}
