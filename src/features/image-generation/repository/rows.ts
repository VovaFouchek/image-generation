import { z } from "zod";
import type {
  BriefConstraint,
  ColorTreatment,
  Provenance,
  Variation,
  VisualBrief,
} from "../brief/types";
import { BRIEF_SCHEMA_VERSION } from "../brief/types";
import { PROVIDER_ERROR_KINDS } from "../domain/errors";
import { FORMAT_KEYS, FORMATS } from "../domain/options";
import { generationRequestSchema } from "../domain/request";
import type { ComposedPrompt } from "../prompt/compose-prompt";
import {
  IMAGE_SIZES,
  THINKING_LEVELS,
  type GeneratedImage,
  type ProviderConfig,
} from "../providers/types";
import type { GenerationBatch, GenerationItem, ItemError } from "./types";

// Rows from Postgres → domain types. Every jsonb column is parsed here (zod at the DB boundary),
// so the service only ever sees checked values. Schemas are annotated with the domain types.

const ASPECT_RATIOS = FORMAT_KEYS.map((key) => FORMATS[key].aspectRatio);

const provenanceSchema: z.ZodType<Provenance> = z.discriminatedUnion("source", [
  z.object({ source: z.literal("global"), ruleId: z.string() }),
  z.object({ source: z.literal("tenant"), field: z.string() }),
  z.object({ source: z.literal("tenant-rule"), ruleId: z.string() }),
  z.object({ source: z.literal("request"), field: z.string() }),
  z.object({ source: z.literal("page"), pageId: z.string() }),
  z.object({ source: z.literal("segment"), segmentId: z.string() }),
]);

const accentSchema = z
  .object({ name: z.string(), hex: z.string(), anchor: z.string() })
  .nullable();

const colorSchema: z.ZodType<ColorTreatment> = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("vibrant"),
    palette: z.string(),
    accent: accentSchema,
  }),
  z.object({ kind: z.literal("black-and-white"), accent: accentSchema }),
  z.object({
    kind: z.literal("custom"),
    note: z.string(),
    palette: z.string(),
    accent: accentSchema,
  }),
]);

const constraintSchema: z.ZodType<BriefConstraint> = z.object({
  ruleId: z.string(),
  strength: z.enum(["required", "default"]),
  text: z.string(),
  promptPositive: z.string().optional(),
  promptExclusions: z.array(z.string()),
  provenance: provenanceSchema,
});

const variationSchema: z.ZodType<Variation> = z.object({
  index: z.number().int().min(0),
  axes: z.object({ cameraAngle: z.string(), placement: z.string() }),
});

export const briefSchema: z.ZodType<VisualBrief> = z.object({
  schemaVersion: z.literal(BRIEF_SCHEMA_VERSION),
  context: z.object({
    tenantId: z.string(),
    pageId: z.string(),
    pageUrl: z.string(),
    segmentId: z.string(),
    globalKnowledgeVersion: z.string(),
    tenantKnowledgeVersion: z.string(),
  }),
  intent: z.object({
    brandName: z.string(),
    brandDescription: z.string(),
    brandCharacter: z.string(),
    pageTitle: z.string(),
    pageSummary: z.string(),
    message: z.string(),
  }),
  audience: z.object({
    label: z.string(),
    description: z.string(),
    mood: z.string(),
  }),
  scene: z.object({
    narrative: z.string(),
    marketSetting: z.string(),
    abstract: z.boolean(),
  }),
  visualLanguage: z.object({
    medium: z.string(),
    style: z.string(),
    lighting: z.string(),
    color: colorSchema,
  }),
  composition: z.object({
    shot: z.string(),
    cameraAngle: z.string(),
    placement: z.string(),
  }),
  format: z.object({
    key: z.enum(FORMAT_KEYS),
    aspectRatio: z.enum(ASPECT_RATIOS),
    label: z.string(),
  }),
  constraints: z.array(constraintSchema),
  variationPolicy: z.object({
    fixed: z.array(z.string()),
    variable: z.array(z.enum(["cameraAngle", "placement"])),
  }),
  provenance: z.record(z.string(), z.array(provenanceSchema)),
});

