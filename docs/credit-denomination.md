# Nexus Credit display denomination

The `nexus-credits-v1` presentation denomination is defined in the shared billing catalog. One displayed Nexus Credit represents **9,000 canonical wallet microcredits**, equivalent to 3,000 provider USD micros under the existing 3× credit-charge rule. Pro's unchanged 9,000,000-microcredit monthly grant therefore displays as **1,000 Nexus Credits** and retains approximately $3 of provider buying power.

## Compatibility and accounting

- `microcreditsPerCredit: 1000000`, catalog `credits`, wallet balances, credit pack grants, reservations, debt, included/purchased ordering, liability recognition, webhook grants and refunds retain their existing meaning.
- No wallet migration or balance rewrite is required. Existing purchased credits retain their original buying power and expiration behavior.
- `creditDenomination`, bucket `limit`/`used`/`reserved`/`remaining`, and `totalAvailableCredits` are additive presentation fields. Existing `*Micros` fields remain authoritative and unrounded.
- The public catalog adds `creditsMicros`, `displayCredits`, and `displayCreditsLabel`. Its original `credits` value remains a canonical catalog amount for older clients.
- Display conversion uses integer rational arithmetic. Only the final UI/analytics number is rounded, normally to two decimal places. It must never be used to settle a wallet or establish affordability.
- An Auto ceiling supplied in displayed credits converts to integer wallet micros with floor rounding, so a fractional ceiling cannot admit a model above that limit. The server independently estimates and settles provider costs.
- Legacy provider-dollar allowances and Premium Balance retain their USD presentation until their existing explicit migration is performed. This feature does not trigger that migration.

## Rollout and rollback

1. Deploy the backend additive response fields and shared denomination metadata while retaining all existing canonical fields. Older clients continue to work.
2. Deploy frontend formatting for plans, purchased packs, account/team balances, request estimates and usage meters together. Starter shows 166.67 credits; Pro 1,000; Team 1,666.67 per seat. Fractional display values are rounded; grant integers are unchanged.
3. Confirm the billing catalog, authenticated entitlements, selected Team wallet and request estimates agree on `nexus-credits-v1`.
4. A frontend rollback restores the previous labels without touching stored funds. Backend rollback requires no reverse migration: new analytics fields and response metadata can be ignored by the prior implementation.

## Usage analytics groundwork

Existing credit reservations and settlements gain an optional `analytics` object. Routing provider/mode/selection and request category are bound to the first reservation. Completion latency, retries, model-switch indicator, success, tool failures and an existing user rating can be supplied by server execution integrations. Settlement retries return the original immutable record.

Estimated/actual provider costs and canonical credit charges are derived from authoritative service arguments. Displayed credit values and their denomination version accompany those exact integers. A strict allowlist drops arbitrary metadata, prompt contents and caller-provided financial estimates. No new collection, index, or mandatory backfill is introduced; old records simply lack these optional analytics fields.

## Validation

The conversion tests cover exact ratios, decimal ceilings, safe integer bounds and immutable catalog grants. Wallet tests exercise many tiny settlements, authoritative cost accounting, immutable analytics across retries, included-first consumption, reservation isolation, release, debt and legacy buying power. Frontend tests cover plan and top-up labels, preserved legacy USD balances, and accessible allowance values.
