import { describe, expect, it } from "vitest";
import { ITEM_LEASE_MS, type GenerationItem } from "../repository/types";
import { toItemView } from "./views";

const failed: GenerationItem = {
  id: "item-1",
  batchId: "batch-1",
  tenantId: "demo-fresh",
  index: 0,
  variation: {
    index: 0,
    axes: { cameraAngle: "at eye level", placement: "centred" },
  },
  prompt: {
    templateVersion: "nb21-v1",
    systemInstruction: "secret vision",
    prompt: "secret brief",
  },
  config: {
    provider: "gemini",
    model: "gemini-nano-banana-2.1",
    aspectRatio: "1:1",
    imageSize: "1K",
    thinkingLevel: "medium",
  },
  attempts: 1,
  updatedAt: "2026-10-21T12:00:00.000Z",
  status: "failed",
  error: {
    kind: "billing",
    message:
      "Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects",
    retryable: false,
  },
};

describe("toItemView", () => {
  it("replaces the raw provider message with a generic one", () => {
    const view = toItemView(failed);
    expect(view).toEqual({
      id: "item-1",
      index: 0,
      attempts: 1,
      status: "failed",
      error: {
        kind: "billing",
        retryable: false,
        message: "Image generation is temporarily unavailable.",
      },
    });
  });

  it("never exposes prompts or provider config", () => {
    const json = JSON.stringify(toItemView(failed));
    expect(json).not.toMatch(/secret|ai\.studio|prepayment|gemini/);
  });

  it("shows a run past its lease as a retryable failure", () => {
    const running: GenerationItem = {
      ...failed,
      status: "running",
      runningSince: "2026-10-21T12:00:00.000Z",
    };
    const start = Date.parse(running.runningSince);

    expect(toItemView(running, start + ITEM_LEASE_MS).status).toBe("running");
    expect(toItemView(running, start + ITEM_LEASE_MS + 1)).toMatchObject({
      status: "failed",
      error: { kind: "transient", retryable: true },
    });
  });
});
