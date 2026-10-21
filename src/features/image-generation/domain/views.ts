import { z } from "zod";

// What the browser receives. Brief, prompts and provider config stay on the server: the
// prototype has no brief preview, and client knowledge should not leak into the UI.
// Schemas are the single source of the types: the server builds these shapes, the client
// validates responses against them.

const errorKindSchema = z.enum([
  "rate_limit",
  "transient",
  "billing",
  "safety",
  "invalid",
]);

const itemBase = {
  id: z.string(),
  index: z.number().int(),
  attempts: z.number().int(),
};

export const itemViewSchema = z.discriminatedUnion("status", [
  z.object({ ...itemBase, status: z.literal("queued") }),
  z.object({ ...itemBase, status: z.literal("running") }),
  z.object({
    ...itemBase,
    status: z.literal("succeeded"),
    imageUrl: z.string(),
  }),
  z.object({
    ...itemBase,
    status: z.literal("failed"),
    error: z.object({
      kind: errorKindSchema,
      message: z.string(),
      retryable: z.boolean(),
    }),
  }),
]);

export const batchViewSchema = z.object({
  id: z.string(),
  kind: z.enum(["single", "variations"]),
  sourceBatchId: z.string().nullable(),
  aspectRatio: z.enum(["1:1", "4:5", "16:9"]),
  createdAt: z.string(),
  items: z.array(itemViewSchema),
});

export type ItemView = z.infer<typeof itemViewSchema>;
export type BatchView = z.infer<typeof batchViewSchema>;

/** What the generation form needs from the tenant's knowledge — nothing more. */
export interface FormOptionsView {
  brandName: string;
  pages: { id: string; url: string }[];
  segments: { id: string; label: string }[];
  palette: { id: string; name: string; hex: string }[];
  /** First palette colour (white in the demo): no accent, as pre-selected in Figma. */
  defaultMainColorId: string;
}
