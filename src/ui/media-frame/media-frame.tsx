import Image from "next/image";
import { ErrorIcon, ImagePlaceholderIcon, SpinnerIcon } from "../icons";
import { cn } from "../lib/cn";

export type MediaState =
  | { kind: "empty" }
  | { kind: "loading" }
  | { kind: "image"; src: string; alt: string }
  | { kind: "error" };

const VARIANTS = {
  // Preview area (3:55): fills the panel; the image keeps its own aspect ratio.
  preview: "min-h-0 flex-1 rounded-button",
  // Variant tile (13:24): fixed 140px high, image cropped to fill.
  tile: "h-35 w-full shrink-0",
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
  /** Screen-reader text for loading/error ("Generating…", "Bezig…"); language is the caller's. */
  statusLabel?: string;
  className?: string;
}

/** Shows one image slot in its empty, loading, image or error state. */
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
