import type { ReactNode } from "react";
import { Label } from "../label";
import { cn } from "../lib/cn";

export interface FieldProps {
  label: string;
  /** id of a single control (select, input). */
  htmlFor?: string;
  /** id for the label when the control is a group referencing it via aria-labelledby. */
  labelId?: string;
  /** Validation message shown under the control. */
  error?: string;
  children: ReactNode;
  className?: string;
}

/** Ties a label (and an optional error) to its control; lays them out with the Figma gap. */
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
