import type { ReactNode } from "react";

export interface SplitLayoutProps {
  /** Fixed-width left column (the form panel, 420px). */
  aside: ReactNode;
  children: ReactNode;
}

export function SplitLayout({ aside, children }: SplitLayoutProps) {
  return (
    <div className="flex flex-1 flex-col gap-8 lg:flex-row">
      <div className="flex w-full flex-col lg:w-form-panel lg:shrink-0">
        {aside}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
