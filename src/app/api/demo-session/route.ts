import { NextResponse, type NextRequest } from "next/server";
import { DEMO_ACCOUNTS, isDemoTenantId } from "@/lib/demo-accounts";
import { safeReturnPath } from "@/lib/demo-session";
import { getHostEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// DEMO sign-in (D16): ?tenant= picks which prepared demo account to sign in with; the server
// authenticates it and @supabase/ssr stores the real session in cookies. It proves nothing about
// the visitor — the demo accounts are open on purpose and hold only fictional data.
export async function GET(request: NextRequest) {
  const tenant = request.nextUrl.searchParams.get("tenant");
  if (!isDemoTenantId(tenant)) {
    return NextResponse.json({ error: "unknown_demo_tenant" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_ACCOUNTS[tenant],
    password: getHostEnv().DEMO_ACCOUNT_PASSWORD,
  });
  if (error) {
    console.error(`Demo sign-in for ${tenant} failed: ${error.message}`);
    return NextResponse.json({ error: "demo_sign_in_failed" }, { status: 503 });
  }

  const next = safeReturnPath(request.nextUrl.searchParams.get("next"));
  const response = NextResponse.redirect(new URL(next, request.url), 303);
  // Never cache a response that sets a session cookie.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
