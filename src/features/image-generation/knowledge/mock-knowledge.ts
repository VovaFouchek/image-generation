import "server-only";
import type { KnowledgeSource } from "./source";
import type { GlobalKnowledge, TenantKnowledge } from "./types";

// DEMO DATA. Goldfizh's internal vision/benchmarks and real client guidelines were not provided;
// All names, brand rules and page content are fictional demo material. Public food-delivery
// and travel businesses informed the scenarios, not their identities or private guidelines.
// Research and sample combinations: .agents/docs/demo-scenarios.md.

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
  "demo-fresh": {
    tenantId: "demo-fresh",
    version: "demo-2026-10-21-fresh-v1",
    brandName: "Freshday Market (demo)",
    brandDescription:
      "a fictional Dutch service delivering fresh fruit and vegetables in reusable crates to homes and workplaces",
    brandPersonality:
      "Warm, down-to-earth and helpful; everyday freshness without perfection or exaggerated health promises.",
    marketSetting:
      "a contemporary Dutch home or workplace with pale wood surfaces, large windows and practical everyday furnishings",
    photography: {
      medium: "a natural editorial food and everyday-life photograph",
      style:
        "Tactile, appetising produce with believable skin textures and small natural imperfections; candid gestures when people appear, rather than posed smiles",
      lighting: "Soft side daylight from a nearby window with gentle shadows",
      palette:
        "warm off-white, pale wood and natural produce colours, with restrained sage-green accessories",
      shot: "Medium-wide shot with a 35mm lens and the produce clearly in focus",
      defaultCameraAngle: "at countertop height in three-quarter view",
      defaultPlacement:
        "The produce crate sits in the right third, leaving a calm, uncluttered area on the left",
    },
    // Matches the existing Figma swatches.
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
        text: "Use plain, unbranded crates, clothing and packaging.",
        promptPositive:
          "Crates, clothing and packaging are plain and unbranded, with blank surfaces instead of labels.",
        promptExclusions: ["third-party logos", "brand names"],
      },
      {
        id: "t.believable-produce",
        strength: "required",
        text: "Respect the selected colour treatment; keep depicted produce recognisable and put the accent on accessories only.",
        promptPositive:
          "Respect the requested colour treatment. When produce is depicted, keep believable scale and recognisable shapes; in colour imagery, retain natural produce colours. The selected accent belongs only on the crate handles or a cloth liner.",
        promptExclusions: [
          "unnaturally recoloured produce",
          "plastic-looking fruit",
        ],
      },
      {
        id: "t.everyday-freshness",
        strength: "default",
        text: "Show an ordinary moment of receiving or sharing fresh food.",
        promptPositive:
          "Prefer a relaxed everyday moment, a modest quantity of produce and practical reusable packaging over a lavish feast or warehouse scene.",
      },
    ],
    segments: [
      {
        id: "households",
        label: "Households",
        description:
          "busy households making fresh fruit and vegetables part of their daily routine",
        setting:
          "on a pale wooden kitchen counter in a Dutch family home, with an adult reaching for an apple beside the crate",
        mood: "welcoming, practical and unhurried",
        showsPeople: true,
      },
      {
        id: "workplaces",
        label: "Workplaces",
        description:
          "office teams sharing an easy fresh-food break during the working day",
        setting:
          "on a shared office kitchenette counter, with two colleagues choosing fruit and softly blurred desks in the background",
        mood: "sociable, fresh and quietly energetic",
        showsPeople: true,
      },
    ],
    pages: [
      {
        id: "fresh-delivery",
        url: "https://freshday.example/fresh-delivery",
        title: "Fresh produce delivery",
        summary:
          "Fresh fruit and vegetables delivered in a reusable crate, ready to unpack and enjoy at home or work.",
        message:
          "show how fresh-food delivery fits naturally into everyday life",
        subject:
          "an open reusable grocery crate, just delivered, holds red apples, green pears, carrots and cucumbers with a plain delivery tote alongside",
        accentAnchor: "the reusable crate handles",
      },
      {
        id: "fruit-boxes",
        url: "https://freshday.example/fruit-boxes",
        title: "Fruit boxes to share",
        summary:
          "A shareable selection of apples, pears and bananas for a kitchen counter or workplace break area.",
        message: "make choosing and sharing fresh fruit feel easy and inviting",
        subject:
          "a shallow reusable crate of red apples, green pears and yellow bananas sits ready to share, with one pear placed beside it",
        accentAnchor: "the crate's folded cloth liner",
      },
    ],
  },
  "demo-travel": {
    tenantId: "demo-travel",
    version: "demo-2026-10-21-travel-v1",
    brandName: "Coast & Stay (demo)",
    brandDescription:
      "a fictional Dutch travel service helping travellers discover relaxed coastal holidays and local experiences in Greece",
    brandPersonality:
      "Curious, welcoming and reassuring; attainable discovery and time together rather than exclusive luxury.",
    marketSetting:
      "a coherent Greek Aegean coastal setting with whitewashed low-rise buildings, pale stone paths, olive trees and a clear blue sea; keep architecture, terrain and vegetation consistent within the scene",
    photography: {
      medium: "an inviting editorial travel photograph",
      style:
        "Airy, place-led compositions with a clear sense of scale, authentic stone and linen textures, and, when people appear, relaxed travellers rather than posed advertising models",
      lighting:
        "Warm late-afternoon sunlight with readable detail in the shade and a natural sky",
      palette:
        "chalk white, warm limestone, olive foliage and natural sea blue, with a restrained teal or coral accessory",
      shot: "Wide environmental shot with a 28mm lens and a level horizon",
      defaultCameraAngle: "at eye level looking towards the coast",
      defaultPlacement:
        "The destination fills most of the frame; the main activity sits in the lower right third with open sky or sea on the left",
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
        id: "t.illustrative-destination",
        strength: "required",
        text: "Create a generic illustrative destination, not evidence of a specific hotel, amenity or bookable property.",
        promptPositive:
          "For literal imagery, show an illustrative, geographically coherent Greek coastal scene with modest buildings and ordinary public spaces; keep it independent of any named hotel or identifiable commercial property.",
        promptExclusions: [
          "hotel logos",
          "review badges",
          "invented landmark combinations",
        ],
      },
      {
        id: "t.natural-landscape",
        strength: "required",
        text: "Apply the selected accent to a small travel accessory, never to the landscape.",
        promptPositive:
          "Respect the requested colour treatment. In colour imagery, the sea, sky, stone and vegetation keep their natural colours; the selected accent appears only on a travel bag, picnic cloth or folded towel.",
        promptExclusions: ["artificially recoloured sea or sky"],
      },
      {
        id: "t.relaxed-discovery",
        strength: "default",
        text: "Prefer approachable coastal experiences over staged luxury.",
        promptPositive:
          "Prefer relaxed discovery, modest accommodation and space to breathe over private yachts, infinity pools or crowded tourist spectacles.",
      },
    ],
    segments: [
      {
        id: "families",
        label: "Families",
        description:
          "families looking for an easy coastal holiday and unhurried time together",
        setting:
          "beside a broad coastal path, with two adults and a school-age child strolling together at a relaxed pace",
        mood: "warm, reassuring and gently playful",
        showsPeople: true,
      },
      {
        id: "couples",
        label: "Couples",
        description:
          "couples seeking a relaxed seaside break and small local discoveries",
        setting:
          "beside a quiet coastal path, with two adults pausing together to take in the view",
        mood: "intimate, curious and peaceful",
        showsPeople: true,
      },
      {
        id: "independent-explorers",
        label: "Independent explorers",
        description:
          "independent travellers drawn to quiet scenery and discovering a place at their own pace",
        setting:
          "at an unoccupied coastal viewpoint, with a packed day bag suggesting a traveller just outside the frame",
        mood: "open, contemplative and quietly adventurous",
        showsPeople: false,
      },
    ],
    pages: [
      {
        id: "coastal-holidays",
        url: "https://coast-and-stay.example/coastal-holidays",
        title: "Coastal holidays in Greece",
        summary:
          "Inspiration for unhurried days by the Aegean Sea, with village walks and simple places to pause along the coast.",
        message:
          "help travellers picture a relaxed coastal holiday they can make their own",
        subject:
          "a shaded stone bench and a small canvas day bag overlook a sheltered Aegean bay, with a few whitewashed village houses in the distance",
        accentAnchor: "the canvas day bag",
      },
      {
        id: "local-experiences",
        url: "https://coast-and-stay.example/local-experiences",
        title: "Discover the coast at your own pace",
        summary:
          "Ideas for gentle coastal walks, village stops and a simple picnic with a view, without a packed sightseeing schedule.",
        message:
          "show that a small local discovery can be the highlight of a holiday",
        subject:
          "a folded picnic cloth and a plain canvas bag rest on a low stone wall overlooking an olive-lined footpath leading towards the sea",
        accentAnchor: "the folded picnic cloth",
      },
    ],
  },
};

export function findTenantKnowledge(
  tenantId: string,
): TenantKnowledge | undefined {
  return TENANTS[tenantId];
}

export const mockKnowledgeSource: KnowledgeSource = {
  getGlobal: async () => GLOBAL_KNOWLEDGE,
  getTenant: async (tenantId) => findTenantKnowledge(tenantId) ?? null,
};
