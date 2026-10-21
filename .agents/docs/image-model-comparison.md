# Image Generation Model Comparison

**Reviewed:** 21 October 2026.

**Decision:** retain Google's Nano Banana 2.1 (`gemini-nano-banana-2.1`) through the Gemini API for this proof of concept. It is already implemented behind the `ImageProvider` interface and fits the required formats and interactive workflow. This is a project-specific choice, not a claim that it is the best or cheapest model for every task.

This document distinguishes official capabilities, implemented behaviour and historical project observations. Prices are in USD and may change. No new paid generation or cross-provider benchmark was run for this documentation update.

## 1. Selection criteria

| ID  | Criterion                             | Why it matters                                                                                                                       |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| K1  | Square, portrait and landscape output | Figma requires 1:1, 4:5 and 16:9. Pass the format as an API parameter rather than relying on prompt wording.                         |
| K2  | Reference-image support               | Product photos and visual references may improve consistency; their effect needs evaluation before enabling them.                    |
| K3  | Style and palette control             | The selected style, colour treatment and accent must visibly affect the image within required brand rules.                           |
| K4  | Recoverable generation context        | Store the brief, knowledge versions, prompt, template version and model configuration. Do not promise identical pixels.              |
| K5  | Cost of 15 variations                 | Include prompts, image inputs, thinking, outputs, retries and storage rather than quoting only an output-image price.                |
| K6  | Interactive latency                   | A single preview should complete within the server's request budget; a collection needs bounded concurrency and individual statuses. |
| K7  | Scaling and asynchronous processing   | Multiple tenants share provider capacity. Larger workloads may need scheduling and fair allocation.                                  |
| K8  | Regional processing and data handling | Validate the exact provider, model, endpoint and account controls before claiming EU-only processing.                                |
| K9  | Integration effort                    | Prefer a small TypeScript adapter that can be replaced without changing the brief or UI contracts.                                   |

## 2. Candidates

### Google Gemini: Nano Banana 2.1

The official model page documents 1K, 2K and 4K outputs, up to 14 reference images, and `minimal`, `medium` and `high` thinking levels. These are capabilities of the model, not features all enabled in this application. [Gemini model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1)

The Google Cloud model specification includes the required 1:1, 4:5 and 16:9 aspect ratios, system instructions and batch inference. It lists only the `global` region and explicitly excludes `seed`, `temperature`, `topP`, `topK` and `logprobs`. The implementation omits those sampling parameters; it does not assume that generic SDK fields are valid for this model on every backend. [Google Cloud model specification](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/nano-banana-2-1)

**Fit for this project:** the implemented `@google/genai` adapter calls `models.generateContent`, passes the selected aspect ratio, and keeps the three context layers traceable:

| Context layer    | Current implementation                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Goldfizh vision  | Shared `systemInstruction`                                                               |
| Client knowledge | Resolved brand, audience, page context and required rules in the brief and prompt        |
| User request     | Style, colour treatment, accent and format resolved into the same brief and API settings |

Reference images are supported by the provider interface but are not supplied by the current generation service. The 15-image collection uses individual interactive calls; it does not use the provider's Batch API.

### OpenAI: GPT Image 2.5 Flare and Sunburst

The official API guide documents `gpt-image-2.5-flare` and `gpt-image-2.5-sunburst`, image editing, transparent output and custom pixel dimensions. For example, `1024x1024`, `1024x1280` and `1536x864` represent the three required formats and satisfy the documented dimension constraints. An adapter would translate the application's aspect-ratio enum into explicit sizes. [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation)

