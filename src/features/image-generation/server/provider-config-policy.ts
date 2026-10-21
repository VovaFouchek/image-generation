import type { ProviderConfig } from "../providers/types";

/** A valid DB snapshot is untrusted input, not permission to spend the server's API key. */
export function isProviderConfigAllowed(
  stored: ProviderConfig,
  allowed: ProviderConfig,
): boolean {
  return (
    stored.provider === allowed.provider &&
    stored.model === allowed.model &&
    stored.imageSize === allowed.imageSize &&
    stored.thinkingLevel === allowed.thinkingLevel &&
    stored.aspectRatio === allowed.aspectRatio
  );
}
