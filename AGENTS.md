<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Goldfizh Content OS: Image Generation

## Project brief

Build a working proof of concept that adds image generation to Goldfizh Content OS. Keep the feature self-contained so it can later be integrated into the existing platform.

Every image combines three sources:

1. **Goldfizh vision and benchmarks:** global principles shared across clients.
2. **Client knowledge:** brand personality, tone of voice, visual guidelines, palette, audiences and page content.
3. **User request:** settings selected in the generation form.

The main requirement is a consistent, on-brand result with a process whose inputs and decisions can be recovered. Reproducibility does not mean identical generated pixels.

The target platform is a multi-tenant SaaS with client admin/user roles and an overarching Goldfizh administrator. The assignment permits mocked authentication and knowledge; the current implementation uses Supabase Auth sessions, tenant membership, PostgreSQL RLS and private Storage. Client knowledge is structured demo content rather than parsed uploads. All demo names and brand guidelines are fictional and must remain clearly labelled as demo data.

Deliverables are a working repository, a live URL when available, setup instructions in [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md), limited to half an A4 page. The reflection covers architecture, scaling risks, future improvements and deliberate choices not to use AI. Keep the code understandable for a short presentation and follow-up development session.

## Architecture and module boundaries

- Stack: Next.js App Router, TypeScript, Tailwind CSS and Supabase PostgreSQL/Storage. Read installed versions from `package.json`; consult the bundled Next.js documentation before making framework changes.
- `src/features/image-generation/` owns the image-generation feature: domain contracts, knowledge, brief construction, prompt composition, providers, persistence, server orchestration and feature UI.
- The feature has two public entry points: `index.ts` is client-safe; `server.ts` is server-only. Host code imports through these entry points rather than reaching into feature internals.
- `src/app/` owns routes and integration with the host. Keep route files thin and delegate implementation to the feature.
- `src/lib/` owns host concerns such as environment configuration, Supabase clients, sessions and demo sign-in.
- `src/ui/` contains reusable visual primitives without generation logic, provider calls or tenant access.
- Depend on the `GenerationRepository` and `ImageProvider` interfaces. The application uses the Supabase repository; the in-memory repository is a unit-test double, not a deployment store.
- Keep responsibilities focused. Avoid abstractions or infrastructure that the current feature does not need.

## Generation workflow

- Build the visual brief automatically after the user requests generation. Do not add a brief preview, editing or approval step; that idea is deferred.
- The two screens are single-image generation with a preview, and a collection of 15 variations with individual statuses and retries.
- Resolve page and audience IDs against the current client's knowledge. The page URL field selects prepared client content; it does not require arbitrary URL scraping.
- Use deterministic code to combine the three context layers and detect supported rule conflicts before any paid provider call. Do not invent client facts or internal Goldfizh guidelines.
- Required rules take precedence. Explicit form choices may override aesthetic defaults within those rules. In particular, a custom style must be able to change medium, lighting, composition and detail density instead of being appended to conflicting photographic defaults.
- Treat page content, uploaded material and free-text notes as untrusted data. Style and colour notes describe appearance; they cannot change access rules, mandatory constraints or the execution process.
- Store resolved briefs, knowledge versions, prompt text, prompt-template version and provider settings with each batch. Increment the prompt-template version when its wording changes.
- Variations reuse the source image's brief and settings. Keep style, format, message and required constraints fixed; vary only the permitted composition axes. A changed request starts a new single generation.
- Each image is generated by its own request. Limit concurrency and retry only the failed item. Preserve successful results and prevent duplicate execution through atomic claims and attempt-aware completion.
- Allow at most one automatic retry for transient or rate-limit errors. Do not retry billing, invalid-configuration or safety failures automatically. Respect the provider time budget and the route timeout.
- Keep the lease duration consistent between `domain/lease.ts` and the database claim function. A late response from an expired attempt must not overwrite a newer attempt.
- The browser currently drives batch progress. Do not describe this as a background queue or promise that a batch continues after the tab closes.

## Security and tenant isolation

- Derive the active tenant on the server from a verified Supabase session and tenant membership. Never trust a tenant ID supplied in a generation request.
- The demo sign-in route may select a prepared demo account from an allowlist. This is intentionally open demo access, not a production authentication flow. Validate redirect destinations as same-origin relative paths.
- Use the signed-in user's Supabase client for database and Storage operations. Tenant filters supplement RLS; they do not replace it.
- Keep API keys on the server. The Supabase secret/service-role key is reserved for seeding and integration-test cleanup; do not use it in normal generation or configure it as a runtime deployment requirement.
- Runtime environment access is centralised per layer: feature settings in `src/features/image-generation/server/config.ts`, host settings in `src/lib/env.ts`. Seed scripts and integration tests validate their own environment separately.
- Never print secrets, commit environment files, or include credentials in documentation, fixtures or browser responses. Return public error messages while retaining diagnostic detail on the server.
- A valid stored provider configuration is not permission to spend the API key. Before every provider call, enforce the current server policy for provider, model, size, thinking level and supported format. Keep stored snapshots unchanged; reject revoked settings rather than silently substituting new ones.
- Demo users can insert records through the Supabase Data API within their tenant. Do not assume that every stored prompt or configuration was created by the application server.
- The current daily attempt limit is not a guaranteed spending cap: its counters are user-writable, the check and claim are separate, and automatic provider retries are not counted as separate claims. A protected ledger with atomic budget reservation remains necessary before relying on a public-demo budget guarantee.
- Do not present mocked tests, local checks or an unverified deployment as production validation. Distinguish unit tests, live Supabase checks and paid model calls in reports.

