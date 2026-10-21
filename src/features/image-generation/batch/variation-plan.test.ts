import { describe, expect, it } from "vitest";
import { buildBrief } from "../brief/build-brief";
import { BATCH_SIZE } from "../domain/options";
import { GLOBAL_KNOWLEDGE } from "../knowledge/mock-knowledge";
import { freshRequest, demoTenant } from "../test-fixtures";
import { planVariations } from "./variation-plan";

const brief = buildBrief(
  GLOBAL_KNOWLEDGE,
  demoTenant("demo-fresh"),
  freshRequest(),
);

describe("planVariations", () => {
  it("uses the brief's own composition for a single generation", () => {
    expect(planVariations(brief, 1)).toEqual([
      {
        index: 0,
        axes: {
          cameraAngle: brief.composition.cameraAngle,
          placement: brief.composition.placement,
        },
      },
    ]);
  });

  it("plans 15 distinct compositions for a batch", () => {
    const variations = planVariations(brief, BATCH_SIZE);
    const compositions = new Set(
      variations.map(({ axes }) => `${axes.cameraAngle}|${axes.placement}`),
    );

    expect(variations.map(({ index }) => index)).toEqual([
      ...Array(BATCH_SIZE).keys(),
    ]);
    expect(compositions.size).toBe(BATCH_SIZE);
  });

  it("only varies the allowed axes", () => {
    expect(brief.variationPolicy.variable).toEqual([
      "cameraAngle",
      "placement",
    ]);
    for (const variation of planVariations(brief, BATCH_SIZE)) {
      expect(Object.keys(variation.axes).sort()).toEqual([
        "cameraAngle",
        "placement",
      ]);
    }
  });

  it.each([0, 16, 2.5])("rejects a count of %s", (count) => {
    expect(() => planVariations(brief, count)).toThrow(RangeError);
  });
});
