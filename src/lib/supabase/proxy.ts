import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getHostEnv } from "../env";
import type { Database } from "./database.types";

/**
 * Refreshes the session cookies on every request (Supabase SSR pattern for Next.js). It never
 * signs anyone in: that happens only in /api/demo-session, so a prefetch cannot switch tenants.
 */
export async function updateSession(request: NextRequest) {
  const env = getHostEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // Cache headers that keep a response carrying a session from being cached.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // Verifies the JWT and refreshes an expired session. Do not put code between the client
  // and this call.
  await supabase.auth.getClaims();
  return response;
}
