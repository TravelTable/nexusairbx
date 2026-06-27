# NexusRBX Product Analytics Funnel

## Events

All product events flow through `src/lib/productAnalytics.js` on the browser and `backend/src/lib/productAnalytics.js` on trusted server paths. Components must not call analytics providers directly.

| Event | Trigger condition | Source |
| --- | --- | --- |
| `landing_page_view` | Homepage or landing route first renders. | Browser |
| `homepage_prompt_started` | Visitor first types a non-empty homepage prompt. | Browser |
| `homepage_prompt_submitted` | Visitor submits the homepage prompt and a generation intent is attempted. | Browser |
| `ai_workspace_viewed` | AI workspace first renders. | Browser |
| `generation_intent_created` | Homepage prompt is stored as a resumable intent. | Browser |
| `generation_intent_restored` | AI workspace restores an intent from navigation or session storage. | Browser |
| `signin_nudge_viewed` | Anonymous user attempts a gated AI action. | Browser |
| `signup_started` | User starts password, Google, or GitHub signup. | Browser |
| `signup_completed` | Firebase returns a completed signup credential. | Browser |
| `pending_action_restored` | Auth completes and a stored gated action is restored in the original workspace. | Browser |
| `pending_action_completed` | A restored pending action is completed or safely resolved once. | Browser |
| `pending_action_expired` | A stored auth action expires before completion and the workspace shows recovery. | Browser |
| `anonymous_project_claimed` | An anonymous Quick Script/project record is associated with the authenticated account. | Browser-confirmed |
| `prompt_submitted` | Authenticated workspace prompt is submitted. | Browser |
| `clarification_requested` | Orchestration asks the user for clarification. | Browser |
| `plan_displayed` | A generation plan card is shown. | Browser |
| `plan_approved` | User approves a plan. | Browser |
| `generation_started` | Backend creates an artifact generation job. | Server-confirmed |
| `generation_completed` | Artifact worker records a successful terminal job result. | Server-confirmed |
| `generation_failed` | Artifact worker records a terminal failure. | Server-confirmed |
| `anonymous_generation_limit_reached` | Anonymous Quick Script quota/rate protection blocks another generation. | Server-confirmed |
| `quick_script_upgrade_recommended` | Quick Script deterministic assessment recommends Agent Build for a complex prompt. | Server-confirmed |
| `code_copied` | User copies an artifact file, full artifact, or Studio loader. | Browser |
| `artifact_downloaded` | User downloads a file, placement ZIP, or Rojo ZIP. | Browser |
| `project_saved` | User saves a script/artifact into the workspace library. | Browser |
| `studio_connection_started` | Authenticated user creates a Studio pairing code. | Server-confirmed |
| `studio_connection_completed` | Studio plugin successfully claims a pairing code. | Server-confirmed |
| `artifact_pushed_to_studio` | Studio plugin acknowledges a successful artifact apply command. | Server-confirmed |
| `subscription_viewed` | Billing or subscription page first renders. | Browser |
| `checkout_started` | Backend creates a Stripe/Firebase extension checkout session. | Server-confirmed |
| `purchase_completed` | Stripe webhook confirms checkout completion. | Server-confirmed |

## Properties

Standard properties are attached where available:

- `landing_page`
- `landing_page_category`
- `referrer_category`
- `device_category`
- `country`
- `new_or_returning`
- `authenticated`
- `anonymous_user_id`
- `anonymous_session_id`
- `generator_mode`
- `output_type`
- `prompt_category`
- `generation_latency_ms`
- `error_category`
- `subscription_plan`
- `experiment_variant`
- `deployment_version`

Event-specific properties may include safe scalar metadata such as `method`, `attachment_count`, `file_count`, `download_type`, `job_id`, `command_id`, `checkout_session_id`, `stripe_event_id`, `billing_interval`, `plugin_version`, and `protocol_version`.

