# NexusRBX SEO and Retention Release Report

Date: 2026-06-26

## Features completed

- Added a lightweight experiment system in `src/lib/experiments.js` for:
  - `signup_gate`: `post_value_signup` default, optional `pre_value_signup`.
  - `generator_default`: `quick_script_default` default, optional `agent_build_default`.
  - `homepage_cta`: `generate_with_ai` default, optional `script_oriented`.
- Added operational controls:
  - Global kill switch: `REACT_APP_EXPERIMENTS_DISABLED=true`.
  - Per-experiment enable flags: `REACT_APP_EXPERIMENT_SIGNUP_GATE_ENABLED`, `REACT_APP_EXPERIMENT_GENERATOR_DEFAULT_ENABLED`, `REACT_APP_EXPERIMENT_HOMEPAGE_CTA_ENABLED`.
  - Local QA overrides through `localStorage` keys named `nexusrbx:experiments:force:<experiment_id>`.
- Attached experiment variants to central analytics client events and backend product analytics ingestion.
- Kept Quick Script as the default homepage path unless the prompt is clearly complex or the controlled Agent Build default variant is active.
- Protected complex requests from unsuitable experiment routing by forcing clear multi-file, DataStore, RemoteEvent, plugin, or system prompts to Agent Build.
- Added optional pre-value signup gating for the experiment only; the default anonymous path remains post-value signup.
- Removed unsupported public social-proof claims found in current public UI copy.
- Added focused tests for experiment assignment, homepage mode selection, analytics propagation, public routing, public raw HTML, icon sitemap quality, and builds.

## Routes tested

Automated local production-routing and raw-HTML tests covered:

- `/`
- Non-www `/`
- Non-www nested paths with query strings
- Valid public routes
- Valid authenticated app routes
- Unknown routes
- `/icons/:id` for qualified, thin, removed, and missing icons
- Marketplace filter URLs
- `/robots.txt`
- Sitemap output
- Search landing pages
- `/docs`

Live production URLs were not requested from the deployed domain in this pass.

## Event coverage

Experiment variants are added to browser events and server-confirmed events as:

- `experiment_signup_gate`
- `experiment_generator_default`
- `experiment_homepage_cta`
- `experiment_variant`

Primary metric mapping:

- Prompt start rate: `homepage_prompt_started`.
- Prompt submission rate: `homepage_prompt_submitted`, `landing_prompt_submitted`, `prompt_submitted`.
- Generation completion rate: server-confirmed `generation_completed`.
- Activation rate: derived from `generation_completed` plus output-use events such as copy/save/export.
- Signup completion: `signup_completed`.
- Output use: copy/export/save/Studio push events where emitted by the relevant workflow.
- D1/D7 retention: derived from return activity by authenticated user ID or anonymous ID where still valid.
- Studio connection: `studio_connection_completed`.
- Purchase conversion: server-confirmed `purchase_completed`.

Guardrail metric mapping:

- Generation failures: `generation_failed`.
- Latency: generation latency properties on generation events.
- Abuse: rate-limit and anonymous generation limit events.
- AI cost: requires backend/provider cost aggregation.
- Refunds: requires Stripe/refund event ingestion or dashboard reporting.
- Authentication errors: pending-auth and auth error instrumentation.
- Mobile conversion: dashboard segmentation by viewport/device is still required.
- User complaints: support/feedback source is still required.

## Experiment definitions

### Experiment A: signup timing

- Key: `signup_gate`
- Default: `post_value_signup`
- Variant: `pre_value_signup`
- Default behavior keeps the first useful anonymous Quick Script output visible.
- Pre-value signup is only active when enabled or forced for a controlled test.
- Signup prompts are not presented as generation progress.

### Experiment B: default generation mode

- Key: `generator_default`
- Default: `quick_script_default`
- Variant: `agent_build_default`
- Clear complex prompts override the variant and route to Agent Build.
- The experiment is suitable for high-intent but focused prompts, not obviously multi-file system requests.

### Experiment C: homepage CTA wording

- Key: `homepage_cta`
- Default: `generate_with_ai`
- Variant: `script_oriented`
- Variant CTA text: `Generate Roblox Script`.

## Social-proof evidence

Unsupported public claims removed or rewritten:

- `+5k` hero counter was replaced with a brand-neutral `RBX` badge.
- `Helping 5,000+ Roblox Developers` was replaced with capability-focused copy.
- `Join thousands of top Roblox developers today` was replaced with subscription value copy.
- `Browse thousands of professional, game-ready icons` was replaced with `Browse curated, game-ready icons`.

No reliable live source for public user counts, testimonial permission, generation totals, Studio push totals, or marketplace inventory claims was found in the inspected public UI copy. Those claims should only be reintroduced when backed by one of:

