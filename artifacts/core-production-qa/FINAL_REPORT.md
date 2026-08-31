# NexusRBX Core Production QA — Final Report

Date: 2026-08-31 (Australia/Sydney)

Scope: production NexusRBX AI Agent, first-party Roblox Studio plugin, and Local MCP connector.

## Verdict

**CONDITIONAL GO**

- **GO: Agent + Local MCP connector.** A fresh connector 0.2.17 session discovered live Studio capabilities, executed one production Agent mutation, and returned exact Studio readback. The production run and job succeeded.
- **READY TO PUBLISH: first-party plugin bundle.** The current source builds, passes the plugin gate, verifies 51 executable handlers, matches its declared build identity, and is installed locally.
- **NOT YET GO: full dual-transport release.** A fresh Agent → plugin → Studio acceptance run, plugin failure/recovery run, and cloud source update were not completed. Roblox exposes source publication for this plugin through Studio, whose custom DockWidget and publish controls were not safely addressable through the available Windows automation.

This supersedes the earlier blanket NO-GO. The original blocker was that neither transport had produced a live verified mutation. That is fixed for MCP; the remaining release blocker is isolated to the plugin path. No open P0/P1 NexusRBX defect was confirmed in the completed Agent/MCP path.

## Production acceptance evidence

- Agent run: `2nddHLglJUcyXCI83V7y` — `succeeded`
- Job: `1H5WnyHdstlFcBYxSDiL` — status/stage `succeeded`
- Requested target: `Workspace/NexusLiveShowcase/NexusReleaseCanaryV3`
- Requested attribute: `ReleaseCanary=connector-0.2.17`
- Final summary: `Folder created at Workspace/NexusLiveShowcase/NexusReleaseCanaryV3; ReleaseCanary=connector-0.2.17 was read back from Studio.`

| Step | Result | Evidence |
| --- | --- | --- |
| `search_project` | Succeeded | Agent inspected the connected project before mutation. |
| `create_instance` | Succeeded | Exact `Folder` created; verification source `studio_readback`. |
| `read_instance` | Succeeded | Exact path, class, name, and attribute persisted. |

Exact persisted Studio evidence:

```text
path: Workspace/NexusLiveShowcase/NexusReleaseCanaryV3
className: Folder
name: NexusReleaseCanaryV3
attributes.ReleaseCanary: connector-0.2.17
```

The identity/path check and attribute-value check both passed. Success was not inferred from dispatch alone.

The narrower `taskResult.status` was `partial` because the generic evaluator also requested architecture, static-analysis, and playtest evidence outside this create/read canary. That conservative secondary result does not contradict the successful run, job, command receipt, or readback, but its broad contract should be refined.

Live release identity:

- Backend header: `x-nexus-deployment: 5598464b55e6b77194ba35e8d49bf9a0249f2fac`
- Connector manifest: version `0.2.17`, published `2026-08-31T01:45:23.757Z`
- Production homepage: `V0.2.17 OUT NOW`
- Connector release workflow `33347974223`: passed
- Frontend CI `33350158019`: tests and production build passed
- Task Runtime Packaging CI `33350158107`: passed

## Agent

### Scenarios tested

- Production target resolution, project-search bootstrap, official MCP schema adaptation, command dispatch, streaming/durable run state, exact evidence persistence, and terminal completion.
- A real production search → create → read sequence against graphical Roblox Studio through the official Studio MCP bridge.
- Semantic completion based on Studio readback rather than transport success.
- Outcome-unknown handling: a possibly dispatched mutation becomes reconciliation-required and is not blindly retried.

### Fixes shipped

- `b6342deb` — rebind verified MCP Studio targets.
- `0c96fbb3` — bootstrap MCP Agent tasks with project search.
- `a3e45ea2` — adapt Agent payloads to official Studio MCP schemas.
- `40edc243` — deterministically verify exact MCP instance requests.
- `d59ce8a9` — surface uncertain mutation outcomes as reconciliation-required.
- `5598464b` — preserve bounded exact `instanceRecords` and typed Studio attributes through durable storage/evaluation.

### Reliability observations

- The production summary matched the observed Studio state.
- Targeting, readback, and attribute verification were explicit and persisted.
- No loop, duplicate mutation, fake success, or invented project state was observed in the final canary.
- A broader generated-Luau multi-system task and playtest was not repeated after the final deployment; the live proof is strong but intentionally narrow.

## Studio Plugin

### Build and installation

