import { BriefConflictError, UnknownReferenceError } from "../domain/errors";
import { toInlineData } from "../domain/inline-data";
import { FORMATS } from "../domain/options";
import type { GenerationRequest } from "../domain/request";
import type {
  GlobalKnowledge,
  PaletteColor,
  Rule,
  TenantKnowledge,
} from "../knowledge/types";
import { resolveVisualStyle } from "./resolve-visual-style";
import {
  BRIEF_SCHEMA_VERSION,
  type Accent,
  type BriefConstraint,
  type ColorTreatment,
  type Provenance,
  type VisualBrief,
} from "./types";

const WHITE = "#FFFFFF";

/**
 * Merges the three layers into one brief. Deterministic on purpose (no LLM):
 * same inputs → same brief, which is what makes generations repeatable and testable.
 *
 * Throws UnknownReferenceError for IDs the tenant does not have and BriefConflictError when
 * the request breaks a required rule — both before any paid provider call.
 */
export function buildBrief(
  global: GlobalKnowledge,
  tenant: TenantKnowledge,
  request: GenerationRequest,
): VisualBrief {
  const page = tenant.pages.find(
    (candidate) => candidate.id === request.pageId,
  );
  if (!page) throw new UnknownReferenceError("pageId", request.pageId);
  const segment = tenant.segments.find(
    (candidate) => candidate.id === request.brandSegmentId,
  );
  if (!segment)
    throw new UnknownReferenceError("brandSegmentId", request.brandSegmentId);
  const mainColor = tenant.palette.find(
    (candidate) => candidate.id === request.mainColorId,
  );
  if (!mainColor)
    throw new UnknownReferenceError("mainColorId", request.mainColorId);

  const abstract = request.style === "abstract";
  assertNoConflicts(
    [...global.principles, ...tenant.rules],
    segment.showsPeople && !abstract,
    segment.label,
  );

  const format = FORMATS[request.format];
  const accent = toAccent(mainColor, page.accentAnchor);
  const { composition, ...visualStyle } = resolveVisualStyle(tenant, request);
  const styleProvenance: Provenance[] =
    request.style === "simple"
      ? [
          { source: "request", field: "style" },
          { source: "tenant", field: "photography" },
        ]
      : request.style === "other"
        ? [
            { source: "request", field: "style" },
            { source: "request", field: "styleNote" },
          ]
        : [{ source: "request", field: "style" }];

  return {
    schemaVersion: BRIEF_SCHEMA_VERSION,
    context: {
      tenantId: tenant.tenantId,
      pageId: page.id,
      pageUrl: page.url,
      segmentId: segment.id,
      globalKnowledgeVersion: global.version,
      tenantKnowledgeVersion: tenant.version,
    },
    intent: {
      brandName: tenant.brandName,
      brandDescription: tenant.brandDescription,
      brandCharacter: tenant.brandPersonality,
      pageTitle: page.title,
      pageSummary: page.summary,
      message: page.message,
    },
    audience: {
      label: segment.label,
      description: segment.description,
      mood: segment.mood,
    },
    scene: {
      narrative: abstract
        ? `An abstract composition that expresses the idea "${page.message}" for ${segment.description}.`
        : `${capitalize(page.subject)}, ${segment.setting}.`,
      marketSetting: tenant.marketSetting,
      abstract,
    },
    visualLanguage: {
      ...visualStyle,
      color: toColorTreatment(request, tenant.photography.palette, accent),
    },
    composition,
    format: {
      key: request.format,
      aspectRatio: format.aspectRatio,
      label: format.promptLabel,
    },
    constraints: [
      ...global.principles.map((rule) =>
        toConstraint(rule, { source: "global", ruleId: rule.id }),
      ),
      ...tenant.rules.map((rule) =>
        toConstraint(rule, { source: "tenant-rule", ruleId: rule.id }),
      ),
    ],
    variationPolicy: {
      fixed: [
        "intent",
        "audience",
        "scene",
        "visualLanguage",
        "format",
        "constraints",
      ],
      variable: ["cameraAngle", "placement"],
    },
    provenance: {
      intent: [
        { source: "page", pageId: page.id },
        { source: "tenant", field: "brandPersonality" },
      ],
      audience: [{ source: "segment", segmentId: segment.id }],
      scene: [
        { source: "page", pageId: page.id },
        { source: "segment", segmentId: segment.id },
        { source: "request", field: "style" },
        { source: "tenant", field: "marketSetting" },
      ],
      "visualLanguage.medium": styleProvenance,
      "visualLanguage.style": styleProvenance,
      "visualLanguage.lighting": styleProvenance,
      "visualLanguage.color": [
        { source: "request", field: "colorMode" },
        { source: "request", field: "mainColorId" },
        { source: "tenant", field: "palette" },
      ],
      composition: styleProvenance,
      format: [{ source: "request", field: "format" }],
    },
  };
}

function assertNoConflicts(
  rules: Rule[],
  showsPeople: boolean,
  segmentLabel: string,
) {
  const conflicting = rules.filter(
    (rule) =>
      rule.strength === "required" && rule.forbids?.people && showsPeople,
  );
  if (conflicting.length === 0) return;
  throw new BriefConflictError(
    `The rule "${conflicting.map((rule) => rule.text).join(" ")}" does not allow people, ` +
      `but the segment "${segmentLabel}" shows people. Choose the Abstract style or another segment.`,
    conflicting.map((rule) => rule.id),
  );
}

/** White means "no accent": it adds no colour to the scene. */
function toAccent(color: PaletteColor, anchor: string): Accent | null {
  return color.hex.toUpperCase() === WHITE
    ? null
    : { name: color.name, hex: color.hex.toUpperCase(), anchor };
}

function toColorTreatment(
  request: GenerationRequest,
  palette: string,
  accent: Accent | null,
): ColorTreatment {
  switch (request.colorMode) {
    case "vibrant":
      return { kind: "vibrant", palette, accent };
    case "black-and-white":
      return { kind: "black-and-white", accent };
    case "other":
      return {
        kind: "custom",
        note: toInlineData(request.colorNote ?? "", 200),
        palette,
        accent,
      };
  }
}

function toConstraint(rule: Rule, provenance: Provenance): BriefConstraint {
  return {
    ruleId: rule.id,
    strength: rule.strength,
    text: rule.text,
    promptPositive: rule.promptPositive,
    promptExclusions: rule.promptExclusions ?? [],
    provenance,
  };
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