- Server-confirmed product analytics aggregates.
- Auth provider/user database aggregates that exclude private content.
- Verified testimonial records with permission.
- Qualified public icon inventory counts from the indexability pipeline.
- Verified Discord or GitHub API data.

Fallback copy now describes product utility without invented counts, ratings, testimonials, or guaranteed outcomes.

## Performance measurements

Measured during `npm run build`:

- CRA build completed successfully.
- CRA main bundle: `180.39 kB` gzip, reported as `+1.29 kB`.
- CRA main CSS: `15.61 kB` gzip.
- Largest CRA chunk reported: `241.34 kB` gzip.
- Next public frontend build compiled and generated `3313` static pages.
- Next public routes generated included `/`, `/docs`, five search landing paths under `/[slug]`, and `3304+` icon paths under `/icons/[id]`.

Core Web Vitals, generation latency, server response latency, image loading, and font loading were not measured against a deployed preview in this pass.

## Known limitations

- Browser-based mobile journey, OAuth return, signup handoff, Studio push, and payment/refund paths were not exercised live in this pass.
- Public CTA experiment assignment currently relies on the shared client experiment helper. Default markup is stable; fully server-assigned public CTA variants would require a cookie or edge/server assignment layer.
- Refund and user-complaint guardrails need external data sources or dashboard wiring.
- GA4 dashboard definitions still need to be created outside the codebase.
- Search Console resubmission requires access to the production property.

## Rollback steps

1. Set `REACT_APP_EXPERIMENTS_DISABLED=true` and redeploy to disable all experiment variants.
2. Remove any per-experiment enable flags from production if a narrower rollback is desired.
3. If analytics ingestion is affected, revert the experiment header propagation in client analytics and backend product analytics.
4. If the CTA copy experiment creates confusion, keep the default `generate_with_ai` variant while leaving the framework disabled.

## Manual deployment steps

1. Confirm production environment variables:
   - `REACT_APP_EXPERIMENTS_DISABLED`
   - `REACT_APP_EXPERIMENT_SIGNUP_GATE_ENABLED`
   - `REACT_APP_EXPERIMENT_GENERATOR_DEFAULT_ENABLED`
   - `REACT_APP_EXPERIMENT_HOMEPAGE_CTA_ENABLED`
2. Deploy a preview build.
3. Smoke-test homepage prompt, `/ai`, auth callbacks, sitemap, robots, icon detail pages, and landing prompts in preview.
4. Promote to production only after preview routing and auth callbacks are confirmed.
5. Monitor generation failures, auth errors, and signup/dropoff events immediately after release.

## Search Console resubmission steps

1. Inspect `https://www.nexusrbx.com/` and representative landing/icon URLs.
2. Submit the preferred sitemap URL on the `www` property.
3. Validate that non-www URLs redirect to `https://www.nexusrbx.com`.
4. Request reindexing for the homepage, representative landing pages, docs, marketplace, and qualified icon pages.
5. Monitor duplicate-host, canonical, excluded-by-noindex, and not-found reports.

## GA4 dashboard setup still required

Create dashboard views for:

- Experiment variant comparisons.
- Prompt start to generation completion funnel.
- Anonymous output viewed to signup completion.
- Output use after first generation.
- D1 and D7 return activity.
- Studio connection and push conversion.
- Mobile-only activation funnel.
- Guardrails: failures, latency, auth errors, refunds, abuse, and cost.

## Recommended post-release monitoring

- Compare activation and signup completion by experiment variant.
- Watch generation failures and latency before increasing traffic to non-default variants.
- Monitor anonymous generation rate limits for abuse spikes.
- Confirm no prompt text, generated code, emails, or private project names appear in analytics.
- Review Search Console coverage for non-www redirects, canonical host consistency, and thin icon exclusions.
- Sample support messages for confusion around signup prompts, Quick Script versus Agent Build, and Studio export.

## Verification results

Commands run:

```bash
PATH=/usr/local/bin:$PATH npm test -- --watchAll=false --runTestsByPath src/lib/experiments.test.js src/lib/homepageActivation.test.js src/lib/productAnalytics.test.js
cd backend && PATH=/usr/local/bin:$PATH node --test src/lib/productAnalytics.test.js
cd backend && PATH=/usr/local/bin:$PATH node --check src/lib/productAnalytics.js
PATH=/usr/local/bin:$PATH npm run test:production-routing
PATH=/usr/local/bin:$PATH npm run test:public-frontend
PATH=/usr/local/bin:$PATH npm run build
```

Observed results:

- Frontend focused tests: `3` suites passed, `20` tests passed.
- Backend analytics tests: `5` tests passed.
- Backend product analytics syntax check: passed.
- Production routing tests: `15` tests passed.
- Public frontend raw-HTML/sitemap tests: `12` tests passed.
- Production build: passed.
- Build warning: Browserslist `caniuse-lite` data is 10 months old.
