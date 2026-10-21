import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

const RADII = {
  panel: "rounded-panel",
  card: "rounded-button",
} as const;

export type SurfaceProps = ComponentProps<"div"> & {
  radius?: keyof typeof RADII;
};

/** White bordered surface: panels (2:9) and variant cards (13:23). Padding is the caller's. */
export function Surface({
  radius = "panel",
  className,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cn(
        "border border-border bg-surface",
        RADII[radius],
        className,
      )}
      {...props}
    />
  );
}
