import "server-only";
import type { ProviderErrorKind } from "../domain/errors";
import type { BatchView, ItemView } from "../domain/views";
import type { GenerationBatch, GenerationItem } from "../repository/types";

/**
 * What a client user may see. Raw provider messages (billing details, console URLs) stay in
 * server logs and storage; the UI words its own copy from `kind`.
 */
const PUBLIC_ERROR_MESSAGES: Record<ProviderErrorKind, string> = {
  rate_limit: "The image service is busy. Try again in a moment.",
  transient: "The image could not be generated. Try again.",
  billing: "Image generation is temporarily unavailable.",
  safety: "The image was declined by the content filter. Try other settings.",
  invalid: "Image generation is not set up correctly.",
};

/** Where the host mounts the feature's API (see app/api/image-generation). */
export const API_BASE = "/api/image-generation";

export function toItemView(item: GenerationItem): ItemView {
  const base = { id: item.id, index: item.index, attempts: item.attempts };
  switch (item.status) {
    case "queued":
    case "running":
      return { ...base, status: item.status };
    case "succeeded":
      return {
        ...base,
        status: "succeeded",
        imageUrl: `${API_BASE}/images/${item.id}`,
      };
    case "failed":
      return {
        ...base,
        status: "failed",
        error: {
          kind: item.error.kind,
          retryable: item.error.retryable,
          message: PUBLIC_ERROR_MESSAGES[item.error.kind],
        },
      };
  }
}

export function toBatchView(batch: GenerationBatch): BatchView {
  return {
    id: batch.id,
    kind: batch.kind,
    sourceBatchId: batch.sourceBatchId,
    aspectRatio: batch.brief.format.aspectRatio,
    createdAt: batch.createdAt,
    items: batch.items.map(toItemView),
  };
}
