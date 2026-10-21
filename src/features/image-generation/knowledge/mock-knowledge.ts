import "server-only";
import type { KnowledgeSource } from "./source";
import type { GlobalKnowledge, TenantKnowledge } from "./types";

// DEMO DATA. Goldfizh's internal vision/benchmarks and real client guidelines were not provided;
// everything below is invented to exercise the pipeline and is labelled as such in the README.
// Client themes are placeholders until the demo clients are chosen.

export const GLOBAL_KNOWLEDGE: GlobalKnowledge = {
  version: "demo-2026-10-21",
  principles: [
    {
      id: "g.one-message",
      strength: "required",
      text: "One clear message per image, matching the page it illustrates.",
    },
    {
      id: "g.end-user",
      strength: "required",
      text: "Show the end customer's situation, not the company's internals.",
    },
    {
      id: "g.no-text",
      strength: "required",
      text: "No generated text, letters, logos or readable number plates in the image.",
      promptPositive:
        "All signs, screens, packaging and number plates are blank or softly out of focus.",
      promptExclusions: [
        "legible text",
        "letters",
        "logos",
        "watermarks",
        "readable licence plates",
      ],
    },
    {
      id: "g.real-light",
      strength: "default",
      text: "Natural, believable lighting over studio gloss.",
    },
  ],
};

