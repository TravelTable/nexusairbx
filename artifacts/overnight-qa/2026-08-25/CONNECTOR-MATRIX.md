# Connector matrix

| Check | Status | Evidence |
| --- | --- | --- |
| Accepted release | Passed | Connector `0.2.15`; protocol `2026-07-17-mcp-parity`. |
| Local connector check | Passed | 185/185 tests, typecheck, build. |
| Desktop connector check | Passed | 23 Node + 9 renderer tests, typecheck, version check, build. |
| Release workflow | Passed | Run `32797265277`; connector checks, Windows, macOS, and publish jobs successful. |
| Windows package | Passed | 90,820,687 bytes; manifest/download SHA-256 `4d3b0c9f9a706f9de0854a6234c49d7da9f19f2ab1cf4bc9f91ca0cf392df53c`. |
| Windows install/start | Passed | Silent install exit 0; product version `0.2.15.0`; four processes running. |
| Windows signing | Expected unsigned | Manifest verification value is `unsigned`; no signing identity was available. |
| macOS package | Passed | 211,691,893 bytes; universal x64/arm64; SHA-256 `f8118f1f84b68be29867b99c9cf6b3133aefe29ce05d2ea9fb69bb2cbf59fe45`. |
| macOS signing/notarization | Passed | Developer ID signing, notarization, and DMG stapling passed in the release job. |
| Atomic public manifest | Passed | `latest.json` moved to 0.2.15 only after both platform jobs and publish completed. |
| Feed aliases | Passed | Ten required URLs returned ranged HTTP 206 with 0.2.15 object sizes. |
| Exact-window target | Passed | Unpublished QA Studio window selected; other `Place1` window remained untouched. |
| Snapshot | Passed | Terminal succeeded; one command-bound snapshot receipt; signature advanced. |
| Guarded write | Passed | V2→V3 terminal succeeded with baseline/readback hashes and backend verification true. |
| Steady-state reread | Passed | No second mutation; `already_applied`; V3 returned. |
| Superseded builds | Closed | 0.2.12–0.2.14 superseded after production lifecycle defects; see `DEFECTS.md`. |
