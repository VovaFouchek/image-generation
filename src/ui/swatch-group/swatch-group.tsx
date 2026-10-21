"use client";

import { cn } from "../lib/cn";
import { useRadioGroup } from "../lib/use-radio-group";
import { Swatch } from "../swatch";

export interface SwatchOption {
  value: string;
  name: string;
  hex: string;
}

export interface SwatchGroupProps {
  options: SwatchOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  "aria-labelledby"?: string;
  className?: string;
}

/** Single colour choice (Main color). Owns selection and keyboard only. */
export function SwatchGroup({
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  className,
  ...aria
}: SwatchGroupProps) {
  const { selected, getItemProps } = useRadioGroup({
    values: options.map((option) => option.value),
    value,
    defaultValue,
    onValueChange,
  });

  return (
    <div
      role="radiogroup"
      className={cn("flex flex-wrap gap-2.5", className)}
      {...aria}
    >
      {options.map((option, index) => {
        const { "aria-checked": checked, ...itemProps } = getItemProps(index);
        return (
          <Swatch
            key={option.value}
            hex={option.hex}
            name={option.name}
            selected={checked}
            {...itemProps}
          />
        );
      })}
      {name ? <input type="hidden" name={name} value={selected ?? ""} /> : null}
    </div>
  );
}
