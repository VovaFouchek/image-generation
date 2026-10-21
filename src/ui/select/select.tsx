import type { ComponentProps } from "react";
import { ChevronDownIcon } from "../icons";
import { cn } from "../lib/cn";
import { fieldControl, focusRing } from "../lib/styles";

export interface SelectOption {
  value: string;
  label: string;
}

export type SelectProps = Omit<ComponentProps<"select">, "children"> & {
  options: SelectOption[];
  /** Shown while nothing is chosen ("Pick a URL.."). */
  placeholder?: string;
};

/** Native select styled as Figma's dropdown (3:3): accessible and form-friendly by default. */
export function Select({
  options,
  placeholder,
  className,
  ...props
}: SelectProps) {
  return (
    <div className={cn("relative", className)}>
      <select
        className={cn(
          fieldControl,
          focusRing,
          "cursor-pointer appearance-none pr-9",
        )}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2" />
    </div>
  );
}
