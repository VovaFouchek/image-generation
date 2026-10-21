import { cn } from "../lib/cn";

// PLACEHOLDER: the Figma glyph (node 13:43) as text until the SVG export replaces it.
// Spins while visible; stops for users who prefer reduced motion.
export function SpinnerIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block animate-spin text-icon text-text-muted motion-reduce:animate-none",
        className,
      )}
    >
      ⟳
    </span>
  );
}
