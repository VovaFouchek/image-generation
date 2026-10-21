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

/** The request points at a page, segment or colour the tenant does not have. */
export class UnknownReferenceError extends Error {
  readonly code = "unknown_reference";
  constructor(
    readonly field: "pageId" | "brandSegmentId" | "mainColorId",
    readonly value: string,
  ) {
    super(`Unknown ${field}: ${value}`);
  }
}

/** Variations must start from the user's own successful single generation. */
export class InvalidSourceBatchError extends Error {
  readonly code = "invalid_source_batch";
}

export class NotFoundError extends Error {
  readonly code = "not_found";
}

/**
 * rate_limit / transient: worth one automatic retry (D8).
 * billing / safety / invalid: retrying the same request will not help; show the reason.
 */
export type ProviderErrorKind =
  "rate_limit" | "transient" | "billing" | "safety" | "invalid";

export class ProviderError extends Error {
  readonly code = "provider_error";
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
