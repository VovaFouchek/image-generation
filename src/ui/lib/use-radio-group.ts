"use client";

import { useRef, useState, type KeyboardEvent } from "react";

interface RadioGroupOptions {
  values: string[];
  disabled?: boolean[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown"]);
const PREVIOUS_KEYS = new Set(["ArrowLeft", "ArrowUp"]);

/**
 * WAI-ARIA radio group behaviour: one tab stop (roving tabindex), arrow keys move and select,
 * Home/End jump. Works controlled (value + onValueChange) or uncontrolled (defaultValue).
 */
export function useRadioGroup({
  values,
  disabled = [],
  value,
  defaultValue,
  onValueChange,
}: RadioGroupOptions) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const selected = value ?? uncontrolled;
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const enabledIndexes = values.flatMap((_, index) =>
    disabled[index] ? [] : [index],
  );
  const selectedIndex = values.findIndex((candidate) => candidate === selected);
  const tabStop =
    selectedIndex >= 0 && !disabled[selectedIndex]
      ? selectedIndex
      : (enabledIndexes[0] ?? -1);

  function select(index: number) {
    const next = values[index];
    if (next === undefined || disabled[index]) return;
    if (value === undefined) setUncontrolled(next);
    onValueChange?.(next);
  }

  function move(from: number, key: string) {
    const position = enabledIndexes.indexOf(from);
    if (position < 0 || enabledIndexes.length === 0) return;
    const count = enabledIndexes.length;
    let target: number | undefined;
    if (NEXT_KEYS.has(key)) target = enabledIndexes[(position + 1) % count];
    if (PREVIOUS_KEYS.has(key)) {
      target = enabledIndexes[(position - 1 + count) % count];
    }
    if (key === "Home") target = enabledIndexes[0];
    if (key === "End") target = enabledIndexes[count - 1];
    if (target === undefined) return;
    select(target);
    refs.current[target]?.focus();
  }

  function getItemProps(index: number) {
    return {
      ref: (element: HTMLButtonElement | null) => {
        refs.current[index] = element;
      },
      "aria-checked": values[index] === selected,
      tabIndex: index === tabStop ? 0 : -1,
      onClick: () => select(index),
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
        if (
          NEXT_KEYS.has(event.key) ||
          PREVIOUS_KEYS.has(event.key) ||
          event.key === "Home" ||
          event.key === "End"
        ) {
          event.preventDefault();
          move(index, event.key);
        }
      },
    };
  }

  return { selected, getItemProps };
}
