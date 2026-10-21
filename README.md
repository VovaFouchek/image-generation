# Goldfizh Content OS — image generation (proof of concept)

On-brand image generation for the Goldfizh Content OS, built as a standalone feature that can be
plugged into the existing multi-tenant platform later.

**Live:** _URL follows after the first Vercel deploy_ · **Stack:** Next.js 16, TypeScript, Tailwind
v4, Supabase (Postgres, Auth, Storage), Google Gemini (Nano Banana 2.1)

- **Screen 1 — single image.** Pick a page, audience segment, style, colours, main colour and
  format; generate one example image to check the direction.
- **Screen 2 — Beeldbank, 15 variations.** One click generates 15 variations with the same style
  and settings, three at a time, with a status per image and a retry for failed ones.

All client data in this repository is fictional and labelled **(demo)**. Goldfizh's internal
vision and real client guidelines were not available, so both are invented stand-ins.

## How the three layers combine

```
Goldfizh vision ──────────────────────────────► system instruction (same for every client)
Client knowledge (brand, palette, photo rules,
  audiences, pages, rules) ──┐
User request (form) ─────────┴─► buildBrief() ─► visual brief ─► composePrompt() ─► prompt
                                 deterministic,   stored with      versioned          │
                                 no LLM           every batch      template           ▼
                                                                        Gemini, one request
                                                                        per image
```

- **Deterministic brief.** `buildBrief` merges the three layers with plain code, records where
  every decision came from, and rejects conflicts (e.g. a "no people" rule against an audience
  that shows people) with a 422 **before** anything is stored or paid for.
- **Repeatable.** Every batch stores the brief, the knowledge versions it was built from, the
  prompt and a snapshot of the provider settings (model, aspect ratio, size, thinking level).
  Retries and the 15 variations reuse that snapshot, not the current environment, so changing
  the configuration never silently changes an approved example's style.
- **Consistent batches.** The 15 variations reuse the example's brief and only vary the camera
  angle and the subject's placement (3 × 5).

## Model choice: Nano Banana 2.1

| Need                   | Why Nano Banana 2.1 (`gemini-nano-banana-2.1`)                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Formats 1:1, 4:5, 16:9 | Native `aspectRatio` parameter; no pixel maths or cropping                                                        |
| Three layers           | Vision → `systemInstruction`, client knowledge + request → prompt; reference images are supported by the same API |
| Batch of 15            | Measured ≈ $0.04 and 10–16 s per 1K image, so ≈ $0.60 and ≈ 2 min per batch at three in parallel                  |
| Integration            | Official TypeScript SDK (`@google/genai`), clear error statuses                                                   |

GPT Image 2.5 ranks higher on public arenas for raw quality and in-image text, but is slower and
more expensive per batch; generated text and logos are avoided here anyway. Nano Banana 2.1 does
not accept a seed, so repeatability comes from the stored brief and settings. The provider sits
behind an `ImageProvider` interface (Gemini + an offline mock), so another model can be swapped in.

## Multi-tenancy and security

- **The tenant always comes from the server-side session**, never from the request. A real
  Supabase Auth session (JWT in cookies via `@supabase/ssr`) is resolved to a tenant through
  `tenant_members`.
- **Isolation is enforced by the database.** Every query and Storage call runs as the signed-in
  user, so row level security scopes batches, items, knowledge and image files to their tenant.
  Composite foreign keys stop rows from pointing across tenants, and signed-in users may only
  update an item's status columns, never its prompt or settings.
- **No secret key at runtime.** The Supabase secret key is used only by the seed script and the
  integration test cleanup. Production holds only the publishable key.
- **Demo sign-in.** `?tenant=` selects which prepared demo account the server signs in with
  (`/api/demo-session`); it proves nothing about the visitor. The demo accounts are open on
  purpose, which is why they hold only fictional data and a daily attempt limit per tenant
  protects the image budget.

## Running locally

Requirements: Node 22+ (24 used), pnpm 12, a Supabase project, a Google AI Studio API key with
billing (Nano Banana 2.1 has no free tier). Without a key, `IMAGE_PROVIDER=mock` returns
placeholder images.

```bash
pnpm install
# 1. Create .env with the variables below.
# 2. Apply the schema and seed the demo data (CLI needs SUPABASE_ACCESS_TOKEN and SUPABASE_DB_PASSWORD):
set -a && . ./.env && set +a
pnpm exec supabase link --project-ref <your-project-ref>
pnpm db:push
pnpm db:seed
# 3. Run
pnpm dev                      # http://localhost:3000/image-generator
```

The first visit signs in as the `demo-fresh` client. Switch clients with
`/image-generator?tenant=demo-travel` (or `?tenant=demo-fresh`).

## Environment variables

