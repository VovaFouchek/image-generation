import "server-only";
import { z } from "zod";
import type { SupabaseServerClient } from "./server";

export interface SessionTenant {
  userId: string;
  tenantId: string;
  role: "admin" | "user";
}

const membershipsSchema = z.array(
  z.object({ tenant_id: z.string(), role: z.enum(["admin", "user"]) }),
);

export class TenantMembershipError extends Error {
  readonly code = "tenant_membership";
}

export async function getSessionTenant(
  supabase: SupabaseServerClient,
): Promise<SessionTenant | null> {
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (error || !userId) return null;

  const memberships = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", userId);
  if (memberships.error) {
    throw new Error("Could not load tenant membership", {
      cause: memberships.error,
    });
  }
  const rows = membershipsSchema.parse(memberships.data);
  const [only] = rows;
  // The demo has exactly one tenant per account; the platform has its own tenant picker.
  if (!only || rows.length > 1) {
    throw new TenantMembershipError(
      `Expected one tenant membership, found ${rows.length}`,
    );
  }
  return { userId, tenantId: only.tenant_id, role: only.role };
}
