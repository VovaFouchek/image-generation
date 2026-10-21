import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getHostEnv } from "../env";
import type { Database } from "./database.types";

/**
 * A Supabase client acting as the signed-in user (publishable key + session cookies), so every
 * query and Storage call runs under RLS. Create one per request; never share it.
 */
export async function createSupabaseServerClient() {
  // Session data is per request: never prerendered (the auth client also checks the token's
  // expiry with Date.now(), which Cache Components rejects during a prerender).
  await connection();
  const env = getHostEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies; proxy.ts refreshes the session instead.
          }
        },
      },
    },
  );
}

export type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;
