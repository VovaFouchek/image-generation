"use client";

import { useId } from "react";
import {
  Button,
  ChoiceGroup,
  Field,
  Panel,
  Select,
  SwatchGroup,
  TextInput,
} from "@/ui";
import {
  COLOR_MODES,
  FORMAT_KEYS,
  FORMATS,
  STYLES,
} from "../../domain/options";
import type { FormOptionsView } from "../../domain/views";
import type { FormField, FormValues } from "../../hooks/use-generation-form";
import { SCREEN_1 } from "../copy";

export interface GenerationFormProps {
  options: FormOptionsView;
  values: FormValues;
  errors: Partial<Record<FormField, string>>;
  generating: boolean;
  onChange: <K extends FormField>(field: K, value: FormValues[K]) => void;
  onSubmit: () => void;
}

/** The form panel of screen 1 (Figma 2:9). State lives in useGenerationForm. */
export function GenerationForm({
  options,
  values,
  errors,
  generating,
  onChange,
  onSubmit,
}: GenerationFormProps) {
  const id = useId();
  const copy = SCREEN_1;

  return (
    <Panel title={copy.formTitle} className="flex-1">
      <form
        noValidate
        className="flex flex-1 flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Field
          label={copy.labels.page}
          htmlFor={`${id}-page`}
          error={errors.pageId}
        >
          <Select
            id={`${id}-page`}
            value={values.pageId}
            placeholder={copy.placeholders.page}
            options={options.pages.map((page) => ({
              value: page.id,
              label: page.url,
            }))}
            onChange={(event) => onChange("pageId", event.target.value)}
          />
        </Field>

        <Field
          label={copy.labels.segment}
          htmlFor={`${id}-segment`}
          error={errors.brandSegmentId}
        >
          <Select
            id={`${id}-segment`}
            value={values.brandSegmentId}
            placeholder={copy.placeholders.segment}
            options={options.segments.map((segment) => ({
              value: segment.id,
              label: segment.label,
            }))}
            onChange={(event) => onChange("brandSegmentId", event.target.value)}
          />
        </Field>

        <Field
          label={copy.labels.style}
          labelId={`${id}-style`}
          error={errors.style ?? errors.styleNote}
        >
          <ChoiceGroup
            aria-labelledby={`${id}-style`}
            value={values.style}
            options={STYLES.map((style) => ({
              value: style,
              label: copy.styles[style],
            }))}
            onValueChange={(value) => {
              const style = STYLES.find((candidate) => candidate === value);
              if (style) onChange("style", style);
            }}
          />
          {values.style === "other" ? (
            <TextInput
              aria-label={copy.placeholders.styleNote}
              placeholder={copy.placeholders.styleNote}
              maxLength={200}
              value={values.styleNote}
              onChange={(event) => onChange("styleNote", event.target.value)}
            />
          ) : null}
        </Field>

        <Field
          label={copy.labels.colors}
          labelId={`${id}-colors`}
          error={errors.colorMode ?? errors.colorNote}
        >
          <ChoiceGroup
            aria-labelledby={`${id}-colors`}
            value={values.colorMode}
            options={COLOR_MODES.map((mode) => ({
              value: mode,
              label: copy.colorModes[mode],
            }))}
            onValueChange={(value) => {
              const mode = COLOR_MODES.find((candidate) => candidate === value);
              if (mode) onChange("colorMode", mode);
            }}
          />
          {values.colorMode === "other" ? (
            <TextInput
              aria-label={copy.placeholders.colorNote}
              placeholder={copy.placeholders.colorNote}
              maxLength={200}
              value={values.colorNote}
              onChange={(event) => onChange("colorNote", event.target.value)}
            />
          ) : null}
        </Field>

        <Field
          label={copy.labels.mainColor}
          labelId={`${id}-color`}
          error={errors.mainColorId}
        >
          <SwatchGroup
            aria-labelledby={`${id}-color`}
            value={values.mainColorId}
            options={options.palette.map((color) => ({
              value: color.id,
              name: color.name,
              hex: color.hex,
            }))}
            onValueChange={(value) => onChange("mainColorId", value)}
          />
        </Field>

        <Field label={copy.labels.format} labelId={`${id}-format`}>
          <ChoiceGroup
            aria-labelledby={`${id}-format`}
            value={values.format}
            options={FORMAT_KEYS.map((format) => ({
              value: format,
              label: FORMATS[format].label,
            }))}
            onValueChange={(value) => {
              const format = FORMAT_KEYS.find(
                (candidate) => candidate === value,
              );
              if (format) onChange("format", format);
            }}
          />
        </Field>

        <div className="flex-1" />
        <Button type="submit" size="lg" loading={generating}>
          {copy.generate}
        </Button>
      </form>
    </Panel>
  );
}
