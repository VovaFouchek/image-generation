import "server-only";
import { AppHeader, PageShell } from "@/ui";
import { getRequestContext } from "../../server/context";
import { getFormOptions } from "../../server/generation-service";
import { GENERATOR_TEXT } from "../../texts";
import { GeneratorView } from "../generator-view";

export interface GeneratorScreenProps {
  variationsPath: string;
}

export async function GeneratorScreen({
  variationsPath,
}: GeneratorScreenProps) {
  const options = await getFormOptions(await getRequestContext());
  return (
    <PageShell
      header={
        <AppHeader
          title={GENERATOR_TEXT.header(options.brandName)}
          meta={GENERATOR_TEXT.step}
        />
      }
    >
      <GeneratorView options={options} variationsPath={variationsPath} />
    </PageShell>
  );
}
