import { describe, expect, it } from "vitest";
import { buildBrief } from "../brief/build-brief";
import { GLOBAL_KNOWLEDGE } from "../knowledge/mock-knowledge";
import { demoTenant, freshRequest } from "../test-fixtures";
import {
  briefSchema,
  itemRowSchema,
  providerConfigSchema,
  toGenerationItem,
  type ItemRow,
} from "./rows";

const row: ItemRow = {
  id: "item-1",
  batch_id: "batch-1",
  tenant_id: "demo-fresh",
  index: 0,
  variation: {
    index: 0,
    axes: { cameraAngle: "at eye level", placement: "centred" },
  },
  prompt: { templateVersion: "nb21-v1", systemInstruction: "", prompt: "" },
  config: {
    provider: "gemini",
    model: "gemini-nano-banana-2.1",
    aspectRatio: "4:5",
    imageSize: "1K",
    thinkingLevel: "medium",
  },
  status: "queued",
  attempts: 0,
  running_since: null,
  model: null,
  provider_request_id: null,
  storage_path: null,
  mime_type: null,
  usage: null,
  duration_ms: null,
  error: null,
  updated_at: "2026-10-21T12:00:00.000Z",
};

describe("database rows", () => {
  it("round-trips a brief through JSON", () => {
    const brief = buildBrief(
      GLOBAL_KNOWLEDGE,
      demoTenant("demo-fresh"),
      freshRequest(),
    );
    expect(briefSchema.parse(JSON.parse(JSON.stringify(brief)))).toEqual(brief);
  });

  it("maps a running row with its lease", () => {
    const item = toGenerationItem(
      itemRowSchema.parse({
        ...row,
        status: "running",
        attempts: 1,
        running_since: "2026-10-21T12:00:01.000Z",
      }),
    );
    expect(item).toMatchObject({
      status: "running",
      runningSince: "2026-10-21T12:00:01.000Z",
    });
  });

  it("rejects a row whose state is inconsistent", () => {
    expect(() => toGenerationItem({ ...row, status: "failed" })).toThrow();
  });

  it("rejects a provider snapshot outside the known providers and sizes", () => {
    expect(
      providerConfigSchema.safeParse({ ...row.config, provider: "other" })
        .success,
    ).toBe(false);
    expect(
      providerConfigSchema.safeParse({ ...row.config, imageSize: "8K" })
        .success,
    ).toBe(false);
  });
});
