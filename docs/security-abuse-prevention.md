# Production security and abuse-prevention rollout

## Scope and current status

This repository is a CRA browser client and a separately deployed Express API. The
browser authenticates directly with Firebase Authentication. The API uses Firebase
Admin, Firestore, Stripe, OpenAI-compatible model providers, and the Roblox Studio
bridge. No Cloud Functions source is present in this repository; the Firebase Stripe
Payments extension is an independently deployed extension.

The controls in this change are intentionally staged. App Check and the backend
begin in **monitor** mode. Do not enable Firebase App Check enforcement or set
`APP_CHECK_MODE=enforce` until the deployed client has generated valid traffic and
the verification metrics below are healthy.

## Confirmed abuse paths before this change

1. Password and OAuth sign-up were direct browser Firebase Auth calls. New accounts
   were sent toward subscription flow without an email-verification requirement.
2. `/api/checkout` and portal endpoints accepted a valid Firebase ID token from an
   unverified user and had no route-specific durable limit. `getOrCreateStripeCustomer`
   used a read-then-create sequence, so concurrent calls could create more than one
   Stripe customer before the Firestore document was updated.
3. A deployed Firebase Stripe Payments extension can invoke
   `ext-firestore-stripe-payments-createCustomer` when a document is created under
   its configured customer collection. A registration burst followed by automated
   payment-flow/document creation therefore plausibly produced the July invocation
   burst. Confirm the deployed extension's exact document path and event trigger in
   Firebase Console; its configuration is not stored in this repository.
4. Sensitive route limits were process-local, so separate serverless instances did
   not share counters. Express also had no verified proxy-trust policy.
5. The prior Firestore rules allowed an owner to write arbitrary fields below their
   own user document, including fields that look like billing, entitlement, role, or
   usage state.

## Enforced application controls

### App Check

- `src/firebase.js` creates one Firebase App Check instance only in an actual browser,
  never in tests or Node.js. It uses the public
  `REACT_APP_RECAPTCHA_SITE_KEY` and automatic token refresh.
- `src/lib/appCheck.js` attaches the token only to requests to the configured NexusRBX
  backend. It does not send the token to Stripe, Roblox, Firebase, or arbitrary third
  parties.
- The Express middleware verifies `X-Firebase-AppCheck` through Firebase Admin.
  `APP_CHECK_MODE=monitor` records missing/invalid tokens without blocking; setting
  `APP_CHECK_MODE=enforce` returns `401` for a missing token and `403` for an invalid
  token. The Stripe webhook is deliberately exempt because Stripe signature
  verification is its authentication mechanism. Paired Studio-plugin protocol
  endpoints are exempt because they use their own pairing-session credential rather
  than a browser Firebase App Check token. The two SSE endpoints are also exempt
  because browser `EventSource` cannot send a custom header; each requires a
  short-lived server-minted stream session that is issued only after App Check and
  Firebase ID-token verification.
- A debug token can only be set by the browser client when `NODE_ENV=development` and
  `REACT_APP_APP_CHECK_DEBUG_TOKEN` is explicitly supplied. It is not enabled in
  production.

There are no `onCall` Firebase Functions in this repository to configure with
`enforceAppCheck`. Any separately deployed callable Functions require their own
source/configuration change.

### Identity and costly actions

- Password/OAuth sign-up sends a verification email and takes an unverified account
  to `/verify-email`.
- The resend screen first reserves a durable server-side allowance, then invokes
  Firebase Auth's browser email send. It gives a 60-second UI cooldown. The server
  enforces three requests per authenticated UID per hour for the reservation endpoint.
- The backend checks the Firebase ID-token `email_verified` claim before checkout,
  portal, sensitive AI/UI generation, Roblox OAuth and uploads, model-file uploads,
  and protected Studio mutations. This is server enforcement, not a hidden button.
- Firebase Auth registration, login, password-reset, and the actual Firebase email
  delivery remain direct Firebase SDK operations. A browser-side limiter cannot
  protect them; enable Firebase Auth App Check enforcement and monitor Firebase's
  native quotas before treating them as protected.

### Stripe

- A Stripe customer is now created only after a verified user deliberately starts
  checkout or opens the portal. Registration itself does not write a customer record.
