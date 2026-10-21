import type { GlobalKnowledge, TenantKnowledge } from "./types";

/** Loads versioned global and tenant knowledge under the caller's session. */
export interface KnowledgeSource {
  getGlobal(): Promise<GlobalKnowledge>;
  getTenant(tenantId: string): Promise<TenantKnowledge | null>;
}
