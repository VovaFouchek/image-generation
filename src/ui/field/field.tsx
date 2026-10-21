import type { ReactNode } from "react";
import { Label } from "../label";
import { cn } from "../lib/cn";

export interface FieldProps {
  label: string;
  htmlFor?: string;
  labelId?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function Field({
  label,
  htmlFor,
  labelId,
  error,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor} id={labelId}>
        {label}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
