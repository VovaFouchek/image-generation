import { z } from "zod";
import { COLOR_MODES, FORMAT_KEYS, STYLES } from "./options";

const note = z.string().trim().min(1).max(200);

// Tenant identity comes from the server session, never the request.
export const generationRequestSchema = z
  .object({
    pageId: z.string().min(1),
    brandSegmentId: z.string().min(1),
    style: z.enum(STYLES),
    colorMode: z.enum(COLOR_MODES),
    mainColorId: z.string().min(1),
    format: z.enum(FORMAT_KEYS),
    // Free text for the "Other" options; treated as data, never as instructions.
    styleNote: note.optional(),
    colorNote: note.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.style === "other" && !value.styleNote) {
      ctx.addIssue({
        code: "custom",
        path: ["styleNote"],
        message: "Describe the style when choosing Other",
      });
    }
    if (value.colorMode === "other" && !value.colorNote) {
      ctx.addIssue({
        code: "custom",
        path: ["colorNote"],
        message: "Describe the colours when choosing Other",
      });
    }
  });

export type GenerationRequest = z.infer<typeof generationRequestSchema>;

/** Body of POST /batches: a new single generation, or 15 variations of an existing one. */
export const createBatchBodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("single"), request: generationRequestSchema }),
  z.object({ kind: z.literal("variations"), from: z.uuid() }),
]);

export type CreateBatchBody = z.infer<typeof createBatchBodySchema>;
