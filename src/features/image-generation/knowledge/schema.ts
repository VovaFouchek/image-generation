import { z } from "zod";
import type {
  AudienceSegment,
  ContentPage,
  GlobalKnowledge,
  PaletteColor,
  PhotographyGuide,
  Rule,
  TenantKnowledge,
} from "./types";

// Knowledge read from the database (jsonb) is checked against these before it reaches the brief.
// Each schema is annotated with its interface, so the compiler flags any drift between the two.

const ruleSchema: z.ZodType<Rule> = z.object({
  id: z.string().min(1),
  strength: z.enum(["required", "default"]),
  text: z.string().min(1),
  promptPositive: z.string().optional(),
  promptExclusions: z.array(z.string()).optional(),
  forbids: z.object({ people: z.boolean().optional() }).optional(),
});

const paletteColorSchema: z.ZodType<PaletteColor> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

const segmentSchema: z.ZodType<AudienceSegment> = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string(),
  setting: z.string(),
  mood: z.string(),
  showsPeople: z.boolean(),
});

const pageSchema: z.ZodType<ContentPage> = z.object({
  id: z.string().min(1),
  url: z.url(),
  title: z.string(),
  summary: z.string(),
  message: z.string(),
  subject: z.string(),
  accentAnchor: z.string(),
});

const photographySchema: z.ZodType<PhotographyGuide> = z.object({
  medium: z.string(),
  style: z.string(),
  lighting: z.string(),
  palette: z.string(),
  shot: z.string(),
  defaultCameraAngle: z.string(),
  defaultPlacement: z.string(),
});

export const globalKnowledgeSchema: z.ZodType<GlobalKnowledge> = z.object({
  version: z.string().min(1),
  principles: z.array(ruleSchema),
});

export const tenantKnowledgeSchema: z.ZodType<TenantKnowledge> = z.object({
  tenantId: z.string().min(1),
  version: z.string().min(1),
  brandName: z.string().min(1),
  brandDescription: z.string(),
  brandPersonality: z.string(),
  marketSetting: z.string(),
  photography: photographySchema,
  palette: z.array(paletteColorSchema).min(1),
  rules: z.array(ruleSchema),
  segments: z.array(segmentSchema),
  pages: z.array(pageSchema),
});
