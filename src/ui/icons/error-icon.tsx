import { cn } from "../lib/cn";

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
