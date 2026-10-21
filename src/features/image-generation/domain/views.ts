import type { ProviderErrorKind } from "./errors";
import type { AspectRatio } from "./options";

// What the browser receives. Brief, prompts and provider config stay on the server: the
// prototype has no brief preview, and client knowledge should not leak into the UI.

export type ItemView =
  | {
      id: string;
      index: number;
      status: "queued" | "running";
      attempts: number;
    }
  | {
      id: string;
      index: number;
      status: "succeeded";
      attempts: number;
      imageUrl: string;
    }
  | {
      id: string;
      index: number;
      status: "failed";
      attempts: number;
      error: { kind: ProviderErrorKind; message: string; retryable: boolean };
    };

export interface BatchView {
  id: string;
  kind: "single" | "variations";
  sourceBatchId: string | null;
  aspectRatio: AspectRatio;
  createdAt: string;
  items: ItemView[];
}
