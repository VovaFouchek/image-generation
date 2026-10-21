import "server-only";
import type { AspectRatio } from "../domain/options";
import { mockKnowledgeSource } from "../knowledge/mock-knowledge";
import type { KnowledgeSource } from "../knowledge/source";
import { providerConfigFor, resolveImageProvider } from "../providers";
import type { ImageProvider, ProviderConfig } from "../providers/types";
import { getGenerationRepository } from "../repository";
import type { GenerationRepository } from "../repository/types";
import {
  getTenantContext,
  type TenantContext,
} from "../tenant-context/get-tenant-context";

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
}

/**
 * TEMPORARY wiring until stage D: tenant from a demo cookie, in-memory storage and demo
 * knowledge — no RLS. Stage D builds tenant, repository and knowledge from the Supabase session.
 */
export async function getRequestContext(): Promise<RequestContext> {
  return {
    tenant: await getTenantContext(),
    repository: getGenerationRepository(),
    knowledge: mockKnowledgeSource,
    resolveProvider: resolveImageProvider,
    providerConfigFor,
  };
}
