import type { ComponentProps } from "react";
import { cn } from "../lib/cn";
import { focusRing } from "../lib/styles";

export type ChipProps = Omit<ComponentProps<"button">, "role"> & {
  selected: boolean;
};

export function Chip({
  selected,
  type = "button",
  className,
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      role="radio"
      aria-checked={selected}
      className={cn(
        "rounded-control px-4 py-2.5 text-label whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        selected
          ? "bg-accent text-accent-foreground"
          : "bg-neutral-soft text-text enabled:hover:bg-border",
        className,
      )}
      {...props}
    />
  );
}
