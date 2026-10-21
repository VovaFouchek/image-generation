import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("./supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const { safeReturnPath } = await import("./demo-session");

describe("safeReturnPath", () => {
  it("keeps a same-origin path with its query", () => {
    expect(safeReturnPath("/image-generator/batch?from=abc&batch=def")).toBe(
      "/image-generator/batch?from=abc&batch=def",
    );
  });

  it.each([
    null,
    "",
    "https://evil.example/",
    "//evil.example/path",
    "/\\evil.example",
    "javascript:alert(1)",
    "image-generator",
  ])("falls back to the generator for %j", (value) => {
    expect(safeReturnPath(value)).toBe("/image-generator");
  });
});