- The creation request uses Stripe's customer idempotency key
  `nexusrbx-customer-<uid>` and preserves an existing `customers/{uid}` document.
  Checkout/portal session requests require a validated idempotency key. Checkout
  retries retain the same browser-generated key for 30 minutes, while the API binds
  it to the Firebase UID and operation before passing it to Stripe. Client payloads
  are allowlisted and prices are selected by the server.
- Checkout and portal require a verified Firebase token and their own durable limit.
- Webhooks still use raw-body Stripe signature verification. Event IDs are claimed
  transactionally in `_stripe_webhook_events` before side effects, are marked
  completed only after processing, and carry a 90-day `expiresAt` for Firestore TTL.
  Missing/invalid signatures return `400`; unsupported event types are safely
  acknowledged without changing entitlements.
- No production Stripe extension configuration was altered. Existing customer and
  subscription documents remain intact.

### Durable limits, temporary blocks, and uploads

Rate-limit counters and temporary-block lookups use a shared Redis store, not Firestore
or process memory. Keys are HMAC-hashed with `SECURITY_RATE_LIMIT_HMAC_KEY`; production
fails closed if that private key or `REDIS_URL` is absent, or if Redis is unavailable.
Limit events return `429` with `Retry-After`, generic text, and a structured event
containing a subject hash only. Firestore retains temporary-block audit records only;
it is not read on public request paths.

| Action | Default | Key |
| --- | --- | --- |
| General API | 100 per 15 minutes | IP |
| Authenticated API | 10 per minute | UID |
| Verification-email reservation | 3 per hour | UID |
| Checkout | 5 per 10 minutes | UID + IP |
| Customer portal | 5 per 10 minutes | UID + IP |
| AI burst | 6 per minute | UID + IP |
| Studio mutation | 30 per minute | UID + project + IP |
| Roblox decal upload | 4 per minute | UID + IP |
| Creator Store import | 10 per minute | UID + IP |
| Quick script generation | 6 per minute | UID + IP |
| Read API | 600 per minute | UID |
| Public proxy | 240 per minute | IP |
| Client log | 30 per minute | IP |

All limits are adjustable only through validated server environment variables; the
security-relevant defaults are in `backend/.env.example`. Registration and login do
not have Express limits because they do not pass through Express. Firebase Auth's
native signup-per-IP quota is a required console-side control.

Express leaves `trust proxy` disabled unless `TRUSTED_PROXY_HOPS` is set to a verified
numeric hop count. `req.ip` is therefore not derived from arbitrary
`X-Forwarded-For` input by default. Do not set this value from a guess: first confirm
the actual deployment proxy chain. The supplied test covers a spoofed forwarding
header when proxy trust remains off.

For incident response, an authenticated Firebase admin can create, list, and remove
temporary backend blocks at `/api/security/blocks`. Each block is HMAC-addressed,
stores an audit reason and expiry (60 seconds to seven days), and applies only to
costly backend routes. It is not an edge firewall and is limited by VPNs, IPv6,
proxies, shared networks, and the quality of observed client IPs.

Roblox decal uploads now require a verified user, accept a maximum 20 MiB per file and
100 MiB declared aggregate request size, and are rate-limited before Multer buffers
the body. Chunked requests without a valid `Content-Length` are intentionally rejected
for this sensitive path. Existing image type/signature checks remain in place.

### Rules and data access

`firestore.rules` is default-deny. It makes the root user document server-managed,
gives owners narrow validated access to specified chat/script documents, blocks
client-written admin/role/billing/subscription/Stripe/usage/entitlement fields, and
does not allow client payment/job creation. Customers and extension child documents
are owner-read-only. Firebase Admin and the Stripe extension continue to bypass client
rules as intended. `storage.rules` is default-deny; there is no broad direct browser
Storage upload rule in this repository.

## Required manual rollout

1. **Deploy the browser client first.** Set the public
   `REACT_APP_RECAPTCHA_SITE_KEY` in the frontend deployment environment. It is a
   reCAPTCHA v3 *site key*, not a secret. Do not add a reCAPTCHA secret, Firebase
   service account, or Stripe credential to the browser build.
2. **Configure Firebase App Check.** Register the web app's reCAPTCHA v3 provider in
   Firebase Console, keep API enforcement off initially, and add only approved local
   development debug tokens. Observe valid and invalid requests. Then enable
   enforcement separately for Firebase Authentication, Firestore, and Storage where
   supported; no console enforcement is changed by this code.
