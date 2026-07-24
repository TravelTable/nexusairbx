# Production Firebase reliability root-cause report

## Scope and ownership

- Browser Firebase bootstrap and App Check: `src/firebase.js`, `src/lib/appCheck.js`
- Authenticated browser requests: `src/lib/billing.js`, with a second incomplete implementation in `src/lib/aiUtils.js`
- Studio status polling: `src/hooks/useStudioConnection.js`, `src/lib/studioBridgeApi.js`
- Backend request identity, App Check, auth, and Studio status: `backend/src/middleware/operationalTelemetry.js`, `backend/src/middleware/appCheck.js`, `backend/src/middleware/auth.js`, `backend/src/routes/studio.js`
- Firestore authorization: `firestore.rules`, exercised by `backend/src/firestore.rules.firestore.test.js`

## Confirmed failure chain

1. App Check token acquisition failures are converted to an empty header in `src/lib/appCheck.js`. The request is still sent. When backend enforcement is enabled, the backend correctly rejects that request, but the browser sees a later API failure instead of the original App Check failure.
2. Firebase bootstrap reports failed App Check acquisition as a successful readiness result with `available: false`. It has no explicit throttled state or client cooldown. This makes the reCAPTCHA exchange `403` and SDK throttle hard to distinguish from an intentionally unavailable provider.
3. Authenticated requests have two implementations. The shared request path attaches an ID token, App Check token, and request ID; the AI utility path attaches only an ID token. This produces endpoint-dependent security behavior.
4. `/api/studio/status` is a real authenticated route. A `500` is therefore a handler/dependency failure, not a missing route. Global request telemetry already provides a request ID, but the status handler does not translate known transient Firestore failures into a stable typed response.
5. Studio polling retains the last good snapshot, which is correct, but schedules another poll even after non-retryable authentication/App Check failures. That creates an unbounded terminal-error loop.
6. Firestore rules are least-privilege and intentionally require both ownership and a verified-email token claim for workspace writes. The current rules expression is valid. The production permission error must be diagnosed at the token-claim and exact generation-payload boundary; weakening the rules would hide the defect.
7. No `noFilter` route, request, symbol, or literal exists in current checked-in source. A browser request for it is therefore consistent with a stale deployed bundle, cached asset, extension/injected code, or malformed URL assembled outside the current source tree. The fix must reject malformed first-party API paths and add a regression test, not add a fake endpoint.

## Configuration risks

- The browser Firebase project configuration is checked into `src/firebase.js`, while App Check values come from environment variables. There is no single validation step that proves the browser project ID and app ID match the intended production project.
- Local App Check debug mode is restricted to development, but its configuration and state are not explicit enough to distinguish local debug, preview, production, unavailable, failed, and throttled operation.
- Firebase Admin initialization is singleton-guarded but owned by more than one backend module. This is not currently creating multiple default apps, but it makes project mismatch diagnosis harder.

## Repair strategy

- Make Firebase/App Check startup a validated state machine and expose one canonical Auth/Firestore/Functions/Storage instance set.
- Make first-party authenticated requests fail closed with typed App Check/auth errors, request IDs, safe URL validation, and no credential leakage to third-party origins.
- Bound all polling by time/attempts, honor `Retry-After`, use abort signals, and stop terminal status polling until an explicit refresh or authentication state change.
- Preserve the current Firestore privilege boundary and add generation-specific owner, cross-owner, unverified, and invalid-payload tests.
- Return typed status-route errors with correlation IDs and structured server logs while preserving existing global telemetry.