- Version: `0.14.0-r15-animation`
- Build: `nexusrbx-studio-0.14.0-r15-animation.2-ui`
- Protocol: `2026-08-27-r15-animation`
- Executable handlers verified: 51
- SHA-256: `af0692804a68cd1da281e0a5c627578e31a928e1f560436cdc7d0a27a85f5650`
- Artifact: `roblox-plugin/build/NexusRBXStudioBridge.rbxmx`
- Current artifact installed; Roblox Studio restarted.

Automated coverage passes for handler registration, pairing/session contracts, target identity, source conflicts, snapshots, rollback, exact receipts, idempotency, manifest paging, diagnostics, native models, asset import, animation, and structured unsupported states.

The plugin's custom DockWidget was not exposed with usable geometry through the Windows accessibility surface, and Studio screenshot capture failed at the OS composition layer. Blind coordinates and further guessed keyboard shortcuts were not used. Fresh graphical pairing and the required production plugin mutation/recovery sequence therefore remain unproven.

### Cloud publication

- Owned plugin: `NexusRBX Ai`
- Asset ID: `83865885181263`
- Latest observed cloud version: 35, updated 2026-08-28
- Creator Dashboard exposes metadata/version history, not source upload; repository publication instructions require Studio.
- The local artifact is ready, but current source was not proven published to the cloud asset.

Operator note: during Studio menu investigation, one `Alt+P` keypress caused Output to report `Sent message to server to publish.` This appears to have published the current private QA place containing the isolated release canaries. It did not prove a cloud plugin update, and no further guessed shortcut was used.

## MCP Connector

### Pairing, discovery, and lifecycle

- Started from a fresh production pairing flow with connector 0.2.17 and the official `StudioMCP.exe` process.
- Connector authenticated, NexusRBX reported Studio connected, and the official MCP catalog became available to the Agent.
- Discovery validates actual case-sensitive tool names/schemas. Plugin-only workflows remain unavailable through MCP.
- Credentials remained in process memory and out of this report. Unavailable states clear capabilities; shutdown erases authority.

### Reads, writes, retries, and verification

- The live write created the exact Folder at the exact requested parent and set the exact requested attribute.
- The following read returned the exact persisted instance record and typed attribute.
- Connector 0.2.17 normalizes semantic instance evidence from Studio responses for normal and fixed-routine execution.
- Mutations are never retried after uncertain dispatch; reconciliation is required.
- The earlier readback failure recovered after connector/backend fixes, and the same narrow canary then passed live.

### Release

- Commit/tag: `31ee8ab`, `connector-v0.2.17`
- Manifest: `https://downloads.nexusrbx.com/connector/latest.json`
- Windows SHA-256: `9aa81bca743f194a0cbec04131be00aca348860c998a49ee38526f2083fcd072`
- macOS SHA-256: `3d8cdb964413a257c0c5fd4be2685dfbcacf80fb961752e32f5d01525907ed4d`

## Cross-transport comparison

| Area | First-party plugin | Local MCP 0.2.17 |
| --- | --- | --- |
| Artifact/build verified | Yes | Yes |
| Fresh production pairing | Not completed | Passed |
| Live target discovery | Not completed in fresh plugin session | Passed |
| Project search/read | Automated only | Passed live |
| Exact guarded mutation | Automated only | Passed live |
| Exact Studio receipt | Automated only | Passed live |
| Failure/recovery | Automated only | Readback failure fixed; live rerun passed |
| Current release | Cloud v35; current source not proven published | Public 0.2.17 live |

Functional parity is not claimed; plugin-only capabilities are intentionally separated from the narrower official MCP surface.

## Bugs found and resolved

### QA-001 — P2 — Connector rejected dash-prefixed MCP arguments

- Reproduction: launch with `--mcp-arg --verbose`.
- Root cause: generic parsing rejected the value before special-casing repeatable MCP arguments.
- Fix: pass `--mcp-arg` values verbatim while retaining missing-value validation (`c34cfb5`).
- Regression/retest: dedicated regression added; complete connector gate passes.

### QA-003 — P2 — Agent requests did not map deterministically to official Studio MCP

- Reproduction: run an explicit instance task through a connected MCP target.
- Root cause: target rebinding, search bootstrap, and payloads did not consistently match discovered schemas.
- Fix: `b6342deb`, `0c96fbb3`, `a3e45ea2`, `40edc243`.
- Regression/retest: focused suites and the live production canary passed.

### QA-004 — P2 — Uncertain mutation outcomes were too generic

