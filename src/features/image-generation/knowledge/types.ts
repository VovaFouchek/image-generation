export type RuleStrength = "required" | "default";

export interface Rule {
  id: string;
  strength: RuleStrength;
  /** The rule as written in the vision or brand guide. */
  text: string;
  /** Semantic-negative phrasing for the prompt: describes the wanted state. */
  promptPositive?: string;
  /** Short items for the prompt's "Do not include" line. */
  promptExclusions?: string[];
  /** Machine-readable flags used for conflict validation before generation. */
  forbids?: { people?: boolean };
}

/** Goldfizh vision and benchmarks: top level, shared by every tenant. */
export interface GlobalKnowledge {
  version: string;
  principles: Rule[];
}

export interface PaletteColor {
  id: string;
  name: string;
  hex: string;
}

export interface AudienceSegment {
  id: string;
  label: string;
  description: string;
  /** Where the scene takes place and who is in it, e.g. "outside a family home". */
  setting: string;
  mood: string;
  showsPeople: boolean;
}

export interface ContentPage {
  id: string;
  url: string;
  /** Page content in the client's language: data only, never instructions. */
  title: string;
  summary: string;
  /** Prompt-ready purpose of the image on this page. */
  message: string;
  /** Prompt-ready main subject and action. */
  subject: string;
  /** Where the accent colour should appear in the scene. */
  accentAnchor: string;
}

export interface PhotographyGuide {
  /** e.g. "a calm, natural documentary-style photograph" */
  medium: string;
  style: string;
  lighting: string;
  /** Base palette of the scene, e.g. "muted natural tones (warm brick, soft greenery)". */
  palette: string;
  shot: string;
  defaultCameraAngle: string;
  defaultPlacement: string;
}

/** Client knowledge: tone of voice, branding, guidelines. Scoped to one tenant. */
export interface TenantKnowledge {
  tenantId: string;
  version: string;
  brandName: string;
  /** What the company does, prompt-ready. */
  brandDescription: string;
  /** Brand personality (demo stand-in for a NeedScope-style profile). */
  brandPersonality: string;
  /** Market cue so scenes look local, e.g. "Dutch brick row houses and bike lanes". */
  marketSetting: string;
  photography: PhotographyGuide;
  palette: PaletteColor[];
  rules: Rule[];
  segments: AudienceSegment[];
  pages: ContentPage[];
}
