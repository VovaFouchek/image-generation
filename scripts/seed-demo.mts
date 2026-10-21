// Seeds demo accounts, membership and versioned knowledge using the admin client.
// Rerun after changing knowledge (with a new version string) or the demo password.
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  findTenantKnowledge,
  GLOBAL_KNOWLEDGE,
} from "../src/features/image-generation/knowledge/mock-knowledge.ts";
import { DEMO_ACCOUNTS } from "../src/lib/demo-accounts.ts";

const env = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SECRET_KEY: z.string().startsWith("sb_secret_"),
    DEMO_ACCOUNT_PASSWORD: z.string().min(16),
  })
  .parse(process.env);

const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

type Result<T> =
  { data: T; error: null } | { data: unknown; error: { message: string } };

function check<T>(operation: string, result: Result<T>): T {
  if (result.error) {
    throw new Error(`${operation} failed`, { cause: result.error });
  }
  return result.data;
}

async function findUserId(email: string) {
  for (let page = 1; ; page++) {
    const { users } = check(
      "list users",
      await admin.auth.admin.listUsers({ page, perPage: 200 }),
    );
    const user = users.find((candidate) => candidate.email === email);
    if (user) return user.id;
    if (users.length < 200) return null;
  }
}

async function ensureUser(email: string) {
  const existing = await findUserId(email);
  if (existing) {
    check(
      `update ${email}`,
      await admin.auth.admin.updateUserById(existing, {
        password: env.DEMO_ACCOUNT_PASSWORD,
      }),
    );
    return existing;
  }
  const { user } = check(
    `create ${email}`,
    await admin.auth.admin.createUser({
      email,
      password: env.DEMO_ACCOUNT_PASSWORD,
      email_confirm: true,
    }),
  );
  return user.id;
}

/** Same JSON regardless of key order (jsonb does not keep it). */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Inserts a knowledge version once and never rewrites it: briefs record the version they were
 * built from, so changed content must come with a new version string (reproducibility).
 */
async function ensureKnowledgeVersion(
  tenantId: string | null,
  version: string,
  content: unknown,
) {
  const query = admin
    .from("knowledge_versions")
    .select("content")
    .eq("version", version);
  const existing = z
    .object({ content: z.unknown() })
    .nullable()
    .parse(
      check(
        `load knowledge ${tenantId ?? "global"} ${version}`,
        await (
          tenantId === null
            ? query.is("tenant_id", null)
            : query.eq("tenant_id", tenantId)
        ).maybeSingle(),
      ),
    );
  if (existing) {
    if (canonical(existing.content) !== canonical(content)) {
      throw new Error(
        `Knowledge ${tenantId ?? "global"} ${version} changed without a version bump. ` +
          "Give the changed demo knowledge a new version string and run the seed again.",
      );
    }
    return "unchanged";
  }
  check(
    `insert knowledge ${tenantId ?? "global"} ${version}`,
    await admin
      .from("knowledge_versions")
      .insert({ tenant_id: tenantId, version, content }),
  );
  return "inserted";
}

const globalStatus = await ensureKnowledgeVersion(
  null,
  GLOBAL_KNOWLEDGE.version,
  GLOBAL_KNOWLEDGE,
);
console.log(`Goldfizh vision ${GLOBAL_KNOWLEDGE.version} (${globalStatus})`);

for (const [tenantId, email] of Object.entries(DEMO_ACCOUNTS)) {
  const knowledge = findTenantKnowledge(tenantId);
  if (!knowledge) throw new Error(`No demo knowledge for ${tenantId}`);

  check(
    `upsert tenant ${tenantId}`,
    await admin
      .from("tenants")
      .upsert({ id: tenantId, name: knowledge.brandName }),
  );
  const userId = await ensureUser(email);
  check(
    `upsert membership ${tenantId}`,
    await admin
      .from("tenant_members")
      .upsert({ tenant_id: tenantId, user_id: userId, role: "user" }),
  );
  const status = await ensureKnowledgeVersion(
    tenantId,
    knowledge.version,
    knowledge,
  );
  console.log(
    `${tenantId}: ${knowledge.brandName}, knowledge ${knowledge.version} (${status}), ${email}`,
  );
}
