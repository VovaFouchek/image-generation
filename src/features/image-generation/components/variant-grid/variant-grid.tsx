import type { ReactNode } from "react";

export function VariantGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 items-start gap-4 md:grid-cols-3 lg:grid-cols-5">
      {children}
    </div>
  );
}
