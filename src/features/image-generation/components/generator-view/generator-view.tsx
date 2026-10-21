"use client";

import { SplitLayout } from "@/ui";
import type { FormOptionsView } from "../../domain/views";
import { useGenerationForm } from "../../hooks/use-generation-form";
import { GenerationForm } from "../generation-form";
import { PreviewPanel } from "../preview-panel";

export interface GeneratorViewProps {
  options: FormOptionsView;
  variationsPath: string;
}

export function GeneratorView({ options, variationsPath }: GeneratorViewProps) {
  const { values, errors, preview, setValue, submit } =
    useGenerationForm(options);

  return (
    <SplitLayout
      aside={
        <GenerationForm
          options={options}
          values={values}
          errors={errors}
          generating={preview.kind === "generating"}
          onChange={setValue}
          onSubmit={() => void submit()}
        />
      }
    >
      <PreviewPanel
        preview={preview}
        continueHref={
          preview.kind === "ready" && !preview.stale
            ? `${variationsPath}?from=${encodeURIComponent(preview.batchId)}`
            : undefined
        }
      />
    </SplitLayout>
  );
}
