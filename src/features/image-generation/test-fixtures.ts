import type { GenerationRequest } from "./domain/request";
import { findTenantKnowledge } from "./knowledge/mock-knowledge";
import type { TenantKnowledge } from "./knowledge/types";

// Shared helpers for unit tests only.

export function demoTenant(tenantId: string): TenantKnowledge {
  const tenant = findTenantKnowledge(tenantId);
  if (!tenant) throw new Error(`Unknown demo tenant ${tenantId}`);
  return tenant;
}

export function cargoRequest(
  overrides: Partial<GenerationRequest> = {},
): GenerationRequest {
  return {
    pageId: "city-delivery",
    brandSegmentId: "families",
    style: "simple",
    colorMode: "vibrant",
    mainColorId: "sage",
    format: "horizontal",
    ...overrides,
  };
}

export function mortgageRequest(
  overrides: Partial<GenerationRequest> = {},
): GenerationRequest {
  return {
    pageId: "first-home",
    brandSegmentId: "movers",
    style: "simple",
    colorMode: "vibrant",
    mainColorId: "teal",
    format: "square",
    ...overrides,
  };
}
