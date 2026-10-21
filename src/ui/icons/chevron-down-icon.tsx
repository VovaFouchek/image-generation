import { cn } from "../lib/cn";

// PLACEHOLDER: the Figma glyph (node 3:5) as text until the SVG export replaces it.
export function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("text-body text-text-muted", className)}
    >
      ⌄
    </span>
  );
}
