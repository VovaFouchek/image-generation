import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Surface } from "../surface";

export interface PanelProps {
  title: string;
  /** Right side of the header, e.g. a status badge (3:53). */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, aside, children, className }: PanelProps) {
  return (
    <Surface
      radius="panel"
      className={cn(
        "flex flex-col gap-5 overflow-hidden p-5 sm:p-7",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h2 className="text-title text-text">{title}</h2>
        {aside}
      </div>
      {children}
    </Surface>
  );
}
