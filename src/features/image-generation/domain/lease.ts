/**
 * A run older than this may be claimed again (the function died or hit maxDuration). Longer
 * than the run route's maxDuration (120 s). Keep in sync with claim_generation_item in the
 * migration. Client-safe: the batch runner polls a little longer than this, so it always sees
 * an expired run turn into a retryable failure (DD5).
 */
export const ITEM_LEASE_MS = 150_000;
