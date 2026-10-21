import Link from "next/link";
import type { ComponentProps } from "react";
import {
  buttonClasses,
  LINK_HOVERS,
  type ButtonSize,
  type ButtonVariant,
} from "../button";
import { cn } from "../lib/cn";

export type LinkButtonProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(
        buttonClasses(variant, size),
        LINK_HOVERS[variant],
        className,
      )}
      {...props}
    />
  );
}
