import type { GlobalKnowledge, TenantKnowledge } from "./types";

/**
 * Where the vision and client knowledge come from. Demo data today; in stage D the same
 * interface reads versioned knowledge from Supabase under the user's session.
 */
export interface KnowledgeSource {
  getGlobal(): Promise<GlobalKnowledge>;
  getTenant(tenantId: string): Promise<TenantKnowledge | null>;
}
