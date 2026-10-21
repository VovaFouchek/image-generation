import type { ComponentProps } from "react";
import { cn } from "../lib/cn";
import { focusRing } from "../lib/styles";

export type SwatchProps = Omit<
  ComponentProps<"button">,
  "role" | "children"
> & {
  /** Colour value from the tenant palette (data, not a design token). */
  hex: string;
  /** Accessible colour name, e.g. "sage green". */
  name: string;
  selected: boolean;
};

/** One colour of a SwatchGroup (Figma 3:32 selected, 3:33 unselected). */
export function Swatch({
  hex,
  name,
  selected,
  type = "button",
  className,
  style,
  ...props
}: SwatchProps) {
  return (
    <button
      type={type}
      role="radio"
      aria-checked={selected}
      aria-label={name}
      title={name}
      className={cn(
        "size-7 shrink-0 rounded-full transition-shadow disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        selected ? "border-2 border-accent" : "border border-border-input",
        className,
      )}
      style={{ ...style, backgroundColor: hex }}
      {...props}
    />
  );
}
