import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface PageShellProps {
  header: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageShell({ header, children, className }: PageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {header}
      <main
        className={cn(
          "flex flex-1 flex-col px-4 py-6 sm:px-10 sm:py-8",
          className,
        )}
      >
        {children}
      </main>
    </div>
  );
}
