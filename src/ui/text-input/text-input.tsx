import type { ComponentProps } from "react";
import { cn } from "../lib/cn";
import { fieldControl, focusRing } from "../lib/styles";

export function TextInput({
  className,
  type = "text",
  ...props
}: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        fieldControl,
        focusRing,
        "placeholder:text-text-muted",
        className,
      )}
      {...props}
    />
  );
}
