import "server-only";
import { MemoryGenerationRepository } from "./memory-repository";
import type { GenerationRepository } from "./types";

// TEMPORARY until stage 4: the app runs on the in-memory store. Stage 4 replaces this with a
// per-request Supabase repository built from the user's session (D16), so RLS applies.
const globalStore = globalThis as typeof globalThis & {
  __generationRepository?: GenerationRepository;
};

export function getGenerationRepository(): GenerationRepository {
  globalStore.__generationRepository ??= new MemoryGenerationRepository();
  return globalStore.__generationRepository;
}

export type * from "./types";
