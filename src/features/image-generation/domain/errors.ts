// Errors the API maps to HTTP responses. Anything else is a 500.

/** The request breaks a required rule; raised before any paid provider call. */
export class BriefConflictError extends Error {
  readonly code = "brief_conflict";
  constructor(
    message: string,
    readonly ruleIds: string[],
  ) {
    super(message);
  }
}

export class UnknownReferenceError extends Error {
  readonly code = "unknown_reference";
  constructor(
    readonly field: "pageId" | "brandSegmentId" | "mainColorId",
    value: string,
  ) {
    super(`Unknown ${field}: ${value}`);
  }
}

export class InvalidSourceBatchError extends Error {
  readonly code = "invalid_source_batch";
}

export class NotFoundError extends Error {
  readonly code = "not_found";
}

export class UnauthorizedError extends Error {
  readonly code = "unauthorized";
}

export class DailyLimitError extends Error {
  readonly code = "daily_limit_reached";
}

/**
 * rate_limit / transient: worth one automatic retry.
 * billing / safety / invalid: retrying the same request will not help; show the reason.
 */
export const PROVIDER_ERROR_KINDS = [
  "rate_limit",
  "transient",
  "billing",
  "safety",
  "invalid",
] as const;
export type ProviderErrorKind = (typeof PROVIDER_ERROR_KINDS)[number];

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly kind: ProviderErrorKind,
  ) {
    super(message);
  }

  get retryable() {
    return this.kind === "rate_limit" || this.kind === "transient";
  }
}
