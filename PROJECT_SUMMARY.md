# Project Summary

**Structure and architecture.** I used one Next.js/TypeScript application for the UI and backend-for-frontend. Image generation is a separate feature module with client-safe and server-only entry points, plus provider and repository interfaces. Deterministic code combines the Goldfizh vision, client knowledge and user input, checking supported rule conflicts before paid calls. Stored briefs, knowledge versions, prompts and model settings preserve generation context, without promising identical pixels. Supabase Auth and PostgreSQL/Storage RLS isolate clients.

**Risks at volume.** Project estimates are approximately $0.04 per image, $0.60 per 15-image collection and 10–16 seconds per image. Concurrent clients compete for provider quotas; retries increase cost and latency. Browser-driven collections stop scheduling work when the tab closes.

**With more time.** I would add a generation history so users can revisit previous images and reuse their settings. I would also improve navigation between steps, allowing users to go back without losing their selections or generated results.

**Where I deliberately did not use AI.**

Where I deliberately avoided AI. Brief construction, rule validation, tenant isolation, retry decisions and duplicate-execution prevention use explicit code because they require predictable, testable behaviour.
