import "server-only";
import { z } from "zod";

// Host env: Supabase session and demo sign-in (DD11). The feature reads its own settings
// (provider, Gemini, limits) in src/features/image-generation/server/config.ts.
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .startsWith("sb_publishable_"),
  // Shared by the demo accounts; the demo-session route signs in with it (D16).
  DEMO_ACCOUNT_PASSWORD: z.string().min(16),
});

export type HostEnv = z.infer<typeof envSchema>;

let cached: HostEnv | undefined;

export function getHostEnv(): HostEnv {
  cached ??= envSchema.parse(process.env);
  return cached;
}
