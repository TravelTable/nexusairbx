# Financial and marketing v2 — staged implementation

Status: implemented locally behind enrolment/Team/tax flags; **not approved for production launch**. No Stripe resources or live subscribers were changed. The Stripe connector returned UNAUTHORIZED and requires reauthentication.

## Implemented

- Canonical customer catalog: Free 1.5 credits / rolling 30 days, Pro USD 14.99 / 152.90 with 9 monthly credits, Team USD 24.99 / 254.90 per seat with 15 monthly pooled credits. Pro is recommended; Starter/Pro+ remain legacy-only.
- Canonical source is src/data/billingCatalog.v2.json. backend/shared/billingCatalog.v2.json is its packaged copy because backend is a separate repository. The parity test must pass in releases containing both repositories.
- Transactional integer-microcredit wallet, reservation, settlement, release, included-first spending, non-expiring purchased credits, request/scope idempotency, immutable settlements and purchase entries. One credit is 1,000,000 microcredits. Provider USD micros × 3 = charged microcredits.
- Annual billing and monthly anniversary windows are independent. Month-end anchors clamp February without drifting later months. Webhook updates do not reset the wallet. Prior legacy usage is preserved within the same usage window.
- Seven-day v2 past-due grace, cancellation through paid period end, fallback to Free. Purchased credits can fund Free Auto once Free's included allowance is exhausted.
- Original reservation scope is retained for settling in-flight requests after subscription or membership changes.
- Team invitations with email-bound acceptance, owner/admin/member roles, removal, seat floor enforcement including outstanding invitations, pooled wallet, backend-owned project billing bindings, separate Team Stripe customers, Team management panel.
- Strict v2 Checkout input, server-derived prices/quantities, random stable-on-retry integration_identifier, dynamic payment methods, no trial, controlled promotion flag, optional tax only under a separate flag.
- Scope-level subscription checkout locking prevents a second tab or Team admin from opening another subscription session for one hour. Uncertain Stripe responses retain the lock and must be retried with the same idempotency key. Cancellation supports direct v2 billing records, with webhook-confirmed access changes.
- Central Stripe client upgraded to SDK 22.4.0 / API 2026-07-29.dahlia. Mounted webhook supports signed deduplicated events, current subscription retrieval, newer item-level periods, asynchronous payment completion, refund/dispute review holds.
- Credit-pack liability is recorded separately from billings. Weighted-average carrying value is released as purchased credits are consumed.
- Daily/monthly JSON/CSV export joins Stripe invoices and actual balance transactions to credit settlements; records source-currency balances separately and does not invent FX conversion. Coverage/refund/FX gaps mark reports needs_review.
- Read-only configuration/reconciliation audit command reports missing price maps, stale reconciliation/model pricing, free acquisition budget and report margin alerts.
- Three-card public pricing, credit explainer, revised homepage promise/FAQ/pricing, concise subscribe review, account billing ledger, credit-aware workspace meter, retired Starter purchase promotion, server-confirmed purchase/settlement/cancellation events.
- Existing product footage is retained; videos no longer autoplay. No fabricated customer statistics, testimonials or run evidence were introduced.

## Important remaining release work

1. Reauthenticate Stripe; inspect live and sandbox catalog, Portal configurations, active subscriptions and Australian Tax setup.
2. Run real Stripe test clocks and signed webhook replay for renewals, annual windows, out-of-order events, delayed payments, subscription migrations and tax. Unit tests do not replace these.
3. Run true concurrent-reservation tests against the Firestore emulator and verify rules deny browser writes to every wallet, ledger and private collection. Unit fakes cover arithmetic/state transitions but do not reproduce Firestore contention.
4. Validate every AI entry point and background-worker project binding with real personal and Team users. Team billing assignment does not itself migrate/share a project's files. Team public cards intentionally remain “coming soon”; do not enable Team until this review and the full invitation/seat/payment flow pass.
5. Verify quote coverage across all AI entry points. POST /api/billing/estimate and the main agent composer show starting estimates, scope/source and confirmation for expensive/Premium/purchased usage. Guided launch and specialized creation entry points still need equivalent confirmation coverage. Quotes are starting estimates, not a cap on multi-step builds.
6. Refunds/disputes currently freeze purchased-credit spending and create a private review alert. Automatic proportional reversal of consumed/unconsumed credit lots, tax allocation, dispute resolution and unfreezing require a reviewed adjustment workflow. Do not treat these reports as finalized while alerts remain.
7. Reconcile legacy opening balances, every paid provider-cost path, supplier invoices and historical subscriptions. MRR is explicitly a current undiscounted run-rate snapshot, not historical/net-discounted MRR. Confirm management-accounting conventions before clearing coverage flags.
8. Add a verified single-request proof capture covering planning, inspection, changed files, apply and playtest evidence. Current footage is real existing footage, not a newly verified full build trace.
9. Complete authenticated browser QA of billing/subscribe/Team, keyboard-only, forced colors and reduced motion in all supported viewports. Local pricing screenshots cover phone/tablet/desktop and CSS 200% zoom.
10. After sandbox parity, disable duplicate Firebase extension/legacy webhook processing. Old source paths remain deliberately intact until that external parity check.
11. Review dependency audit findings separately before deployment. Backend historically tracks node_modules; package installation updates generated dependency files as well as its lockfile. Keep both repository releases coordinated.

