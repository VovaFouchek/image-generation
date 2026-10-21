import {
  Badge,
  LinkButton,
  MediaFrame,
  Panel,
  type BadgeTone,
  type MediaState,
} from "@/ui";
import type { PreviewState } from "../../hooks/use-generation-form";
import { SCREEN_1 } from "../copy";

const BADGES: Record<PreviewState["kind"], { tone: BadgeTone; label: string }> =
  {
    idle: { tone: "neutral", label: SCREEN_1.status.idle },
    generating: { tone: "warning", label: SCREEN_1.status.generating },
    ready: { tone: "success", label: SCREEN_1.status.ready },
    failed: { tone: "danger", label: SCREEN_1.status.failed },
  };

export interface PreviewPanelProps {
  preview: PreviewState;
  continueHref?: string;
}

export function PreviewPanel({ preview, continueHref }: PreviewPanelProps) {
  const badge =
    preview.kind === "ready" && preview.stale
      ? { tone: "neutral" as const, label: SCREEN_1.status.stale }
      : BADGES[preview.kind];

  return (
    <Panel
      title={SCREEN_1.previewTitle}
      className="flex-1"
      aside={
        <div className="flex items-center gap-3">
          <Badge role="status" tone={badge.tone}>
            {badge.label}
          </Badge>
          {preview.kind === "ready" && continueHref ? (
            <LinkButton href={continueHref}>{SCREEN_1.continue}</LinkButton>
          ) : null}
        </div>
      }
    >
      {preview.kind === "failed" ? (
        <p role="alert" className="text-caption text-danger">
          {preview.message}
        </p>
      ) : null}
      <MediaFrame
        state={toMediaState(preview)}
        statusLabel={
          preview.kind === "generating"
            ? SCREEN_1.status.generating
            : SCREEN_1.status.failed
        }
      />
    </Panel>
  );
}

function toMediaState(preview: PreviewState): MediaState {
  switch (preview.kind) {
    case "idle":
      return { kind: "empty" };
    case "generating":
      return { kind: "loading" };
    case "ready":
      return {
        kind: "image",
        src: preview.item.imageUrl,
        alt: SCREEN_1.imageAlt,
      };
    case "failed":
      return { kind: "error" };
  }
}
