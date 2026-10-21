import { describe, expect, it } from "vitest";
import { demoTenant } from "../test-fixtures";
import { GLOBAL_KNOWLEDGE } from "./mock-knowledge";
import { globalKnowledgeSchema, tenantKnowledgeSchema } from "./schema";

describe("knowledge schemas", () => {
  it("accept the demo knowledge as stored in the database", () => {
    const stored = (value: unknown) => JSON.parse(JSON.stringify(value));
    expect(globalKnowledgeSchema.parse(stored(GLOBAL_KNOWLEDGE))).toEqual(
      GLOBAL_KNOWLEDGE,
    );
    for (const tenantId of ["demo-fresh", "demo-travel"]) {
      const tenant = demoTenant(tenantId);
      expect(tenantKnowledgeSchema.parse(stored(tenant))).toEqual(tenant);
    }
  });

  it("reject knowledge without a palette", () => {
    const tenant = { ...demoTenant("demo-fresh"), palette: [] };
    expect(tenantKnowledgeSchema.safeParse(tenant).success).toBe(false);
  });
});
