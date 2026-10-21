import type { ComponentProps } from "react";
import { cn } from "../lib/cn";
import { focusRing } from "../lib/styles";

const VARIANTS = {
  primary: "bg-accent text-accent-foreground enabled:hover:bg-accent/90",
  "danger-outline":
    "border border-danger bg-surface text-danger enabled:hover:bg-danger-soft",
} as const;

// lg: "Generate image" (3:49) · md: "Genereer 15 variaties" (13:12) · sm: "Opnieuw proberen" (13:100)
const SIZES = {
  lg: "w-full rounded-button py-3.5 text-button-lg",
  md: "rounded-button px-5 py-3 text-button",
  sm: "w-full rounded-button-sm py-2 text-button-sm",
} as const;

export type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
