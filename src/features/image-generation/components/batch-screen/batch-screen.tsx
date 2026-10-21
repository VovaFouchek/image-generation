import "server-only";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AppHeader, PageShell } from "@/ui";
import { getServerConfig } from "../../server/config";
import { getRequestContext } from "../../server/context";
import { getBatch, getFormOptions } from "../../server/generation-service";
import { toBatchView } from "../../server/views";
import { SCREEN_2 } from "../copy";
import { VariationsView } from "../variations-view";

export interface BatchScreenProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  backPath: string;
}

export async function BatchScreen({
  searchParams,
  backPath,
}: BatchScreenProps) {
  const { from, batch } = await searchParams;
  const sourceId = z.uuid().safeParse(from);
  if (!sourceId.success) redirect(backPath);

  const ctx = await getRequestContext();
  const source = await getBatch(ctx, sourceId.data).catch(() => null);
  const ready =
    source?.kind === "single" &&
    source.items.some((item) => item.status === "succeeded");
  if (!ready) redirect(backPath);

  // A variations batch of this example in the URL (?batch=) survives a reload.
  const batchId = z.uuid().safeParse(batch);
  const restored = batchId.success
    ? await getBatch(ctx, batchId.data).catch(() => null)
    : null;
  const initialBatch =
    restored?.kind === "variations" && restored.sourceBatchId === sourceId.data
      ? toBatchView(restored)
      : null;

  const { brandName } = await getFormOptions(ctx);
  return (
    <PageShell
      header={<AppHeader title={SCREEN_2.header(brandName)} />}
      className="gap-6"
    >
      <VariationsView
        sourceBatchId={sourceId.data}
        concurrency={getServerConfig().BATCH_CONCURRENCY}
        initialBatch={initialBatch}
      />
    </PageShell>
  );
}
