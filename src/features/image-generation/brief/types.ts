import type { AspectRatio, Format } from "../domain/options";
import type { RuleStrength } from "../knowledge/types";

// Resolved values preserve the inputs needed to reconstruct a stored brief's prompt.

export const BRIEF_SCHEMA_VERSION = 1;

export type Provenance =
  | { source: "global"; ruleId: string }
  | { source: "tenant"; field: string }
  | { source: "tenant-rule"; ruleId: string }
  | { source: "request"; field: string }
  | { source: "page"; pageId: string }
  | { source: "segment"; segmentId: string };

export interface BriefConstraint {
  ruleId: string;
  strength: RuleStrength;
  text: string;
  promptPositive?: string;
  promptExclusions: string[];
  provenance: Provenance;
}

export interface Accent {
  name: string;
  hex: string;
  /** Where in the scene the accent appears. */
  anchor: string;
}

export type ColorTreatment =
  | { kind: "vibrant"; palette: string; accent: Accent | null }
  | { kind: "black-and-white"; accent: Accent | null }
  | { kind: "custom"; note: string; palette: string; accent: Accent | null };

export interface VisualBrief {
  schemaVersion: typeof BRIEF_SCHEMA_VERSION;
  context: {
    tenantId: string;
    pageId: string;
    pageUrl: string;
    segmentId: string;
    globalKnowledgeVersion: string;
    tenantKnowledgeVersion: string;
  };
  intent: {
    brandName: string;
    brandDescription: string;
    /** Brand personality from client knowledge; sets the tone of every image. */
    brandCharacter: string;
    pageTitle: string;
    pageSummary: string;
    message: string;
  };
  audience: { label: string; description: string; mood: string };
  scene: {
    /** Subject + action + setting, one or two sentences. */
    narrative: string;
    marketSetting: string;
    abstract: boolean;
  };
  visualLanguage: {
    medium: string;
    style: string;
    lighting: string;
    color: ColorTreatment;
  };
  composition: { shot: string; cameraAngle: string; placement: string };
  format: { key: Format; aspectRatio: AspectRatio; label: string };
  constraints: BriefConstraint[];
  /** What stays fixed inside a batch and which axes may vary. */
  variationPolicy: {
    fixed: string[];
    variable: Array<keyof Variation["axes"]>;
  };
  provenance: Record<string, Provenance[]>;
}

/** One planned variation of a brief: only the allowed axes change. */
export interface Variation {
  index: number;
  axes: { cameraAngle: string; placement: string };
}