## Anonymous And Authenticated Identity Behaviour

- Browser analytics generates a random `anon_*` user ID in `localStorage`.
- Browser analytics generates a random `sess_*` session ID in `sessionStorage`, rotating after 30 minutes.
- The IDs are random only. NexusRBX does not fingerprint users.
- Authenticated API requests include anonymous IDs in `X-Nexus-Anonymous-User-Id` and `X-Nexus-Anonymous-Session-Id`.
- On login/signup, Firebase Analytics receives the authenticated user ID when available and the local debug inspector records an `identity_linked` diagnostic entry.
- Server-confirmed events store authenticated `user_id` when the route or webhook can trust it, plus anonymous IDs when safely supplied by the browser request.

## Activation Definition

A user is activated when both conditions are true:

1. `generation_completed`
2. At least one of `code_copied`, `artifact_downloaded`, `project_saved`, or `artifact_pushed_to_studio`

Recommended report logic: group by authenticated user ID when available, otherwise anonymous user/session ID. Attribute activation to the earliest qualifying completion/action pair.

## D1 And D7 Retention Definitions

- D1 retention: a user with any meaningful product event on the calendar day after their first `landing_page_view`, `signup_completed`, or `generation_completed`.
- D7 retention: a user with any meaningful product event on days 7 through 13 after their first `landing_page_view`, `signup_completed`, or `generation_completed`.
- Meaningful product events exclude diagnostic-only events and passive page reload duplicates. Recommended events: `ai_workspace_viewed`, `prompt_submitted`, `generation_started`, `generation_completed`, `code_copied`, `artifact_downloaded`, `project_saved`, `artifact_pushed_to_studio`, `subscription_viewed`, `checkout_started`, `purchase_completed`.

## Funnel Reports

Create these in GA4 or the current provider:

- SEO landing conversion: `landing_page_view` filtered by `referrer_category=search` -> `homepage_prompt_started` -> `homepage_prompt_submitted` -> `generation_intent_created` -> `ai_workspace_viewed`.
- Anonymous-to-signup: `landing_page_view` -> `signin_nudge_viewed` -> `signup_started` -> `signup_completed`.
- Workspace creation: `prompt_submitted` -> `plan_displayed` -> `plan_approved` -> `generation_started` -> `generation_completed`.
- Activation: `generation_completed` -> any activation action.
- Studio value: `studio_connection_started` -> `studio_connection_completed` -> `artifact_pushed_to_studio`.
- Revenue: `subscription_viewed` -> `checkout_started` -> `purchase_completed`.
- Failure recovery: `generation_failed` segmented by `error_category`, followed by another `generation_started` within 24 hours.

Manual provider configuration still required:

- Register custom dimensions for the standard properties above.
- If GA4 is used as the primary reporting surface, export or forward server-confirmed Firestore analytics events into GA4/BigQuery.
- Build activation and retention audiences from the definitions in this document.

## Privacy Exclusions

Never include prompt text, generated code, source content, emails, passwords, auth tokens, secrets, project names, or artifact titles in event payloads.

Prompt analytics use `prompt_category` and `prompt_length` only. Country may only come from infrastructure headers such as Vercel or Cloudflare country codes. Analytics respects local opt-out and browser Do Not Track for provider delivery. Local debug inspection remains on-device only.

## Local Inspection And Debugging

Enable debug mode with `?analytics_debug=1` or:

```js
window.nexusAnalytics.debug(true)
```

Inspect local events without sending provider analytics:

```js
window.nexusAnalytics.events()
window.nexusAnalytics.context()
```

Disable provider delivery:

```js
window.nexusAnalytics.optOut(true)
```

Server-confirmed events are written to Firestore collection `_productAnalyticsEvents`. Normal browser calls reject `generation_completed`, `artifact_pushed_to_studio`, and `purchase_completed`; these must originate from trusted backend worker, Studio ACK, or Stripe webhook paths.
