import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

const TONES = {
  neutral: "bg-neutral-soft text-text-muted",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
} as const;

const SIZES = {
  sm: "rounded-badge px-2 py-1 text-badge-sm",
  md: "rounded-pill px-3 py-1.5 text-badge",
  pill: "rounded-pill px-3 py-2 text-badge-strong",
} as const;

export type BadgeTone = keyof typeof TONES;

export type BadgeProps = ComponentProps<"span"> & {
  tone?: BadgeTone;
  size?: keyof typeof SIZES;
};

export function Badge({
  tone = "neutral",
  size = "md",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap",
        TONES[tone],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
