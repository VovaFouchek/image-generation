import { cn } from "../lib/cn";

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
