# Defect log

All listed defects were reproduced before remediation. “Closed” means regression gates and the applicable final production retest passed.

| ID | Severity | Defect | Resolution / final evidence | Status |
| --- | --- | --- | --- | --- |
| ON-001 | P0 | Same-name Studio choices hid Plugin/MCP transport identity. | Collision choices retain provider detail; opaque target binding preserved; production `/ai` showed the exact selected target. | Closed |
| ON-002 | P1 | Connector Help opened removed `/docs/studio-mcp`. | Canonical `/docs/studio-plugin`; route and desktop tests pass; production route 200. | Closed |
| ON-003 | P1 | Draft/noindex legal pages entered the sitemap. | Excluded from canonical/indexable sitemap output; routing/public suites pass. | Closed |
| ON-004 | P2 | Frontend test hard-coded obsolete connector version. | Reads packaged version authority; final 0.2.15 targeted gate 15/15. | Closed |
| ON-005 | P2 | Public HTML test asserted retired branding. | Semantic home-link/favicon assertion; full frontend suite passed. | Closed |
| ON-006 | P2 | Backend result test depended on source formatting. | Semantic invocation contract; full backend suite passed. | Closed |
| ON-007 | P2 | Build emitted broken third-party sourcemap/root warnings. | Narrow postinstall repair and explicit Turbopack root; production build passed. | Closed |
| ON-008 | P0 | Team annual checkout mapping referenced a nonexistent Stripe price. | Correct active price and fail-closed regression; production variable updated; no charge initiated. | Closed |
| ON-009 | P1 | Mobile Studio recovery control was 32px high. | 44px mobile minimum; responsive retest passed. | Closed |
| ON-010 | P1 | Pricing interval pill conflicted with ruled-ledger design authority. | Square underlined ledger control; route/build regression passed. | Closed |
| ON-011 | P1 | Downloads used rounded elevated card/pill treatment. | Ruled square utility surfaces; production downloads rendered accepted v0.2.15 state. | Closed |
| ON-012 | P0 | Mobile disconnected-Studio control did not reach pairing directly. | Controlled pairing dialog wired to recovery path; full frontend tests passed. | Closed |
| ON-013 | P0 | Complete unpublished MCP targets were rejected as session mismatch. | Exact confirmed local identity support with fail-closed conflict checks; production exact-window acceptance passed. | Closed |
| ON-014 | P1 | Plugin dock exposed the full credential/session value. | Generic paired copy; plugin privacy regression and installed artifact passed. | Closed |
| ON-015 | P0 | Backend normalized `createParents` to true, contradicting exact-write safety and connector validation. | Require explicit parent creation; backend commit `91de10ca`; guarded production writes used `createParents: false`. | Closed |
| ON-016 | P0 | Connector post-mutation attestation compared stale target-list signature to fresh probe signature. | Allow signature advance only after verified mutation while retaining immutable fences; released in 0.2.12 and regression-tested. | Closed |
| ON-017 | P0 | `create_snapshot` changed connector-owned Studio state but was classified read-only. | Classify snapshots as signature-changing mutations in connector/backend; released in 0.2.13; production snapshot attestation advanced signature. | Closed |
| ON-018 | P0 | Snapshot success lacked command-bound verification evidence and was demoted to reconciliation. | Emit/validate exact path + snapshot-ID readback evidence; connector 0.2.14/backend `399a6a8c`; production snapshot terminal succeeded. | Closed |
| ON-019 | P0 | Guarded script writes returned `verified: true` without the trusted backend verification envelope. | Connector 0.2.15 emits command type, baseline SHA-256, and readback SHA-256; V2→V3 production write terminal succeeded with backend verification true. | Closed |

Superseded connector releases 0.2.12–0.2.14 remain immutable historical artifacts. The public commit-point manifest and website now select 0.2.15.