const promptSchema: z.ZodType<ComposedPrompt> = z.object({
  templateVersion: z.string(),
  systemInstruction: z.string(),
  prompt: z.string(),
});

/**
 * Validates the snapshot's structure and supported values. This is not spending permission:
 * generation-service separately checks it against the server's current execution policy.
 */
export const providerConfigSchema: z.ZodType<ProviderConfig> = z.object({
  provider: z.enum(["mock", "gemini"]),
  model: z.string().min(1),
  aspectRatio: z.enum(ASPECT_RATIOS),
  imageSize: z.enum(IMAGE_SIZES),
  thinkingLevel: z.enum(THINKING_LEVELS),
});

const itemErrorSchema: z.ZodType<ItemError> = z.object({
  kind: z.enum(PROVIDER_ERROR_KINDS),
  message: z.string(),
  retryable: z.boolean(),
});

const usageSchema: z.ZodType<NonNullable<GeneratedImage["usage"]>> = z.object({
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  thoughtTokens: z.number().optional(),
});

const jsonSchema = z.json();

/** Domain value → jsonb parameter (plain JSON, checked, so nothing non-serialisable slips in). */
export function toJson(value: unknown): z.infer<typeof jsonSchema> {
  return jsonSchema.parse(JSON.parse(JSON.stringify(value)));
}

export const itemRowSchema = z.object({
  id: z.string(),
  batch_id: z.string(),
  tenant_id: z.string(),
  index: z.number().int(),
  variation: variationSchema,
  prompt: promptSchema,
  config: providerConfigSchema,
  status: z.enum(["queued", "running", "succeeded", "failed"]),
  attempts: z.number().int(),
  running_since: z.string().nullable(),
  model: z.string().nullable(),
  provider_request_id: z.string().nullable(),
  storage_path: z.string().nullable(),
  mime_type: z.string().nullable(),
  usage: usageSchema.nullable(),
  duration_ms: z.number().int().nullable(),
  error: itemErrorSchema.nullable(),
  updated_at: z.string(),
});
export type ItemRow = z.infer<typeof itemRowSchema>;

export const batchRowSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  kind: z.enum(["single", "variations"]),
  source_batch_id: z.string().nullable(),
  request: generationRequestSchema,
  brief: briefSchema,
  created_at: z.string(),
  generation_items: z.array(itemRowSchema),
});

/** Turns a row into the state-specific domain item; inconsistent rows are rejected. */
export function toGenerationItem(row: ItemRow): GenerationItem {
  const base = {
    id: row.id,
    batchId: row.batch_id,
    tenantId: row.tenant_id,
    index: row.index,
    variation: row.variation,
    prompt: row.prompt,
    config: row.config,
    attempts: row.attempts,
    updatedAt: row.updated_at,
  };
  switch (row.status) {
    case "queued":
      return { ...base, status: "queued" };
    case "running":
      if (!row.running_since) throw new Error(`Item ${row.id}: no lease`);
      return { ...base, status: "running", runningSince: row.running_since };
    case "succeeded":
      if (!row.model) throw new Error(`Item ${row.id}: no model`);
      return {
        ...base,
        status: "succeeded",
        model: row.model,
        providerRequestId: row.provider_request_id ?? undefined,
        usage: row.usage ?? undefined,
        durationMs: row.duration_ms ?? 0,
      };
    case "failed":
      if (!row.error) throw new Error(`Item ${row.id}: no error`);
      return { ...base, status: "failed", error: row.error };
  }
}

export function toGenerationBatch(
  row: z.infer<typeof batchRowSchema>,
): GenerationBatch {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    kind: row.kind,
    sourceBatchId: row.source_batch_id,
    request: row.request,
    brief: row.brief,
    createdAt: row.created_at,
    items: row.generation_items
      .map(toGenerationItem)
      .sort((a, b) => a.index - b.index),
  };
}