- Reproduction: lose the authoritative response after possible dispatch.
- Root cause: Agent terminal mapping did not preserve reconciliation-required state.
- Fix: `d59ce8a9`; no retry of possible mutation.
- Regression/retest: focused suite 115/115; complete backend suite passed.

### QA-005 — P2 — Exact instance evidence was dropped before evaluation

- Reproduction: persist `read_instance`, `read_properties`, or `inspect_instances` with typed attributes.
- Root cause: sanitization summarized results and discarded bounded `instanceRecords`.
- Fix: preserve bounded records and decode typed Studio values (`5598464b`).
- Regression/retest: focused suite 122/122; complete suite and live readback passed.

### QA-006 — P2 — Connector readback attestation lacked normalized evidence

- Reproduction: execute a fixed instance routine with nested/encoded official MCP results.
- Root cause: transport success was returned without a consistent normalized instance projection.
- Fix: normalize/attest instance readbacks (`31ee8ab`, connector 0.2.17).
- Regression/retest: connector gate, public release, and production canary passed.

### QA-007 — P3 — UI reported the previous connector and drawer focus recovery was incomplete

- Reproduction: open download surfaces or close a compact drawer with keyboard focus inside.
- Root cause: hard-coded 0.2.15 labels and missing forwarded refs on the shared button.
- Fix: align to 0.2.17 and restore focus to the correct reopen control (`6911bc4`).
- Regression/retest: focused UI/full frontend passed; 21st review has 0 errors/warnings; production shows 0.2.17.

### QA-008 — P3 — Hosted Creator Store test raced rendered attachment state

- Reproduction: full Linux CI could assert before React rendered `Attached to chat`.
- Root cause: callback was awaited, but the next DOM lookup was synchronous.
- Fix: await the accessible attached-state button (`b5a0cc3`).
- Regression/retest: targeted 14/14, local frontend 1,114/1,114, hosted CI tests/build passed.

## Exact automated results

| Gate | Result |
| --- | --- |
| Local MCP `npm run check` | PASS — typecheck, 187 tests, build |
| Desktop connector | PASS — 23 Node + 9 renderer tests |
| Plugin test/build/verify | PASS — 55 tests; build; 51 handlers |
| Final focused backend evidence suites | PASS — 122/122 |
| Complete backend suite | PASS — 1,717 total; 1,712 passed; 5 skipped |
| Creator Store regression | PASS — 14/14 |
| Complete frontend suite | PASS — 206 suites; 1,114 tests |
| Local production build | PASS — React + Next public export; 188 static pages |
| Hosted Frontend CI `33350158019` | PASS — tests + build |
| Task Runtime Packaging CI `33350158107` | PASS |
| 21st UI review | PASS — 0 errors, 0 warnings; 2 unrelated info suggestions |

The five backend skips are explicitly integration-gated and are not counted as passes.

## Exact manual Studio scenarios completed

1. Built, verified, installed, and restarted the current plugin artifact.
2. Inspected the owned cloud plugin and all 35 published-version records.
3. Started and paired a fresh connector 0.2.17 process with official Studio MCP.
4. Observed NexusRBX connect and register MCP capabilities.
5. Submitted the exact production canary against `Workspace/NexusLiveShowcase`.
6. Observed project search, one exact Folder mutation, and one exact instance read.
7. Inspected durable run/job/command receipts and semantic verification checks.
8. Confirmed the exact Folder and `ReleaseCanary=connector-0.2.17` from Studio.
9. Verified the deployed backend, public connector manifest, homepage version, and hosted CI.

## Remaining risks and exit criteria

1. Complete a fresh Agent → first-party plugin → Studio search/read/mutation/readback run.
2. Exercise plugin invalid/expired/reused pairing, reconnect, session replacement, stale-source rejection, snapshots, rollback, and failure recovery in graphical Studio.
3. Publish current plugin source to asset `83865885181263` and confirm a new cloud version/build identity.
4. Repeat supported read, guarded mutation, stale conflict, and recovery through both transports against one fixture.
5. Prove two-Studio target isolation for both transports.
6. Run a broader generated server/client/module/UI Luau task and real playtest after the final deployment.
7. Run sustained restart, disconnect, refresh, cancel, and duplicate-approval chaos tests.
8. The public Windows connector is marked `unsigned`; code signing remains a distribution-trust improvement.

Upgrade the full release to GO only after items 1–3 produce observed evidence and no P0/P1 defect remains.
