import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionTenant, type SessionTenant } from "@/lib/supabase/session";
import { UnauthorizedError } from "../domain/errors";
import type { AspectRatio } from "../domain/options";
import type { KnowledgeSource } from "../knowledge/source";
import { createSupabaseKnowledgeSource } from "../knowledge/supabase-knowledge";
import { providerConfigFor, resolveImageProvider } from "../providers";
import type { ImageProvider, ProviderConfig } from "../providers/types";
import { createSupabaseGenerationRepository } from "../repository/supabase-repository";
import type { GenerationRepository } from "../repository/types";
import { getServerConfig } from "./config";

export type TenantContext = SessionTenant;

/**
 * Everything the service needs for one request. The host builds it from its own auth,
 * storage and settings; the service never reaches for globals, which keeps it testable.
 */
export interface RequestContext {
  tenant: TenantContext;
  repository: GenerationRepository;
  knowledge: KnowledgeSource;
  resolveProvider(name: string): ImageProvider;
  providerConfigFor(aspectRatio: AspectRatio): ProviderConfig;
  /** Generation attempts a tenant may start per 24 hours (DD13). */
  dailyAttemptLimit: number;
}

/**
 * Builds the context from the Supabase session (D11, D16): the tenant comes from the verified
 * user and tenant_members, never from the request; storage and knowledge use that user's client,
 * so RLS applies to every query. Memoised per server render.
 */
export const getRequestContext = cache(async (): Promise<RequestContext> => {
  const supabase = await createSupabaseServerClient();
  const tenant = await getSessionTenant(supabase);
  if (!tenant) throw new UnauthorizedError("Sign in first");
  return {
    tenant,
    repository: createSupabaseGenerationRepository(supabase),
    knowledge: createSupabaseKnowledgeSource(supabase),
    resolveProvider: resolveImageProvider,
    providerConfigFor,
    dailyAttemptLimit: getServerConfig().DAILY_ATTEMPT_LIMIT,
  };
});
