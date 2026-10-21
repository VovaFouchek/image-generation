import { cn } from "../lib/cn";

// PLACEHOLDER: the Figma glyph (node 13:95) as text until the SVG export replaces it.
export function ErrorIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("text-icon font-semibold text-danger", className)}
    >
      !
    </span>
  );
}
