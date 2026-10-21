import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface PageShellProps {
  header: ReactNode;
  children: ReactNode;
  /** Layout of the content area (e.g. a vertical gap); padding comes from the design. */
  className?: string;
}

/** Full-height page: header on top, padded content filling the rest (Figma 2:8 / 13:7). */
export function PageShell({ header, children, className }: PageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {header}
      <main className={cn("flex flex-1 flex-col px-10 py-8", className)}>
        {children}
      </main>
    </div>
  );
}
