import { cn } from "../lib/cn";

// PLACEHOLDER: the Figma glyph (node 3:56) as text until the export replaces it.
export function ImagePlaceholderIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("text-icon-lg text-text-muted", className)}
    >
      🖼
    </span>
  );
}
