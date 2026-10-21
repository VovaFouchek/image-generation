import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge must know our custom token names; otherwise it reads `text-title` as a colour
// and drops it when merged with `text-text`. Keep in sync with styles/tokens.css.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "title-lg",
        "title",
        "app-title",
        "button-lg",
        "body",
        "button",
        "label",
        "caption",
        "badge",
        "badge-strong",
        "button-sm",
        "badge-sm",
        "icon",
        "icon-lg",
      ],
      radius: ["button-sm", "control", "button", "panel", "badge", "pill"],
      container: ["form-panel"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
