import "server-only";
import { API_BASE } from "../domain/api";
import type { ProviderErrorKind } from "../domain/errors";
import type { BatchView, ItemView } from "../domain/views";
import {
  ITEM_LEASE_MS,
  type GenerationBatch,
  type GenerationItem,
} from "../repository/types";

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

export function publicErrorMessage(kind: ProviderErrorKind) {
  return PUBLIC_ERROR_MESSAGES[kind];
}

export function toItemView(item: GenerationItem, now = Date.now()): ItemView {
  const base = { id: item.id, index: item.index, attempts: item.attempts };
  switch (item.status) {
    case "queued":
      return { ...base, status: "queued" };
    case "running":
      if (now - Date.parse(item.runningSince) > ITEM_LEASE_MS) {
        return {
          ...base,
          status: "failed",
          error: {
            kind: "transient",
            retryable: true,
            message: PUBLIC_ERROR_MESSAGES.transient,
          },
        };
      }
      return { ...base, status: "running" };
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

export function toBatchView(
  batch: GenerationBatch,
  now = Date.now(),
): BatchView {
  return {
    id: batch.id,
    kind: batch.kind,
    sourceBatchId: batch.sourceBatchId,
    aspectRatio: batch.brief.format.aspectRatio,
    createdAt: batch.createdAt,
    items: batch.items.map((item) => toItemView(item, now)),
  };
}
