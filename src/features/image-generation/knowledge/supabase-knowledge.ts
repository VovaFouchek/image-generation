import "server-only";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { globalKnowledgeSchema, tenantKnowledgeSchema } from "./schema";
import type { KnowledgeSource } from "./source";

/**
 * Knowledge from `knowledge_versions`, read with the user's session: RLS returns the Goldfizh
 * vision (tenant_id is null) and only the caller's own tenant. The newest version wins; briefs
 * record which versions they used.
 */
export function createSupabaseKnowledgeSource(
  client: SupabaseServerClient,
): KnowledgeSource {
  async function latestContent(tenantId: string | null) {
    const base = client
      .from("knowledge_versions")
      .select("content")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1);
    const { data, error } = await (
      tenantId === null
        ? base.is("tenant_id", null)
        : base.eq("tenant_id", tenantId)
    ).maybeSingle();
    if (error) {
      throw new Error("Could not load knowledge", { cause: error });
    }
    return data?.content ?? null;
  }

  return {
    async getGlobal() {
      const content = await latestContent(null);
      if (content === null) throw new Error("Goldfizh vision is missing");
      return globalKnowledgeSchema.parse(content);
    },
    async getTenant(tenantId) {
      const content = await latestContent(tenantId);
      if (content === null) return null;
      const knowledge = tenantKnowledgeSchema.parse(content);
      if (knowledge.tenantId !== tenantId) {
        throw new Error(`Knowledge row for ${tenantId} names another tenant`);
      }
      return knowledge;
    },
  };
}