3. **Deploy the API in monitor mode.** Set a unique production
   `SECURITY_RATE_LIMIT_HMAC_KEY` (32+ random characters), set `REDIS_URL` to the
   managed shared Redis endpoint, and leave
   `APP_CHECK_MODE=monitor`. Confirm the exact public proxy chain before setting
   `TRUSTED_PROXY_HOPS`; leave it blank otherwise.
4. **Create Firestore TTL policies.** Configure TTL for
   `_security_blocks.expiresAt` and `_stripe_webhook_events.expiresAt`. Review Firestore indexes required for the
   admin block list (`expiresAt` ascending) before using it in production.
5. **Deploy rules deliberately.** Test Firestore/Storage rules in an emulator against
   real client flows, then deploy the root rules configuration. Check the Firebase
   Stripe Payments extension documentation/configuration so its service account keeps
   required Admin access and its trigger is not an unintended registration side effect.
6. **Turn on backend App Check enforcement.** Only after valid traffic, local debug
   configuration, signup/login, email verification, checkout/portal, AI, upload, and
   Studio flows are confirmed, set `APP_CHECK_MODE=enforce`. Keep a documented
   rollback path to `monitor`.
7. **Monitor for 7–14 days before Firebase product enforcement.** Watch valid App
   Check requests, rejected tokens, `429`s, checkout creation, Stripe customer
   creation, webhook failures, AI job/cost usage, and legitimate user failures.
8. **Enable Firebase product enforcement in stages.** Start with the lowest-risk
   product after metrics look healthy, retain a rollback window, and do not enforce
   Auth/Firestore/Storage simultaneously without a tested recovery plan.

## Console and infrastructure work still required

### Firebase Console

- Register/verify the reCAPTCHA v3 App Check provider and eventually enforce App
  Check for Firebase Auth, Firestore, and Storage after monitoring.
- Review Firebase Auth's signup-per-IP quota and abuse settings. Direct Auth flows
  cannot be protected by the Express limiter.
- Inspect the deployed Firebase Stripe Payments extension version and its customer
  document trigger. Preserve paid-user documents and verify that only an intentional
  payment flow can create the configured customer document.
- Configure TTL policies and required indexes. Run the Firestore emulator rule suite
  in CI with an installed Java runtime.

### Google Cloud Console

The repository indicates a static Vercel client and an Express service with Railway
environment detection. It does not declare a Google external Application Load
Balancer, Cloud Run service behind one, or another Cloud Armor-compatible backend.
Cloud Armor is therefore **not currently verified as usable** for this deployment.

If the API is later placed behind a supported Google external load balancer, create
Cloud Armor rules in preview/log-only mode first: a route-specific rate rule with a
temporary ban for repeated violations, an expiration/review process, and a narrowly
scoped emergency IP/CIDR deny procedure. Do not introduce country-wide blocks by
default. Until then, use the application temporary blocklist for confirmed incidents;
it cannot defend the static frontend or direct Firebase Auth traffic at the edge.

Create Cloud Monitoring alerts for registrations per five minutes, Stripe extension
create-customer invocations per five minutes, function/API invocations per route,
invalid App Check events, `429` responses, webhook signature failures, and AI jobs
plus estimated cost. Set billing budget alerts as an early warning only: they are not
hard spend caps.

### Stripe Console

- Confirm the production webhook endpoint and signing secret match the deployed API.
- Restrict the webhook to required event types and review replay delivery in Stripe's
  event log; the API's event-ID records provide idempotency.
- Review the Firebase Stripe Payments extension's Stripe API permissions and webhook
  configuration. Do not uninstall or reconfigure the extension during this rollout
  without a migration plan for existing customers/subscriptions.

## Rollback and remaining risks

Rollback backend App Check enforcement by setting `APP_CHECK_MODE=monitor`; do not
remove the client token. Roll back a temporary block through the admin endpoint.
Individual rate limits can be raised through their server environment variables, but
first inspect the structured `security.rate_limited` event and confirm it is legitimate
traffic. Preserve the webhook idempotency records during rollback.

Remaining risks include direct Firebase Auth abuse before Firebase Console enforcement,
unverified external Stripe extension configuration, no edge firewall at the current
hosting topology, and legacy endpoints that still need a broader schema-validation
pass. Existing AI plan/usage checks and the new burst limiter protect costly paths, but
per-model output ceilings, concurrency caps, and idempotency must continue to be
audited for every legacy generation/job route before making stronger cost guarantees.
