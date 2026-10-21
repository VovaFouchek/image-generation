import type { GenerationRequest } from "./domain/request";
import { findTenantKnowledge } from "./knowledge/mock-knowledge";
import type { TenantKnowledge } from "./knowledge/types";

// Shared helpers for unit tests only.

/** Deliberate conflict for validation tests, independent of public demo brand rules. */
export function withNoPeopleRule(tenant: TenantKnowledge): TenantKnowledge {
  return {
    ...tenant,
    rules: [
      ...tenant.rules,
      {
        id: "t.test-no-people",
        strength: "required",
        text: "Test-only: no people in images.",
        promptPositive: "The scene is unoccupied: spaces and objects only.",
        promptExclusions: ["people", "faces", "hands"],
        forbids: { people: true },
      },
    ],
  };
}

export function demoTenant(tenantId: string): TenantKnowledge {
  const tenant = findTenantKnowledge(tenantId);
  if (!tenant) throw new Error(`Unknown demo tenant ${tenantId}`);
  return tenant;
}

export function freshRequest(
  overrides: Partial<GenerationRequest> = {},
): GenerationRequest {
  return {
    pageId: "fresh-delivery",
    brandSegmentId: "households",
    style: "simple",
    colorMode: "vibrant",
    mainColorId: "sage",
    format: "horizontal",
    ...overrides,
  };
}

export function travelRequest(
  overrides: Partial<GenerationRequest> = {},
): GenerationRequest {
  return {
    pageId: "coastal-holidays",
    brandSegmentId: "independent-explorers",
    style: "simple",
    colorMode: "vibrant",
    mainColorId: "teal",
    format: "square",
    ...overrides,
  };
}
