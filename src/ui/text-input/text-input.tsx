import type { ComponentProps } from "react";
import { cn } from "../lib/cn";
import { fieldControl, focusRing } from "../lib/styles";

/** Free-text field for the "Other" options; not in Figma, so it reuses the select's look. */
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
