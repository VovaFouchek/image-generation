"use client";

import { useState } from "react";
import { ApiError, createBatch, runItem } from "../client/api";
import { SCREEN_1 } from "../components/copy";
import type { ColorMode, Format, Style } from "../domain/options";
import type { GenerationRequest } from "../domain/request";
import type { FormOptionsView, ItemView } from "../domain/views";

export interface FormValues {
  pageId: string;
  brandSegmentId: string;
  style: Style;
  colorMode: ColorMode;
  mainColorId: string;
  format: Format;
  styleNote: string;
  colorNote: string;
}

export type FormField = keyof FormValues;

export type PreviewState =
  | { kind: "idle" }
  | { kind: "generating" }
  | {
      kind: "ready";
      batchId: string;
      item: Extract<ItemView, { status: "succeeded" }>;
      /** The form changed after this example: it no longer matches the settings. */
      stale: boolean;
    }
  | { kind: "failed"; message: string };

/** Screen 1: form values, validation errors and the single generation (create + run). */
export function useGenerationForm(options: FormOptionsView) {
  const [values, setValues] = useState<FormValues>({
    pageId: "",
    brandSegmentId: "",
    style: "simple",
    colorMode: "vibrant",
    mainColorId: options.defaultMainColorId,
    format: "square",
    styleNote: "",
    colorNote: "",
  });
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});
  const [preview, setPreview] = useState<PreviewState>({ kind: "idle" });

  function setValue<K extends FormField>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    // Variations must follow the settings on screen, so an older example can't be continued.
    setPreview((current) =>
      current.kind === "ready" && !current.stale
        ? { ...current, stale: true }
        : current,
    );
  }

  async function submit() {
    const missing = requiredErrors(values);
    if (Object.keys(missing).length > 0) {
      setErrors(missing);
      return;
    }
    setErrors({});
    setPreview({ kind: "generating" });
    try {
      const batch = await createBatch({
        kind: "single",
        request: toRequest(values),
      });
      const [item] = batch.items;
      if (!item) throw new Error("Batch has no items");
      const result = await runItem(batch.id, item.id);
      setPreview(
        result.status === "succeeded"
          ? { kind: "ready", batchId: batch.id, item: result, stale: false }
          : {
              kind: "failed",
              message:
                result.status === "failed"
                  ? result.error.message
                  : SCREEN_1.errors.network,
            },
      );
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors = toFieldErrors(error);
        if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
        setPreview({ kind: "failed", message: error.message });
      } else {
        setPreview({ kind: "failed", message: SCREEN_1.errors.network });
      }
    }
  }

  return { values, errors, preview, setValue, submit };
}

function requiredErrors(
  values: FormValues,
): Partial<Record<FormField, string>> {
  return {
    ...(values.pageId ? {} : { pageId: SCREEN_1.errors.pageId }),
    ...(values.brandSegmentId
      ? {}
      : { brandSegmentId: SCREEN_1.errors.brandSegmentId }),
  };
}

function toRequest(values: FormValues): GenerationRequest {
  return {
    pageId: values.pageId,
    brandSegmentId: values.brandSegmentId,
    style: values.style,
    colorMode: values.colorMode,
    mainColorId: values.mainColorId,
    format: values.format,
    ...(values.style === "other" ? { styleNote: values.styleNote } : {}),
    ...(values.colorMode === "other" ? { colorNote: values.colorNote } : {}),
  };
}

const FORM_FIELDS = new Set<string>([
  "pageId",
  "brandSegmentId",
  "style",
  "colorMode",
  "mainColorId",
  "format",
  "styleNote",
  "colorNote",
]);

function isFormField(value: unknown): value is FormField {
  return typeof value === "string" && FORM_FIELDS.has(value);
}

/** Maps server validation (zod issues or an unknown reference) onto form fields. */
function toFieldErrors(error: ApiError): Partial<Record<FormField, string>> {
  const result: Partial<Record<FormField, string>> = {};
  if (isFormField(error.field)) result[error.field] = error.message;
  for (const issue of error.issues) {
    const field = issue.path.at(-1);
    if (isFormField(field)) result[field] = issue.message;
  }
  return result;
}
