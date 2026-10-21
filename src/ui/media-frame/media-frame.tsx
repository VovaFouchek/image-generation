import Image from "next/image";
import { ErrorIcon, ImagePlaceholderIcon, SpinnerIcon } from "../icons";
import { cn } from "../lib/cn";

export type MediaState =
  | { kind: "empty" }
  | { kind: "loading" }
  | { kind: "image"; src: string; alt: string }
  | { kind: "error" };

const VARIANTS = {
  preview: "min-h-0 flex-1 rounded-button",
  tile: "aspect-tile w-full shrink-0",
} as const;

const STATE_SURFACES = {
  empty: "bg-placeholder",
  loading: "bg-placeholder",
  image: "bg-placeholder",
  error: "bg-danger-tile",
} as const;

export interface MediaFrameProps {
  state: MediaState;
  variant?: keyof typeof VARIANTS;
  statusLabel?: string;
  className?: string;
}

export function MediaFrame({
  state,
  variant = "preview",
  statusLabel,
  className,
}: MediaFrameProps) {
  const dashed = variant === "preview" && state.kind === "empty";
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        VARIANTS[variant],
        STATE_SURFACES[state.kind],
        dashed && "border-placeholder-dashed",
        className,
      )}
      aria-busy={state.kind === "loading" || undefined}
    >
      {state.kind === "empty" && variant === "preview" ? (
        <ImagePlaceholderIcon />
      ) : null}
      {state.kind === "loading" ? <SpinnerIcon /> : null}
      {state.kind === "error" ? <ErrorIcon /> : null}
      {state.kind === "image" ? (
        <Image
          src={state.src}
          alt={state.alt}
          fill
          unoptimized
          sizes={
            variant === "preview"
              ? "(min-width: 1024px) 60vw, 100vw"
              : "(min-width: 1024px) 20vw, 50vw"
          }
          className={variant === "preview" ? "object-contain" : "object-cover"}
        />
      ) : null}
      {statusLabel && (state.kind === "loading" || state.kind === "error") ? (
        <span role="status" className="sr-only">
          {statusLabel}
        </span>
      ) : null}
    </div>
  );
}
