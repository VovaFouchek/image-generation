// Option lists for the generation form.
// Values are stable identifiers stored with every generation; labels are UI-only.
// Main colour swatches are not listed here: they come from the tenant's palette.

export const STYLES = ["simple", "abstract", "other"] as const;
export type Style = (typeof STYLES)[number];

export const COLOR_MODES = ["vibrant", "black-and-white", "other"] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export const FORMATS = {
  square: {
    label: "1:1 square",
    aspectRatio: "1:1",
    promptLabel: "Square 1:1",
  },
  standing: {
    label: "4:5 standing",
    aspectRatio: "4:5",
    promptLabel: "Portrait 4:5",
  },
  horizontal: {
    label: "16:9 horizontal",
    aspectRatio: "16:9",
    promptLabel: "Wide 16:9 landscape",
  },
} as const;
export type Format = keyof typeof FORMATS;
export type AspectRatio = (typeof FORMATS)[Format]["aspectRatio"];
export const FORMAT_KEYS = [
  "square",
  "standing",
  "horizontal",
] as const satisfies readonly Format[];

export const BATCH_SIZE = 15;
