import type { ComponentProps } from "react";
import { cn } from "../lib/cn";
import { focusRing } from "../lib/styles";

const VARIANTS = {
  primary: "bg-accent text-accent-foreground",
  "danger-outline": "border border-danger bg-surface text-danger",
} as const;

const BUTTON_HOVERS = {
  primary: "enabled:hover:bg-accent/90",
  "danger-outline": "enabled:hover:bg-danger-soft",
} as const;

export const LINK_HOVERS = {
  primary: "hover:bg-accent/90",
  "danger-outline": "hover:bg-danger-soft",
} as const;

const SIZES = {
  lg: "w-full rounded-button py-3.5 text-button-lg",
  md: "rounded-button px-5 py-3 text-button",
  sm: "w-full rounded-button-sm py-2 text-button-sm",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export function buttonClasses(variant: ButtonVariant, size: ButtonSize) {
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap transition-colors",
    focusRing,
    VARIANTS[variant],
    SIZES[size],
  );
}

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
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
        buttonClasses(variant, size),
        BUTTON_HOVERS[variant],
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
