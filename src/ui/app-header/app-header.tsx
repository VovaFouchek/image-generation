import type { ReactNode } from "react";

export interface AppHeaderProps {
  title: string;
  meta?: ReactNode;
}

export function AppHeader({ title, meta }: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-10">
      <h1 className="text-app-title text-text">{title}</h1>
      {meta ? <div className="text-label text-text-muted">{meta}</div> : null}
    </header>
  );
}
