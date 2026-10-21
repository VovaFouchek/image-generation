import "server-only";
import { z } from "zod";
import { IMAGE_SIZES, THINKING_LEVELS } from "../providers/types";

// The only module in the feature that reads process.env.
const envSchema = z.object({
  IMAGE_PROVIDER: z.enum(["mock", "gemini"]).default("mock"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_IMAGE_MODEL: z.string().default("gemini-nano-banana-2.1"),
  GEMINI_IMAGE_SIZE: z.enum(IMAGE_SIZES).default("1K"),
  GEMINI_THINKING_LEVEL: z.enum(THINKING_LEVELS).default("medium"),
  // Mock only: share of items whose first attempt fails, to exercise retry UI (0–1).
  MOCK_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  BATCH_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(3),
});

export type ServerConfig = z.infer<typeof envSchema>;

let cached: ServerConfig | undefined;

export function getServerConfig(): ServerConfig {
  cached ??= envSchema.parse(process.env);
  return cached;
}
