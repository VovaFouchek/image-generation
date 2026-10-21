// DEMO: one prepared account per fictional demo tenant. Not secret: the switcher
// deliberately lets any visitor sign in to these, so they only ever see invented data. The
// password lives in the server env (DEMO_ACCOUNT_PASSWORD). Imported by the seed script too,
// so this module must stay plain data.

export const DEMO_ACCOUNTS = {
  "demo-fresh": "demo-fresh@demo.example.com",
  "demo-travel": "demo-travel@demo.example.com",
} as const satisfies Record<string, string>;

export type DemoTenantId = keyof typeof DEMO_ACCOUNTS;

export const DEFAULT_DEMO_TENANT: DemoTenantId = "demo-fresh";

export function isDemoTenantId(value: unknown): value is DemoTenantId {
  return typeof value === "string" && Object.hasOwn(DEMO_ACCOUNTS, value);
}
