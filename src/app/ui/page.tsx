import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  AppHeader,
  Badge,
  Button,
  ChoiceGroup,
  Field,
  MediaFrame,
  PageShell,
  Panel,
  Select,
  Surface,
  SwatchGroup,
  TextInput,
} from "@/ui";

// Dev-only sheet of every UI component and state, for side-by-side checks against Figma.
export const metadata: Metadata = { title: "UI system · dev" };

const FIGMA_SWATCHES = [
  { value: "white", name: "white", hex: "#FFFFFF" },
  { value: "charcoal", name: "charcoal black", hex: "#212126" },
  { value: "sand", name: "warm sand yellow", hex: "#F5DE99" },
  { value: "sage", name: "sage green", hex: "#99CC99" },
  { value: "lilac", name: "soft lilac", hex: "#CC99E5" },
];

const MOCK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="928" height="1152"><rect width="100%" height="100%" fill="#99CC99"/></svg>',
  );

export default function UiSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <PageShell
      header={<AppHeader title="UI system" meta="dev only" />}
      className="gap-8"
    >
      <Section title="Buttons">
        <div className="w-form-panel">
          <Button size="lg">Generate image</Button>
        </div>
        <Button>Genereer 15 variaties</Button>
        <Button loading>Genereer 15 variaties</Button>
        <div className="w-60">
          <Button variant="danger-outline" size="sm">
            Opnieuw proberen
          </Button>
        </div>
        <div className="w-60">
          <Button variant="danger-outline" size="sm" disabled>
            Opnieuw proberen
          </Button>
        </div>
      </Section>

      <Section title="Badges">
        <Badge>Nothing generated</Badge>
        <Badge tone="success" size="pill">
          12 klaar
        </Badge>
        <Badge tone="warning" size="pill">
          2 bezig
        </Badge>
        <Badge tone="danger" size="pill">
          1 mislukt — opnieuw proberen
        </Badge>
        <Badge tone="success" size="sm">
          Klaar
        </Badge>
        <Badge tone="warning" size="sm">
          Bezig
        </Badge>
        <Badge tone="danger" size="sm">
          Mislukt
        </Badge>
      </Section>

      <Section title="Form controls">
        <div className="flex w-form-panel flex-col gap-5">
          <Field label="Page from URL" htmlFor="ui-page">
            <Select
              id="ui-page"
              defaultValue=""
              placeholder="Pick a URL.."
              options={[{ value: "a", label: "https://example.com/a" }]}
            />
          </Field>
          <Field label="Style" labelId="ui-style">
            <ChoiceGroup
              aria-labelledby="ui-style"
              defaultValue="simple"
              options={[
                { value: "simple", label: "Simple" },
                { value: "abstract", label: "Abstract" },
                { value: "other", label: "Other" },
              ]}
            />
          </Field>
          <Field label="Format" labelId="ui-format">
            <ChoiceGroup
              aria-labelledby="ui-format"
              defaultValue="square"
              options={[
                { value: "square", label: "1:1 square" },
                { value: "standing", label: "4:5 standing" },
                {
                  value: "horizontal",
                  label: "16:9 horizontal",
                  disabled: true,
                },
              ]}
            />
          </Field>
          <Field label="Main color" labelId="ui-color">
            <SwatchGroup
              aria-labelledby="ui-color"
              defaultValue="white"
              options={FIGMA_SWATCHES}
            />
          </Field>
          <Field
            label="Describe the style"
            htmlFor="ui-note"
            error="Describe the style when choosing Other"
          >
            <TextInput id="ui-note" placeholder="e.g. watercolour" />
          </Field>
        </div>
      </Section>

      <Section title="Preview frame">
        {(["empty", "loading", "error"] as const).map((kind) => (
          <div key={kind} className="flex h-72 w-96 flex-col">
            <MediaFrame state={{ kind }} statusLabel={kind} />
          </div>
        ))}
        <div className="flex h-72 w-96 flex-col">
          <MediaFrame
            state={{ kind: "image", src: MOCK_IMAGE, alt: "Mock 4:5 image" }}
          />
        </div>
      </Section>

      <Section title="Variant tiles">
        {(["loading", "error"] as const).map((kind) => (
          <Surface
            key={kind}
            radius="card"
            className="flex w-64 flex-col gap-2 p-2.5"
          >
            <MediaFrame variant="tile" state={{ kind }} statusLabel={kind} />
          </Surface>
        ))}
        <Surface radius="card" className="flex w-64 flex-col gap-2 p-2.5">
          <MediaFrame
            variant="tile"
            state={{ kind: "image", src: MOCK_IMAGE, alt: "Mock tile" }}
          />
        </Surface>
      </Section>

      <Section title="Panel">
        <div className="flex h-60 w-[640px] flex-col">
          <Panel
            title="Example"
            aside={<Badge>Nothing generated</Badge>}
            className="flex-1"
          >
            <MediaFrame state={{ kind: "empty" }} />
          </Panel>
        </div>
      </Section>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-label text-text-muted">{title}</h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}
