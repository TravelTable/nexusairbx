# Guided Launch

Guided Launch begins at `/onboarding` after a genuinely new signup and email verification. The existing Roblox OAuth requirement remains server-owned; the idea screen is accessible before linking, while existing gated product routes retain their connection requirement. Existing users can opt in from the empty workspace or Settings → Support & diagnostics → Open Guided Launch.

## State and handoff

`GET /api/onboarding` returns `{ progress: null }` for users who have not started. `POST /api/onboarding` idempotently enrolls the authenticated account, including before email verification. `PATCH /api/onboarding`, `POST /api/onboarding/restart`, and `POST /api/onboarding/workspace` require verified email. Workspace creation additionally checks live Roblox authorization.

Progress is stored in `users/{uid}/meta/guidedLaunch`: version, revision, launch ID, idea, return path, stage, Studio setup step, new/existing place preference, dismissed state, project/chat/task references, and the receipt ignored after reporting a failed playtest. It does not grant any permission or attest to a live connection. Patches require the current revision; conflicts ask the user to reload instead of overwriting another tab. Unsaved idea edits have an account-scoped browser draft until Continue or Save and leave persists them to the server.

The workspace endpoint uses a stable project ID and conversation ID. A lost response or repeated click reopens the same draft conversation in Plan mode. It does not submit a generation, write to Studio, or publish anything. The first milestone is requested through the existing submit coordinator with a stable operation ID. A `launch` query parameter prevents older pre-signup generation intents and pending actions from auto-running during the guide. The matching source request is consumed only after the durable conversation exists, so it cannot replay when leaving the guide. Unrelated gated actions remain available outside the guided conversation.

The accepted plan uses the existing execution and approval machinery. The checklist distinguishes generated output, a terminal acknowledged Studio mutation, and a manual user-confirmed playtest. A later failed/unfinished run or a changed Studio session cannot confirm an earlier success. Reporting a problem invalidates that receipt and prepares a Debug message in the same conversation.

## Assets and recovery

The setup uses written instructions and a conceptual block illustration. Existing `StudioSetupVisual` references are used only when marked available; no verified Studio screenshots are currently supplied in this repository. Add verified screenshots and enable their availability flags to show them. Image failures retain the written steps. Pairing codes stay in memory and are never stored in progress or analytics.

Settings opens saved progress and offers a new guided creation once a conversation exists. Restart leaves previous projects and conversations intact. OAuth cancellation, save failures, expired pairing codes, plugin readiness issues, and changing places retain the idea and offer local recovery actions. Mobile users can save their idea and resume on desktop.

## Validation

- Backend service tests cover per-user enrollment, stale revisions, rejected inputs, pause, restart preservation, and concurrent/replayed workspace creation.
- Frontend tests cover auth guards, idea entry, OAuth/save ordering and recovery, pairing expiry, live readiness, resume, write evidence, manual confirmation, changed places, and repair invalidation.
- Production routing explicitly treats `/onboarding` as an authenticated SPA route, including Vercel refreshes.
- Before release, verify a new email/provider signup, fresh baseplate pairing, accepted first build, manual Studio Play, and a repair. Plugin-only sessions must not claim automated Play support. Actual Studio execution needs Roblox Studio and a compatible connected plugin.

The API must be restarted/deployed with the frontend. An older running backend returns 404 for the new progress endpoints.
