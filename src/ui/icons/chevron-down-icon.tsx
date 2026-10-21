import { cn } from "../lib/cn";

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