Standard GPT Image 2.5 rates are $30 per million image output tokens, $8 per million image input tokens and $5 per million text input tokens. Per-image cost depends on model, dimensions, quality and token use; older GPT Image 2 per-image estimates must not be reused as GPT Image 2.5 quotes. [OpenAI pricing](https://developers.openai.com/api/docs/pricing)

**Fit for this project:** a useful alternative to evaluate for editing and transparent assets. No OpenAI image adapter or comparable latency/quality benchmark is implemented here. The current decision does not depend on an arena ranking or an assumed speed disadvantage.

### Black Forest Labs: FLUX.2

The FLUX.2 family documents multi-reference editing, outputs up to 4 megapixels and hex-colour guidance. Precise colour control is a vendor capability claim that still needs testing on the client's actual palette and materials. [FLUX.2 overview](https://docs.bfl.ai/flux_2/flux2_overview)

FLUX.2 pricing scales with megapixels. The official pricing page directs readers to a calculator; its fetched table did not expose usable per-variant amounts, so this comparison does not substitute third-party prices. [Black Forest Labs pricing](https://docs.bfl.ai/quick_start/pricing)

**Fit for this project:** a candidate for a focused palette-fidelity experiment. Before implementing an adapter, verify the chosen endpoint's size constraints, reference limits, job lifecycle and regional processing. No superiority over the selected model has been measured in this project.

### Higgsfield

Higgsfield provides a shared asynchronous API for multiple image and video endpoints. A request returns an identifier; completion can be handled through polling or a webhook. Capabilities and request bodies depend on the selected model. [Higgsfield API documentation](https://docs.higgsfield.ai/docs)

**Fit for this project:** worth considering if a later scope needs several media models or video workflows through one integration. For the current feature, a direct Gemini adapter already meets the integration need. Higgsfield would require its own endpoint, pricing, reliability and data-handling evaluation; it cannot be scored as if it were one image model.

### Recraft

Recraft exposes image and vector generation, editing and style controls through its API. [Recraft API overview](https://www.recraft.ai/api)

**Fit for this project:** a relevant alternative if the output scope expands to vector assets or illustration systems. It is not implemented or benchmarked here. The current collection remains a raster-image workflow.

## 3. Decision summary

The implementation-status column describes this repository. Evaluation priorities are engineering judgements, not benchmark results.

| Candidate       | Main reason to evaluate it                        | Implementation status                            | Evidence still needed                                                |
| --------------- | ------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| Nano Banana 2.1 | Existing adapter and required format controls     | Selected; Gemini and offline mock adapters exist | Repeated brand-consistency evaluation and reference-image comparison |
| GPT Image 2.5   | Editing and transparent assets                    | Alternative only                                 | Actual cost, latency and visual consistency on the same briefs       |
| FLUX.2          | Palette-focused evaluation                        | Alternative only                                 | Selected endpoint's behaviour, cost and colour accuracy              |
| Higgsfield      | A common integration for multiple media endpoints | Alternative only                                 | A specific model choice and its operational trade-offs               |
| Recraft         | Vector and illustration workflows                 | Alternative only                                 | Whether those outputs belong in the product scope                    |

A published feature list does not establish relative quality. No cross-provider winner is claimed without a controlled comparison using the same client context and output requirements.

## 4. Cost and latency assumptions

### Published Gemini image-output prices

Google lists the following output-image equivalents. Batch pricing is lower, but the current application uses Standard interactive calls. [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)

| Resolution | Standard output per image | Standard output for 15 | Batch output per image | Batch output for 15 |
| ---------- | ------------------------: | ---------------------: | ---------------------: | ------------------: |
| 1K         |                   $0.0336 |                $0.5040 |                $0.0168 |             $0.2520 |
| 2K         |                   $0.0504 |                $0.7560 |                $0.0252 |             $0.3780 |
| 4K         |                   $0.1134 |                $1.7010 |                $0.0567 |             $0.8505 |

For 4K Standard output, the value above uses the documented 3,780 output tokens at $30 per million; Google's headline price rounds this to $0.113. [Token-based calculation](https://ai.google.dev/gemini-api/docs/pricing)

The 15-image totals are arithmetic estimates, not full request quotes. Input and text/thinking tokens are billed separately. One initial 1K example plus 15 variations has an image-output baseline of $0.5376 at Standard rates, before those additional charges, retries, taxes and infrastructure. [Pricing details](https://ai.google.dev/gemini-api/docs/pricing)

### Historical project observations

Earlier project notes record approximately 10-16 seconds per image and approximately two minutes for one 15-image collection with three concurrent calls. A documented single-image run cost approximately $0.045 including its recorded token usage. These are small-sample observations, not an SLA or a cross-provider benchmark; they were not rerun during this update.

The application has a 100-second provider budget within a 120-second run-route timeout. Queuing, throttling, retrying and different prompts can change the time a user sees. Store token usage and duration with each result and use actual billing data for operational budgets.

## 5. Regional processing and operational constraints

- **Google:** the reviewed Nano Banana 2.1 Cloud specification lists only `global`. This implementation uses the Gemini API and has not established EU-only inference. An EU-hosted application or database does not change the model's processing location. [Model regions](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/nano-banana-2-1)
- **OpenAI:** the data-controls documentation lists European regional processing for the GPT Image 2.5 image-generation and editing endpoints. Non-US residency requires approved account controls and a Modified Retention amendment. Availability in documentation is not proof that this project's account is configured for it. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)
- **Other candidates:** regional inference and retention were not established for a specific endpoint in this review. Verify them before selecting a production route.
- **Execution policy:** stored model settings are untrusted. The service checks them against the current server policy before each provider call. Revoked settings fail instead of silently switching a stored snapshot to another model.
- **Budget control:** the current per-tenant attempt counter is not a guaranteed spending cap. User-writable counters, non-atomic checks and automatic retries require a protected accounting mechanism before relying on a public-demo budget limit.
- **Reproducibility:** a stored brief and configuration recover the intended process; they do not guarantee identical images, exact colours or perfect brand compliance.

## 6. Validation plan for a future model change

This is a proposed experiment, not completed evaluation work:

1. Select representative food-delivery and tourism briefs from the fictional demo clients. Keep required rules and user choices fixed.
2. Generate a small set per candidate at comparable output dimensions. Record the exact model ID, endpoint, size, quality, thinking settings, reference inputs and prompt-template version.
3. Measure end-to-end latency, failures, retries, token usage and actual cost. Compare the cost of an initial example plus 15 usable variations, not just one successful output.
4. Review subject accuracy, required-rule violations, palette treatment, style differences, consistency across the set and unwanted duplication. Use the same human-review rubric for each provider.
5. Test references as a separate variable. Do not compare one provider with references against another without them and attribute the difference solely to model quality.
6. Report sample sizes and examples. Five images are an exploratory check, not a statistically reliable benchmark. Set an explicit experiment budget before running paid comparisons.

For the current implementation, improving the brief and removing contradictory style defaults should be evaluated before assuming that changing the model will solve weak style differentiation.

## 7. Concise model-choice statement

> I selected Google's Nano Banana 2.1 through the Gemini API because the implemented adapter supports the required formats and the interactive generation workflow. The application combines the three context layers into a stored brief, keeps required brand rules intact and records prompts and model settings for traceability. Reference images and asynchronous Batch processing remain future experiments. Other providers are isolated behind the `ImageProvider` interface, but switching requires measured validation of quality, cost, latency and regional processing. The choice is based on this project's needs rather than a claim of universal model superiority.
