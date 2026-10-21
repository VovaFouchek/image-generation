import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GenerationRepository } from "./types";

// Backed by supabase/migrations/*_image_generation.sql and a private `generated-images` bucket.
// claimItem maps to a single conditional UPDATE ... WHERE status IN ('queued','failed') RETURNING *.
export function createSupabaseGenerationRepository(
  client: SupabaseClient,
): GenerationRepository {
  void client;
  // TODO(next step): implement against the migration schema.
  throw new Error(
    "Supabase repository is not implemented yet; implemented in stage 4",
  );
}
