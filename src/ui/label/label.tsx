import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

/** Field label (Figma 3:7). */
export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label className={cn("text-label text-text-muted", className)} {...props} />
  );
}
