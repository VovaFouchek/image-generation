// D16 / §14.5 D.6: tenant isolation is enforced by the database, not by the app. Two real users
// (the demo accounts) talk to Postgres and Storage directly with the publishable key, the way
// anyone with a demo session could through the Data API.
//
//   pnpm test:integration
//
// The secret key is used only to clean up what the test created.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { DEMO_ACCOUNTS } from "../../src/lib/demo-accounts";

const env = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string(),
    SUPABASE_SECRET_KEY: z.string(),
    DEMO_ACCOUNT_PASSWORD: z.string(),
  })
  .parse(process.env);

const A = "demo-fresh";
const B = "demo-travel";
const BUCKET = "generated-images";

const client = () =>
  createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

async function signedIn(tenant: keyof typeof DEMO_ACCOUNTS) {
  const supabase = client();
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_ACCOUNTS[tenant],
    password: env.DEMO_ACCOUNT_PASSWORD,
  });
  if (error) throw error;
  return supabase;
}

const item = {
  variation: {
    index: 0,
    axes: { cameraAngle: "eye level", placement: "centred" },
  },
  prompt: {
    templateVersion: "test",
    systemInstruction: "",
    prompt: "isolation test",
  },
  config: {
    provider: "mock",
    model: "mock",
    aspectRatio: "1:1",
    imageSize: "1K",
    thinkingLevel: "medium",
  },
};

async function createBatch(supabase: SupabaseClient, tenantId: string) {
  return supabase.rpc("create_generation_batch", {
    p_tenant_id: tenantId,
    p_kind: "single",
    p_request: { test: true },
    p_brief: { test: true },
    p_items: [item],
  });
}

let userA: SupabaseClient;
let userB: SupabaseClient;
let batchA: string;
let itemA: string;
const createdBatches: string[] = [];
const createdFiles: string[] = [];

beforeAll(async () => {
  [userA, userB] = await Promise.all([signedIn(A), signedIn(B)]);
  const { data, error } = await createBatch(userA, A);
  if (error) throw error;
  batchA = z.string().parse(data);
  createdBatches.push(batchA);
  const items = await userA
    .from("generation_items")
    .select("id")
    .eq("batch_id", batchA);
  if (items.error) throw items.error;
  itemA = z.string().parse(items.data[0]?.id);
});

afterAll(async () => {
  const admin = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    {
      auth: { persistSession: false },
    },
  );
  if (createdFiles.length > 0)
    await admin.storage.from(BUCKET).remove(createdFiles);
  if (createdBatches.length > 0) {
    await admin.from("generation_batches").delete().in("id", createdBatches);
  }
});

describe("tenant isolation (RLS)", () => {
  it("shows each user only their own tenant and membership", async () => {
    const tenants = await userA.from("tenants").select("id");
    expect(tenants.data?.map((row) => row.id)).toEqual([A]);
    const members = await userA.from("tenant_members").select("tenant_id");
    expect(members.data?.map((row) => row.tenant_id)).toEqual([A]);
  });

  it("shares the Goldfizh vision but not another tenant's knowledge", async () => {
    const { data } = await userA.from("knowledge_versions").select("tenant_id");
    const tenantIds = new Set(data?.map((row) => row.tenant_id));
    expect(tenantIds.has(null)).toBe(true);
    expect(tenantIds.has(A)).toBe(true);
    expect(tenantIds.has(B)).toBe(false);
  });

  it("hides another tenant's batches and items", async () => {
    const batch = await userB
      .from("generation_batches")
      .select("id")
      .eq("id", batchA);
    expect(batch.data).toEqual([]);
    const items = await userB
      .from("generation_items")
      .select("id")
      .eq("batch_id", batchA);
    expect(items.data).toEqual([]);
  });

  it("refuses to create a batch for another tenant", async () => {
    const viaRpc = await createBatch(userA, B);
    expect(viaRpc.error?.code).toBe("42501");
    const direct = await userA.from("generation_batches").insert({
      tenant_id: B,
      kind: "single",
      request: {},
      brief: {},
    });
    expect(direct.error?.code).toBe("42501");
  });

  it("refuses to attach an item to another tenant's batch", async () => {
    const { data } = await createBatch(userB, B);
    const batchB = z.string().parse(data);
    createdBatches.push(batchB);
    // Own tenant_id passes RLS, but (batch_id, tenant_id) must exist together: composite FK.
    const attach = await userA
      .from("generation_items")
      .insert({ ...item, batch_id: batchB, tenant_id: A, index: 5 });
    expect(attach.error?.code).toBe("23503");
  });

  it("lets nobody change an item's tenant, prompt or config", async () => {
    for (const patch of [{ tenant_id: B }, { prompt: {} }, { config: {} }]) {
      const { error } = await userA
        .from("generation_items")
        .update(patch)
        .eq("id", itemA);
      expect(error?.code).toBe("42501");
    }
  });

  it("does not let another tenant update or claim an item", async () => {
    const update = await userB
      .from("generation_items")
      .update({ status: "failed", error: {} })
      .eq("id", itemA)
      .select();
    expect(update.data).toEqual([]);
    const claim = await userB.rpc("claim_generation_item", {
      p_batch_id: batchA,
      p_item_id: itemA,
    });
    expect(claim.data).toEqual([]);
  });

  it("claims an item once while its lease runs", async () => {
    const first = await userA.rpc("claim_generation_item", {
      p_batch_id: batchA,
      p_item_id: itemA,
    });
    expect(first.data).toHaveLength(1);
    expect(first.data?.[0]).toMatchObject({ status: "running", attempts: 1 });
    const second = await userA.rpc("claim_generation_item", {
      p_batch_id: batchA,
      p_item_id: itemA,
    });
    expect(second.data).toEqual([]);
  });

  it("keeps Storage files inside the tenant's folder", async () => {
    const own = `${A}/${batchA}/${itemA}-1.png`;
    const upload = await userA.storage
      .from(BUCKET)
      .upload(own, new Uint8Array([1]), { contentType: "image/png" });
    expect(upload.error).toBeNull();
    createdFiles.push(own);

    const foreign = await userA.storage
      .from(BUCKET)
      .upload(`${B}/${batchA}/intrusion.png`, new Uint8Array([1]), {
        contentType: "image/png",
      });
    expect(foreign.error).not.toBeNull();

    const read = await userB.storage.from(BUCKET).download(own);
    expect(read.error).not.toBeNull();
    expect((await userA.storage.from(BUCKET).download(own)).error).toBeNull();
  });

  it("gives an anonymous caller nothing", async () => {
    const anon = client();
    const { data, error } = await anon.from("generation_batches").select("id");
    expect(error?.code === "42501" || data?.length === 0).toBe(true);
    const claim = await anon.rpc("claim_generation_item", {
      p_batch_id: batchA,
      p_item_id: itemA,
    });
    expect(claim.error).not.toBeNull();
  });
});
