import type { ProviderErrorKind } from "../domain/errors";

export const SCREEN_1 = {
  header: (brandName: string) => `${brandName} - image generator`,
  step: "Step 1 of 2",
  formTitle: "Generate a new image",
  labels: {
    page: "Page from URL",
    segment: "Brand segment",
    style: "Style",
    colors: "Colors",
    mainColor: "Main color",
    format: "Format",
  },
  placeholders: {
    page: "Pick a URL..",
    segment: "Choose your brand segment",
    styleNote: "Describe the style",
    colorNote: "Describe the colours",
  },
  styles: { simple: "Simple", abstract: "Abstract", other: "Other" },
  colorModes: {
    vibrant: "Vibrant",
    "black-and-white": "Black & white",
    other: "Other",
  },
  generate: "Generate image",
  previewTitle: "Example",
  status: {
    idle: "Nothing generated",
    generating: "Generating…",
    ready: "Ready",
    stale: "Settings changed",
    failed: "Failed",
  },
  continue: "Continue to 15 variations",
  imageAlt: "Generated example image",
  errors: {
    pageId: "Pick a page",
    brandSegmentId: "Choose a brand segment",
    mainColorId: "Choose a main colour",
    network: "Could not reach the server. Try again.",
  },
} as const;

export const SCREEN_2 = {
  header: (brandName: string) => `${brandName} — Beeldgenerator`,
  title: "Beeldbank — 15 variaties",
  subtitle:
    "Zelfde stijl en instellingen als je losse generatie, in één actie.",
  generate: "Genereer 15 variaties",
  variant: (index: number) => `Variant ${index + 1}`,
  status: { done: "Klaar", busy: "Bezig", failed: "Mislukt" },
  counts: {
    done: (count: number) => `${count} klaar`,
    busy: (count: number) => `${count} bezig`,
    failed: (count: number) => `${count} mislukt — opnieuw proberen`,
  },
  retry: "Opnieuw proberen",
  busyLabel: "Bezig met genereren",
  failedLabel: "Genereren mislukt",
  /** Why retrying will not help; shown under a disabled retry button. */
  reasons: {
    safety: "Afgewezen door het inhoudsfilter.",
    billing: "Beeldgeneratie is tijdelijk niet beschikbaar.",
    invalid: "Beeldgeneratie is niet goed ingesteld.",
    rate_limit: "De dienst is druk. Probeer het zo opnieuw.",
    transient: "Er ging iets mis. Probeer het opnieuw.",
  } satisfies Record<ProviderErrorKind, string>,
  network: "Geen verbinding met de server. Probeer het opnieuw.",
  imageAlt: (index: number) => `Variant ${index + 1}`,
} as const;