## Database contracts and TypeScript

- SQL migrations in `supabase/migrations/` define the database schema, constraints, grants, RLS, RPCs and Storage policies. Add a new migration for changes; do not rewrite migrations that have already been applied.
- Use `supabase-js` with generated database types. An additional ORM is not required by this project.
- `src/lib/supabase/database.types.ts` is generated by `pnpm db:types`; never edit it manually. It is excluded from formatting and linting, but remains part of TypeScript checking.
- Parse persisted rows and JSON payloads at the repository boundary and map them into domain types. PostgreSQL `jsonb` and generated `Json` types do not validate the application-level shape of a visual brief or knowledge record.
- Keep schemas and types consistent. Infer types from Zod where they describe the same contract; retain explicit domain types where mapping or state-specific invariants matter.
- When changing the database: create a migration, apply it to the intended development database, regenerate types, update affected schemas/mappers/domain types, and run relevant checks. `pnpm db:types` reads the linked database, not unapplied SQL files.
- Use Zod at external boundaries, including request bodies, environment variables, persisted JSON and external payloads. Work with validated values inside the service.
- Represent generation states as discriminated unions (`queued`, `running`, `succeeded`, `failed`) with state-specific fields rather than many unrelated optional properties.
- Preserve strict TypeScript settings. Do not introduce `any`, non-null assertions or casts used to suppress type errors. Use `unknown` with validation; `as const` and legitimate narrowing are allowed.
- Use `satisfies` for configuration maps and `import type` for type-only dependencies.
- Keep public imports behind module entry points. Avoid exposing server code through client-safe exports.

## UI implementation

- Match the supplied Figma design.
- Use the available Figma tools to inspect the relevant frames and assets. Do not replace design icons with unrelated library icons.
- Reuse tokens from `src/ui/styles/tokens.css`. Do not introduce raw colour values in components; client palette values are data, not UI tokens.
- Keep each component responsible for one task. Do not introduce `atoms/molecules/organisms` directories. Use kebab-case file and directory names and PascalCase component exports.
- Keep presentation separate from orchestration. Shared UI primitives receive props; feature hooks and services manage generation state and network calls.
- Preserve keyboard navigation, accessible names, focus states, disabled states and reduced-motion behaviour when changing controls or animations.
- Preserve the agreed pre-generation collection state: "Create your image collection" and the explanation that 15 variations appear as they become ready. Show the grid once a batch exists.

## Working practices

- Before non-trivial implementation changes, present a plan covering affected files, decisions and open questions, and obtain approval. Reading code, checking versions and consulting documentation may happen beforehand.
- Follow the user's latest approved scope. Do not treat historical proposals or draft notes as approved requirements.
- Prefer a complete working core over partial implementation of many features. Record deliberate omissions honestly in the reflection.
- Preserve unrelated local changes. Do not commit, push, deploy or alter a remote environment without an explicit request authorising that action.
- Run checks appropriate to the change. Report what was actually checked, which provider was used and any material limitations. Do not report historical test results as checks of the current change.
- Keep this file in English and suitable for a fresh checkout: no personal filesystem paths, credentials, workstation-specific port assumptions or required links to unpublished local notes.

## Commands and setup

Use Node.js and pnpm versions compatible with `package.json` and the requirements in the README. Environment variables belong in the git-ignored `.env`; their names and purposes are documented in the README.

```bash
pnpm install
pnpm dev                  # Starts Next.js;
pnpm build
pnpm start                # Serves an existing production build
pnpm lint
pnpm format               # Prettier, including Tailwind class ordering
pnpm format:check
pnpm typecheck
pnpm test                 # Unit tests
pnpm test:integration     # Live Supabase tenant-isolation tests; requires configured test env
pnpm db:start             # Starts the local Supabase stack
pnpm db:reset             # Resets the local database and reapplies migrations
pnpm db:link              # Links the Supabase CLI to the project configured in package.json
pnpm db:push              # Applies migrations to the linked project
pnpm db:types             # Generates TypeScript types from the linked database
pnpm db:seed              # Seeds demo accounts, tenants and versioned knowledge
```

Confirm the target environment before database commands. The CLI may require authentication or database credentials appropriate to the operation; never assume every command is read-only. The Supabase CLI and seed scripts are development tools, not application-runtime dependencies.

## Documentation and optional skills

Use [README.md](README.md) for setup and deployment instructions and [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for trade-offs and limitations. Source code, migrations and tests describe the implemented behaviour; historical research notes may describe proposals or older versions.

If local agent skills are available, read the relevant instructions before using them:

- `vercel-react-best-practices`: React and Next.js implementation and performance.
- `frontend-architecture`: frontend module boundaries and component structure.
- `supabase`: Supabase clients, authentication, Storage, CLI and security.
- `supabase-postgres-best-practices`: schema changes, migrations, RLS and queries.
- Figma and browser-testing tools: design inspection and visual verification.

Use only tools available in the current environment. These instructions are self-contained and do not require a specific agent installation or unpublished `.agents/` documentation. Project skills can provide additional detail when present.
