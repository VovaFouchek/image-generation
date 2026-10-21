import "server-only";
import { z } from "zod";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import {
  batchRowSchema,
  itemRowSchema,
  toGenerationBatch,
  toGenerationItem,
  toJson,
} from "./rows";
import type { GenerationRepository, RunningItem } from "./types";

// Postgres + Storage under the signed-in user's session: RLS scopes every row and file to
// the caller's tenant; the tenantId filters below are a second line, not the protection.
// Schema: supabase/migrations/*_image_generation.sql.

const BUCKET = "generated-images";
const BATCH_SELECT = "*, generation_items(*)";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

const isUuid = (value: string) => z.uuid().safeParse(value).success;

function dbError(operation: string, cause: unknown): Error {
  return new Error(`Database: ${operation} failed`, { cause });
}

export function createSupabaseGenerationRepository(
  client: SupabaseServerClient,
): GenerationRepository {
  async function getBatch(tenantId: string, batchId: string) {
    if (!isUuid(batchId)) return null;
    const { data, error } = await client
      .from("generation_batches")
      .select(BATCH_SELECT)
      .eq("id", batchId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw dbError("load batch", error);
    return data ? toGenerationBatch(batchRowSchema.parse(data)) : null;
  }

  /** Compare-and-set on the attempt: 0 rows means a newer attempt took over. */
  async function finishAttempt(
    tenantId: string,
    batchId: string,
    itemId: string,
    attempt: number,
    patch: TablesUpdate<"generation_items">,
  ) {
    const { data, error } = await client
      .from("generation_items")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("batch_id", batchId)
      .eq("tenant_id", tenantId)
      .eq("status", "running")
      .eq("attempts", attempt)
      .select()
      .maybeSingle();
    if (error) throw dbError("finish attempt", error);
    return data ? toGenerationItem(itemRowSchema.parse(data)) : null;
  }

  return {
    async createBatch({
      tenantId,
      kind,
      sourceBatchId,
      request,
      brief,
      items,
    }) {
      const { data: batchId, error } = await client.rpc(
        "create_generation_batch",
        {
          p_tenant_id: tenantId,
          p_kind: kind,
          ...(sourceBatchId ? { p_source_batch_id: sourceBatchId } : {}),
          p_request: toJson(request),
          p_brief: toJson(brief),
          p_items: toJson(items),
        },
      );
      if (error) throw dbError("create batch", error);
      const created = await getBatch(tenantId, batchId);
      if (!created)
        throw new Error(`Batch ${batchId} not readable after insert`);
      return created;
    },

    getBatch,

    async claimItem(tenantId, batchId, itemId) {
      if (!isUuid(batchId) || !isUuid(itemId)) return null;
      const { data, error } = await client.rpc("claim_generation_item", {
        p_batch_id: batchId,
        p_item_id: itemId,
      });
      if (error) throw dbError("claim item", error);
      const [row] = data;
      if (!row) return null;
      const item = toGenerationItem(itemRowSchema.parse(row));
      if (item.tenantId !== tenantId || item.status !== "running") {
        throw new Error(
          `Claimed item ${itemId} is not a running item of this tenant`,
        );
      }
      return item satisfies RunningItem;
    },

    async completeItem(tenantId, batchId, itemId, attempt, result) {
      // The attempt is in the path, so a late upload never replaces a newer attempt's file.
      const extension = EXTENSIONS[result.mimeType] ?? "bin";
      const path = `${tenantId}/${batchId}/${itemId}-${attempt}.${extension}`;
      const upload = await client.storage
        .from(BUCKET)
        .upload(path, result.data, {
          contentType: result.mimeType,
          upsert: false,
        });
      if (upload.error) throw dbError("upload image", upload.error);
      // If this attempt was superseded the file stays orphaned; rare, and harmless to others.
      return finishAttempt(tenantId, batchId, itemId, attempt, {
        status: "succeeded",
        storage_path: path,
        mime_type: result.mimeType,
        model: result.model,
        provider_request_id: result.providerRequestId ?? null,
        usage: result.usage ? toJson(result.usage) : null,
        duration_ms: result.durationMs,
      });
    },

    async failItem(tenantId, batchId, itemId, attempt, error) {
      return finishAttempt(tenantId, batchId, itemId, attempt, {
        status: "failed",
        error: toJson(error),
      });
    },

    async getImage(tenantId, itemId) {
      if (!isUuid(itemId)) return null;
      const { data, error } = await client
        .from("generation_items")
        .select("storage_path, mime_type")
        .eq("id", itemId)
        .eq("tenant_id", tenantId)
        .eq("status", "succeeded")
        .maybeSingle();
      if (error) throw dbError("load image row", error);
      if (!data?.storage_path || !data.mime_type) return null;
      const file = await client.storage
        .from(BUCKET)
        .download(data.storage_path);
      if (file.error) throw dbError("download image", file.error);
      return {
        mimeType: data.mime_type,
        data: new Uint8Array(await file.data.arrayBuffer()),
      };
    },

    async countAttemptsSince(tenantId, since) {
      const { data, error } = await client
        .from("generation_items")
        .select("attempts")
        .eq("tenant_id", tenantId)
        .gte("created_at", since.toISOString());
      if (error) throw dbError("count attempts", error);
      return data.reduce((total, row) => total + row.attempts, 0);
    },
  };
}
