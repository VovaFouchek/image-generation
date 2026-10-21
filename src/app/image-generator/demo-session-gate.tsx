import type { ReactNode } from "react";
import { ensureDemoSession } from "@/lib/demo-session";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Host-side gate: renders the page only with a demo session for the requested tenant
 * (?tenant=), otherwise sends the visitor through /api/demo-session and back to this URL.
 */
export async function DemoSessionGate({
  path,
  searchParams,
  children,
}: {
  path: string;
  searchParams: Promise<SearchParams>;
  children: ReactNode;
}) {
  const { tenant, ...rest } = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === "string") query.set(key, value);
  }

  await ensureDemoSession({
    requestedTenant: typeof tenant === "string" ? tenant : undefined,
    returnTo: query.size > 0 ? `${path}?${query.toString()}` : path,
  });

  return children;
}