const TENANTS: Record<string, TenantKnowledge> = {
  "demo-cargo": {
    tenantId: "demo-cargo",
    version: "demo-2026-10-21",
    brandName: "Bakfiets Bezorgd (demo)",
    brandDescription: "a local delivery service that uses electric cargo bikes",
    brandPersonality: "Calm, practical and friendly; never hurried.",
    marketSetting:
      "a Dutch city with brick row houses, bike lanes and tree-lined streets",
    photography: {
      medium: "a calm, natural documentary-style photograph",
      style: "Natural, unstaged photography with real textures",
      lighting: "Soft morning daylight with gentle shadows",
      palette: "natural city tones (warm brick, light grey pavement, greenery)",
      shot: "Medium-wide shot with a 35mm lens",
      defaultCameraAngle: "at eye level",
      defaultPlacement:
        "The main subject stands in the right third of the frame",
    },
    // Matches the Figma swatches exactly.
    palette: [
      { id: "white", name: "white", hex: "#FFFFFF" },
      { id: "charcoal", name: "charcoal black", hex: "#212126" },
      { id: "sand", name: "warm sand yellow", hex: "#F5DE99" },
      { id: "sage", name: "sage green", hex: "#99CC99" },
      { id: "lilac", name: "soft lilac", hex: "#CC99E5" },
    ],
    rules: [
      {
        id: "t.no-third-party-logos",
        strength: "required",
        text: "No third-party logos or brand marks.",
        promptPositive:
          "The bike, clothing, bags and shopfronts are plain and unbranded.",
        promptExclusions: ["third-party logos", "brand names"],
      },
      {
        id: "t.calm-streets",
        strength: "default",
        text: "Quiet streets without traffic jams or rush.",
        promptPositive: "Prefer quiet streets without traffic or rush.",
      },
    ],
    segments: [
      {
        id: "families",
        label: "Gezinnen",
        description: "families receiving everyday deliveries at home",
        setting: "outside a family home on a quiet residential street",
        mood: "warm and reassuring",
        showsPeople: true,
      },
      {
        id: "shops",
        label: "Ondernemers",
        description: "local shop owners who send and receive goods",
        setting:
          "in front of a small independent shop on a neighbourhood shopping street",
        mood: "efficient and friendly",
        showsPeople: true,
      },
    ],
    pages: [
      {
        id: "city-delivery",
        url: "https://example.com/bezorging-in-de-stad",
        title: "Bezorging in de stad",
        summary:
          "Dezelfde dag bezorgd met de bakfiets binnen de ring: stil en zonder uitstoot.",
        message: "show that city deliveries can be quiet, clean and personal",
        subject:
          "a courier lifts a parcel from the cargo box of an electric cargo bike",
        accentAnchor: "the bike's cargo box",
      },
      {
        id: "pricing",
        url: "https://example.com/tarieven",
        title: "Tarieven",
        summary:
          "Eenvoudige vaste tarieven voor kleine ondernemers, zonder abonnement.",
        message: "show that sending parcels is simple and predictable",
        subject:
          "neatly stacked parcels wait in the cargo box of a parked electric cargo bike",
        accentAnchor: "the parcel tape",
      },
    ],
  },
  "demo-mortgage": {
    tenantId: "demo-mortgage",
    version: "demo-2026-10-21",
    brandName: "Helder Hypotheek (demo)",
    brandDescription: "an independent mortgage advisor",
    brandPersonality:
      "Confident, clear and trustworthy; calm expertise without jargon.",
    marketSetting:
      "a Dutch home with large windows and a clean, light interior",
    photography: {
      medium: "a clean, architectural interior photograph",
      style:
        "Structured compositions with strong lines and plenty of calm space",
      lighting: "Bright, even daylight through large windows",
      palette: "light neutral hues (white walls, pale oak, grey textiles)",
      shot: "Wide shot with a 24mm lens, verticals kept straight",
      defaultCameraAngle: "at chest height",
      defaultPlacement: "The main subject sits in the centre of the frame",
    },
    palette: [
      { id: "white", name: "white", hex: "#FFFFFF" },
      { id: "navy", name: "deep navy", hex: "#1B2A4A" },
      { id: "teal", name: "calm teal", hex: "#2A9D8F" },
      { id: "stone", name: "warm stone grey", hex: "#B8B2A7" },
      { id: "coral", name: "soft coral", hex: "#E76F51" },
    ],
    rules: [
      {
        id: "t.no-people",
        strength: "required",
        text: "No people in images; homes and objects tell the story.",
        promptPositive: "The scene is unoccupied: spaces and objects only.",
        promptExclusions: ["people", "faces", "hands"],
        forbids: { people: true },
      },
      {
        id: "t.no-luxury",
        strength: "default",
        text: "Realistic homes, not luxury villas.",
        promptPositive: "Prefer realistic, modest homes over luxury villas.",
      },
    ],
    segments: [
      {
        id: "starters",
        label: "Starters",
        description: "first-time buyers getting the keys to their first home",
        setting: "a young couple at the front door of their first apartment",
        mood: "hopeful and calm",
        showsPeople: true,
      },
      {
        id: "movers",
        label: "Doorstromers",
        description: "homeowners moving to a bigger family home",
        setting:
          "the empty, sunlit living room of a family house ready to move into",
        mood: "spacious and settled",
        showsPeople: false,
      },
      {
        id: "entrepreneurs",
        label: "Ondernemers",
        description:
          "self-employed buyers who need advice tailored to their income",
        setting: "a tidy home office corner with a desk by the window",
        mood: "focused and in control",
        showsPeople: false,
      },
    ],
    pages: [
      {
        id: "first-home",
        url: "https://example.com/eerste-huis",
        title: "Je eerste huis kopen",
        summary:
          "Stap voor stap naar je eerste hypotheek, met een vaste adviseur.",
        message: "show that buying a first home can feel clear and manageable",
        subject:
          "a set of house keys rests on a windowsill next to a small plant",
        accentAnchor: "the key ring",
      },
      {
        id: "advice",
        url: "https://example.com/advies",
        title: "Hypotheekadvies",
        summary:
          "Onafhankelijk advies zonder verrassingen, ook voor ondernemers.",
        message: "show calm, independent expertise",
        subject: "an open notebook and a cup of coffee on a clean oak table",
        accentAnchor: "the notebook cover",
      },
    ],
  },
};

export const DEFAULT_TENANT_ID = "demo-cargo";

export function findTenantKnowledge(
  tenantId: string,
): TenantKnowledge | undefined {
  return TENANTS[tenantId];
}

export const mockKnowledgeSource: KnowledgeSource = {
  getGlobal: async () => GLOBAL_KNOWLEDGE,
  getTenant: async (tenantId) => findTenantKnowledge(tenantId) ?? null,
};
