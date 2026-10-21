import { defineConfig } from "vitest/config";

// Integration tests against the real Supabase project (pnpm test:integration). They sign in
// as both demo accounts, so they need .env and are kept out of the default `pnpm test`.
process.loadEnvFile(".env");

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
