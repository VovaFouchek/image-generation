import type { ReactNode } from "react";

export interface AppHeaderProps {
  title: string;
  /** Right side, e.g. "Step 1 of 2" (2:7). */
  meta?: ReactNode;
}

/** Top bar (Figma 2:5 / 13:4). */
export function AppHeader({ title, meta }: AppHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-10 py-5">
      <h1 className="text-app-title text-text">{title}</h1>
      {meta ? <div className="text-label text-text-muted">{meta}</div> : null}
    </header>
  );
}
