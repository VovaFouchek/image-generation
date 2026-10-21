"use client";

import { Chip } from "../chip";
import { cn } from "../lib/cn";
import { useRadioGroup } from "../lib/use-radio-group";

export interface ChoiceOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ChoiceGroupProps {
  options: ChoiceOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Submits the selected value with a surrounding form. */
  name?: string;
  "aria-labelledby"?: string;
  className?: string;
}

/** Single choice from a row of chips (Style, Colors, Format). Owns selection and keyboard only. */
export function ChoiceGroup({
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  className,
  ...aria
}: ChoiceGroupProps) {
  const { selected, getItemProps } = useRadioGroup({
    values: options.map((option) => option.value),
    disabled: options.map((option) => Boolean(option.disabled)),
    value,
    defaultValue,
    onValueChange,
  });

  return (
    <div
      role="radiogroup"
      className={cn("flex flex-wrap gap-2", className)}
      {...aria}
    >
      {options.map((option, index) => {
        const { "aria-checked": checked, ...itemProps } = getItemProps(index);
        return (
          <Chip
            key={option.value}
            selected={checked}
            disabled={option.disabled}
            {...itemProps}
          >
            {option.label}
          </Chip>
        );
      })}
      {name ? <input type="hidden" name={name} value={selected ?? ""} /> : null}
    </div>
  );
}
