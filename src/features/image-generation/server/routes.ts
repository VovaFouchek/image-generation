import "server-only";
import { createBatchBodySchema } from "../domain/request";
import { getRequestContext } from "./context";
import {
  createSingleBatch,
  createVariationsBatch,
  getBatch,
  getItemImage,
  runItem,
} from "./generation-service";
import { toErrorResponse } from "./http";
import { toBatchView, toItemView } from "./views";

// Route handlers owned by the feature. The host mounts each with a one-line re-export, so
// moving the feature into the platform means copying this folder and adding the route files.
// Params are typed generically: the URL shape belongs to the host, not to the feature.

type Params<T extends string> = { params: Promise<Record<T, string>> };

/** POST — plans a batch (brief + prompts). Does not call the provider. */
export async function createBatchRoute(request: Request) {
  try {
    const body = createBatchBodySchema.parse(await request.json());
    const ctx = await getRequestContext();
    const batch =
      body.kind === "single"
        ? await createSingleBatch(ctx, body.request)
        : await createVariationsBatch(ctx, body.from);
    return Response.json(toBatchView(batch), { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** GET — current state of a batch and its items. */
export async function getBatchRoute(
  _request: Request,
  { params }: Params<"batchId">,
) {
  try {
    const { batchId } = await params;
    const batch = await getBatch(await getRequestContext(), batchId);
    return Response.json(toBatchView(batch));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** POST — runs or retries one image, including any permitted automatic retry. */
export async function runItemRoute(
  _request: Request,
  { params }: Params<"batchId" | "itemId">,
) {
  try {
    const { batchId, itemId } = await params;
    const item = await runItem(await getRequestContext(), batchId, itemId);
    return Response.json(toItemView(item));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** GET — the generated image, scoped to the caller's tenant. */
export async function getImageRoute(
  _request: Request,
  { params }: Params<"itemId">,
) {
  try {
    const { itemId } = await params;
    const image = await getItemImage(await getRequestContext(), itemId);
    return new Response(Buffer.from(image.data), {
      headers: {
        "Content-Type": image.mimeType,
        // A succeeded item's image never changes.
        "Cache-Control": "private, max-age=31536000, immutable",
        // Files come from Storage, which tenant members can write to: never let one run code
        // (e.g. a script inside an SVG) or be sniffed as another type.
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
