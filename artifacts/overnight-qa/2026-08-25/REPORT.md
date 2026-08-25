# NexusRBX overnight production QA — 2026-08-25

## Outcome

Production release completed successfully on `main`.

- Frontend commit: `a644a16e8047684cd0a7921a27ad644ebc6dc8ba`
- Backend commit: `399a6a8c064ae7f754282d3099a6675d493cb1a2`
- Connector: `0.2.15`, protocol `2026-07-17-mcp-parity`
- Vercel production deployment: `dpl_HWV4J9vUJyKLk6GCaWysFpVPjVcX` — Ready
- Railway production deployment: `ac077a71-1e24-4fc9-8c7a-11ed7acc3729` — Success
- Connector release workflow: `32797265277` — all jobs successful

Connector releases `0.2.12`, `0.2.13`, and `0.2.14` were validly built but superseded after production-only lifecycle gaps were reproduced. `0.2.15` is the accepted release.

## Final gate evidence

| Surface | Result |
| --- | --- |
| Frontend Jest | 188 suites, 1,028 tests passed in the full overnight run; final `StudioPairControl` gate 15/15 passed. |
| Frontend production build | CRA compiled; Next.js generated 188/188 static pages; merged public export succeeded. |
| Backend full suite | 1,583 tests: 1,579 passed, 4 skipped, 0 failed. |
| Backend final verifier gate | 15/15 passed; targeted protocol/lifecycle/adapter gate 101/101 passed. |
| Local connector | 185/185 tests, typecheck, and build passed at 0.2.15. |
| Desktop connector | 23 Node tests + 9 renderer tests, typecheck, version gate, and build passed at 0.2.15. |
| Studio plugin | 44/44 tests; 50 handlers; installed verified bundle build `nexusrbx-studio-0.12.0-script-context.3`. |
| Windows package smoke | Silent install, secure startup, and uninstall workflow job passed. |
| macOS package trust | Universal app and DMG Developer ID signing, notarization, and stapling passed. |

## Release-feed verification

- `latest.json` committed version `0.2.15` after all platform objects were uploaded.
- Ten required manifest, updater, checksum, versioned, stable, and compatibility URLs returned HTTP `206` to ranged GETs.
- Windows installer: 90,820,687 bytes; SHA-256 `4d3b0c9f9a706f9de0854a6234c49d7da9f19f2ab1cf4bc9f91ca0cf392df53c`.
- macOS DMG: 211,691,893 bytes; manifest SHA-256 `f8118f1f84b68be29867b99c9cf6b3133aefe29ce05d2ea9fb69bb2cbf59fe45`.
- Downloaded Windows artifact matched manifest size and SHA-256, installed with exit code 0, upgraded `0.2.14.0` → `0.2.15.0`, and started four application processes.
- Windows is explicitly `unsigned`; macOS is `developer_id_notarized`.

## Exact-window production acceptance

The acceptance target was the unpublished disposable file `NexusRBX Overnight QA 2026-08-25.rbxl`. The separate `Place1 - Roblox Studio` user window remained open and untouched.

1. Production authenticated and resolved one exact MCP/local draft binding.
2. Search and guarded source read succeeded on `game.ServerScriptService.NexusRBXOvernightQAFixture`.
3. `create_snapshot` reached terminal `succeeded`, returned exactly one snapshot, trusted snapshot evidence, post-mutation attestation, and an advanced place signature.
4. `write_script` changed the QA token from V2 to V3 with `expectedSourceHash` and `createParents: false`.
5. The write reached terminal `succeeded`; result and backend verification were both true; command/attestation target and generation matched; active Studio window matched; signature advanced.
6. A fresh read returned the V3 token.
7. A second verifier run performed no mutation, reported `already_applied`, and reread V3 successfully. Its prior-write record remained terminal `succeeded` with trusted verification.

The website target label appeared as `Place1 (2)` in the authenticated browser because a same-name second transport/window existed. Opaque target, session, connection, exact window, unpublished identity, and project binding checks—not the display label—were used as the execution fence.

## Production browser and route QA

- Edge rendered `/downloads` with title `Download NexusRBX Connector for macOS and Windows`, Windows 10/11 x64 copy, and `v0.2.15` without an update/reinstall warning.
- Authenticated `/ai` rendered `Connected` and the selected `Place1 (2)` target.
- `/`, `/downloads`, `/ai`, `/docs`, `/docs/installation`, `/docs/studio-plugin`, `/pricing`, `/legal/privacy`, same-origin `/connector/latest.json`, and API `/health` all returned HTTP 200.
- The same-origin connector manifest contained 0.2.15.

## Safety boundaries observed

- No Roblox place was published.
- No real Stripe checkout or charge was initiated.
- No user data was deleted.
- No force push or pull request was used.
- The separate user Studio window was not focused, mutated, restarted, or closed.
- Generated installers and the private redacted verifier remain local and uncommitted.
