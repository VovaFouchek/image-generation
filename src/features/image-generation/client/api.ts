import type { z } from "zod";
import { API_BASE } from "../domain/api";
import type { CreateBatchBody } from "../domain/request";
import { batchViewSchema, itemViewSchema } from "../domain/views";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly field?: string,
    readonly issues: { path: PropertyKey[]; message: string }[] = [],
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw toApiError(response.status, body);
  return schema.parse(body);
}

function toApiError(status: number, body: unknown): ApiError {
  if (typeof body !== "object" || body === null) {
    return new ApiError(status, "request_failed", "Request failed");
  }
  const code =
    "error" in body && typeof body.error === "string"
      ? body.error
      : "request_failed";
  const message =
    "message" in body && typeof body.message === "string"
      ? body.message
      : "Request failed";
  const field =
    "field" in body && typeof body.field === "string" ? body.field : undefined;
  const issues =
    "issues" in body && Array.isArray(body.issues)
      ? body.issues.flatMap((issue: unknown) =>
          typeof issue === "object" &&
          issue !== null &&
          "path" in issue &&
          Array.isArray(issue.path) &&
          "message" in issue &&
          typeof issue.message === "string"
            ? [{ path: issue.path, message: issue.message }]
            : [],
        )
      : [];
  return new ApiError(status, code, message, field, issues);
}

export function createBatch(body: CreateBatchBody) {
  return request("/batches", batchViewSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function runItem(batchId: string, itemId: string) {
  return request(`/batches/${batchId}/items/${itemId}/run`, itemViewSchema, {
    method: "POST",
  });
}

export function getBatch(batchId: string) {
  return request(`/batches/${batchId}`, batchViewSchema);
}