## Private commands

Run backend commands from backend with a secret-manager-provided restricted key.

- node scripts/setupBillingV2Sandbox.js — inspect / dry-run; --apply provisions sandbox-only Products/Prices idempotently. It rejects live keys.
- node scripts/migratePremiumCredits.js --uid=USER — dry-run. Add --team=TEAM for a named Team scope; --apply migrates that one scope.
- node scripts/migrateSubscriberRenewals.js — dry-run eligibility report. --subscription=sub_ID --apply schedules an eligible existing price reduction at renewal, without current-period proration. Existing schedules, trials, discounts, tax, cheaper prices and unbound legacy Teams require individual review.
- node scripts/exportFinancials.js --from=2026-08-01 --to=2026-09-01 — private JSON on stdout. --format=csv --granularity=monthly gives monthly CSV; default CSV is daily.
- node scripts/exportFinancials.js --from=... --to=... --overhead=PRIVATE_JSON — optional nonnegative USD values for hosting, storage, support and contractors.
- node scripts/auditBillingV2.js --report=PRIVATE_REPORT_JSON — checks report freshness and configuration. Use a trailing 30-day report for margin alerts. Exit 2 means needs review, not success.

No export is automatically published. Scripts do not send invoices, refund payments, or email invitations. Invitation links must be shared privately with the specified recipient.

## Migration invariants

At the original 1.5× Premium Balance multiplier, one old balance dollar becomes two Nexus Credits: both represent the same provider buying power at the new 3× multiplier. The original monetary amount remains recorded as liability; it is not written down. Rehearse while old reservations are drained. Review separately if the deployed legacy multiplier differs from 1.5×. Migration is one-time and append-only; never run by clearing the migration marker.

Future membership changes must not rewrite _project_billing_scopes directly from the browser. The server verifies project ownership and Team role when assigning billing. It revalidates membership before authorizing new work; settlement uses the original reservation scope.

## Rollout order

Keep NEXUSRBX_CATALOG_VERSION=v1, Team disabled and tax disabled until the relevant gates pass. Then: sandbox setup → migration rehearsal → test clocks/replay → complete reconciliation → renewal migration dry run → marketing preview → staged production enrolment. Keep existing v2 wallets/subscriptions intact during rollback; disabling new checkout is not a ledger rollback.

Create a dedicated Team Portal configuration with subscription updates/quantity changes disabled. Nexus enforces assigned seats; Stripe Portal handles payment details, invoices and cancellation. Do not enable automatic_tax until head office and required registrations are verified; use tax-exclusive Prices and the canonical SaaS tax code selected from Stripe Tax Codes.

## Local verification

- 52 focused backend tests pass, covering catalog arithmetic, reservation/settlement/release, idempotency, preserved webhook windows, grace, migration, Team permissions/seats, financial reports, Free/purchased usage and checkout retry locking. These use test doubles, not live Stripe or Firestore contention. All 23 selected backend syntax checks pass.
- 54 focused frontend tests pass, covering billing, subscribe review, checkout intents, homepage, composer and expensive-quote confirmation/failure handling.
- React production build and Next static export succeed.
- Catalog parity passes. Public HTML plus parity: 22 of 23 checks pass; the remaining header test expects favicon-transparent.png while the current header renders favicon.png. The header asset itself was not changed by this billing implementation.
- Pricing was visually inspected at 390, 768 and 1280 pixel viewport widths, with annual selection and CSS 200% zoom. Screenshots are in artifacts/financial-pricing-*.png. Authenticated and assistive-technology checks remain open above.
