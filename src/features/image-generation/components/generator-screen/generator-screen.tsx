import "server-only";
import { AppHeader, PageShell } from "@/ui";
import { getRequestContext } from "../../server/context";
import { getFormOptions } from "../../server/generation-service";
import { SCREEN_1 } from "../copy";
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
          title={SCREEN_1.header(options.brandName)}
          meta={SCREEN_1.step}
        />
      }
    >
      <GeneratorView options={options} variationsPath={variationsPath} />
    </PageShell>
  );
}
