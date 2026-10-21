import "server-only";
import { redirect } from "next/navigation";
import { DEFAULT_DEMO_TENANT, isDemoTenantId } from "./demo-accounts";
import { createSupabaseServerClient } from "./supabase/server";
import { getSessionTenant } from "./supabase/session";

export const DEMO_SESSION_PATH = "/api/demo-session";
const FALLBACK_PATH = "/image-generator";

/**
 * Pages call this before rendering (DD12): with no session, or with ?tenant= naming another
 * demo tenant, the visitor goes through /api/demo-session, which signs in and comes back.
 * Only that route sets cookies, so a prefetch can never switch tenants.
 */
export async function ensureDemoSession({
  requestedTenant,
  returnTo,
}: {
  requestedTenant: string | undefined;
  returnTo: string;
}) {
  const session = await getSessionTenant(await createSupabaseServerClient());
  const wanted = isDemoTenantId(requestedTenant) ? requestedTenant : undefined;
  if (session && (!wanted || wanted === session.tenantId)) return session;
  const params = new URLSearchParams({
    tenant: wanted ?? DEFAULT_DEMO_TENANT,
    next: returnTo,
  });
  redirect(`${DEMO_SESSION_PATH}?${params.toString()}`);
}

/**
 * Only same-origin relative paths are allowed after sign-in; anything else (absolute URLs,
 * protocol-relative //host, backslash tricks) falls back to the generator, so the route cannot
 * be used as an open redirect.
 */
export function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return FALLBACK_PATH;
  }
  const base = "http://same-origin.invalid";
  try {
    const url = new URL(value, base);
    return url.origin === base ? `${url.pathname}${url.search}` : FALLBACK_PATH;
  } catch {
    return FALLBACK_PATH;
  }
}
