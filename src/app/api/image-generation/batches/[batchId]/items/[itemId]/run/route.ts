export { runItemRoute as POST } from "@/features/image-generation/server";

// One item per request. All provider calls of a run share a 100 s budget (see
// PROVIDER_BUDGET_MS), which keeps it under this limit. Must be a literal in the route file.
export const maxDuration = 120;
