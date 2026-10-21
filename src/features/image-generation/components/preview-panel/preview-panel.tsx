import {
  Badge,
  LinkButton,
  MediaFrame,
  Panel,
  type BadgeTone,
  type MediaState,
} from "@/ui";
import type { PreviewState } from "../../hooks/use-generation-form";
import { GENERATOR_TEXT } from "../../texts";

const BADGES: Record<PreviewState["kind"], { tone: BadgeTone; label: string }> =
  {
    idle: { tone: "neutral", label: GENERATOR_TEXT.status.idle },
    generating: { tone: "warning", label: GENERATOR_TEXT.status.generating },
    ready: { tone: "success", label: GENERATOR_TEXT.status.ready },
    failed: { tone: "danger", label: GENERATOR_TEXT.status.failed },
  };

export interface PreviewPanelProps {
  preview: PreviewState;
  continueHref?: string;
}

export function PreviewPanel({ preview, continueHref }: PreviewPanelProps) {
  const badge =
    preview.kind === "ready" && preview.stale
      ? { tone: "neutral" as const, label: GENERATOR_TEXT.status.stale }
      : BADGES[preview.kind];

  return (
    <Panel
      title={GENERATOR_TEXT.previewTitle}
      className="flex-1"
      aside={
        <div className="flex items-center gap-3">
          <Badge role="status" tone={badge.tone}>
            {badge.label}
          </Badge>
          {preview.kind === "ready" && continueHref ? (
            <LinkButton href={continueHref}>
              {GENERATOR_TEXT.continue}
            </LinkButton>
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
            ? GENERATOR_TEXT.status.generating
            : GENERATOR_TEXT.status.failed
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
        alt: GENERATOR_TEXT.imageAlt,
      };
    case "failed":
      return { kind: "error" };
  }
}
