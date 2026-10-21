import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_TENANT_ID } from "../knowledge/mock-knowledge";

export type Role = "admin" | "user";

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: Role;
}

/**
 * MOCK session adapter. In the platform this is replaced by the real auth session
 * (Supabase Auth JWT → tenant membership). Tenant is never read from request params or body.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const store = await cookies();
  return {
    tenantId: store.get("demo-tenant")?.value ?? DEFAULT_TENANT_ID,
    userId: "demo-user",
    role: "user",
  };
}