`.env` is git-ignored. Only the variables marked "Vercel" are needed in production.

| Variable                               | Required       | Secret  | Where               | Purpose                                                                |
| -------------------------------------- | -------------- | ------- | ------------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | yes            | no      | local, Vercel       | Supabase project URL                                                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes            | no      | local, Vercel       | Publishable key (`sb_publishable_…`); all access goes through RLS      |
| `DEMO_ACCOUNT_PASSWORD`                | yes            | **yes** | local, Vercel, seed | Shared password of the demo accounts (min. 16 chars)                   |
| `IMAGE_PROVIDER`                       | no             | no      | local, Vercel       | `gemini` or `mock` (default `mock`)                                    |
| `GEMINI_API_KEY`                       | with `gemini`  | **yes** | local, Vercel       | Google AI Studio API key                                               |
| `GEMINI_IMAGE_MODEL`                   | no             | no      | local, Vercel       | Default `gemini-nano-banana-2.1`                                       |
| `GEMINI_IMAGE_SIZE`                    | no             | no      | local, Vercel       | `1K`, `2K` or `4K` (default `1K`)                                      |
| `GEMINI_THINKING_LEVEL`                | no             | no      | local, Vercel       | `minimal`, `medium` or `high` (default `medium`)                       |
| `BATCH_CONCURRENCY`                    | no             | no      | local, Vercel       | Variations generated in parallel, 1–10 (default 3)                     |
| `DAILY_ATTEMPT_LIMIT`                  | no             | no      | local, Vercel       | Generation attempts per tenant per 24 h (default 100)                  |
| `MOCK_FAILURE_RATE`                    | no             | no      | local               | Mock only: share of first attempts that fail, 0–1, to exercise retries |
| `SUPABASE_SECRET_KEY`                  | for seed/tests | **yes** | local only          | Seed script and integration test cleanup; never in Vercel              |
| `SUPABASE_ACCESS_TOKEN`                | for CLI        | **yes** | local only          | Supabase CLI (`link`, `gen types`, `db advisors`); read-only is enough |
| `SUPABASE_DB_PASSWORD`                 | for CLI        | **yes** | local only          | Supabase CLI `db push`                                                 |
| `ENABLE_EXPERIMENTAL_COREPACK`         | Vercel         | no      | Vercel              | `1`, so Vercel uses the pnpm version from `packageManager`             |

## Scripts

| Command                              | What it does                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `pnpm dev` / `build` / `start`       | Next.js                                                                                                      |
| `pnpm typecheck` / `lint` / `format` | Strict TypeScript, ESLint, Prettier (+ Tailwind class order)                                                 |
| `pnpm test`                          | Unit tests (Vitest): brief, prompt, variation plan, service, repository semantics, row and knowledge schemas |
| `pnpm test:integration`              | Tenant isolation against the real Supabase project with both demo accounts                                   |
| `pnpm db:push`                       | Apply `supabase/migrations` to the linked project                                                            |
| `pnpm db:types`                      | Regenerate `src/lib/supabase/database.types.ts`                                                              |
| `pnpm db:seed`                       | Demo accounts, tenants and knowledge (idempotent; changed knowledge needs a new version string)              |

## Project structure

```
src/
  app/                          routes; API route files are one-line re-exports
  features/image-generation/    the feature, movable into the platform as one folder
    index.ts                    client-safe entry: options, schemas, view types
    server.ts                   server-only entry: route handlers, screens, request context
    domain/  knowledge/  brief/  prompt/  batch/  providers/  repository/  server/
    components/  hooks/  client/
  lib/                          host concerns: env, Supabase clients, session, demo sign-in
  ui/                           design system from Figma: tokens + single-purpose components
  proxy.ts                      refreshes the Supabase session on every request
supabase/migrations/            schema, RLS, functions, Storage policies
scripts/seed-demo.mts           demo data seed
tests/integration/              tenant isolation test
```

## Deploying to Vercel

Import the GitHub repository, keep the Next.js defaults, and add the "Vercel" variables from the
table. `vercel.json` pins functions to `dub1` (Dublin), next to the database in eu-west-1. The
run route has `maxDuration = 120`; one image takes 10–16 s.

## Known limitations

- The batch is driven by the browser (three requests at a time). Closing the tab pauses it; a
  reload resumes it from the URL. A background queue would remove that dependency.
- Variations come from the text brief only; reference images are supported by the provider
  interface but switched off.
- The current demo knowledge has no rule that conflicts with an audience, so the 422 conflict
  path is covered by unit tests rather than visible in the UI.
- Signed-in demo users can write rows through the Supabase Data API directly; the daily limit
  bounds what that can cost.
- Gemini API is used with the `global` endpoint; EU-only processing would need Vertex AI.
