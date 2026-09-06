# Creator interface refresh — 6 September 2026

## Delivered

- New chats can start as editable drafts. First send creates an organizational project through the existing endpoint, with a user-scoped idempotency key retained across retries and reloads. Existing projects are reused. Selected library assets remain draft context until the chat exists.
- Chatting and planning no longer inherit the blanket Studio connection gate. Studio operations retain target verification. Large composer warnings are replaced by deduplicated notices and the compact Studio control.
- A reconnecting or unknown plugin handshake is no longer classified as an unsupported release just because `currentRelease` is false. Actual unsupported and legacy-release checks remain. Update links lead to a real Studio download, with technical build information in diagnostics.
- Plugin downloads include a SHA-256 manifest and build verification. The distributed artifact preserves the pre-existing plugin UI changes.
- Workspace has illustrated Obby, Simulator, and Adventure prompt starters, recent projects, and Guided Launch. Provider logos are bundled locally with neutral fallback icons.
- Asset library defaults to all accessible assets, uses thumbnail cards, keeps search/type visible, and collapses advanced filters and secondary actions. Long asset names cannot displace the primary action.
- Tools are grouped by purpose. Roblox settings use a compact identity row, with administration separated from creator navigation.
- UI Creator distinguishes design, interaction preview, and code. Compile failures offer explicit retry. Studio success requires a verified receipt; pending commands survive reload and are polled to completion. Structural layer edits rebuild tree instances to prevent the page crash when deleting a selected layer.

## Validation

- Focused frontend: 18 suites, 183 tests passed; additional real layer-tree regression brings the unique tested total to 184. UI Creator and the real tree were rerun together: 9 tests passed.
- Backend: 71 tests passed, including project retry/idempotency, compatibility, and Studio protocol. Changed backend syntax checks passed.
- Plugin: 59 tests passed, 1 skipped, 0 failures. Artifact and public-download verification passed.
- Full frontend build passed. Focused lint was clean. UI review reported 0 errors, 0 warnings, and 2 suggestions about existing canvas color configuration.
- Production download returned HTTP 200 and matched its manifest SHA-256. Supplying its version, protocol, and build ID to the production release endpoint returned `acceptedRelease: true` and `installedReleaseCurrent: true`.
- Authenticated browser checks confirmed the new Workspace, editable starter prompts, connected Studio status, all-assets browsing, and the Roblox identity row. Workspace had no horizontal overflow at 390px and 768px; starter images and all 197 rendered provider images loaded.
- UI layer creation, property changes, save, and reopen were exercised in production. After the final deployment, deleting the last layer, undo, and redo all succeeded with no browser errors. The test design was restored to its original empty state; no changes were applied to the Roblox place. The asset card action was also verified inside the card bounds, with its image loaded.

## Release and remaining verification

- Backend deployment: `eaeb1b20-97bf-4fa0-9f44-788a6f5ecb04` (Railway production, successful).
- Final frontend deployment: `dpl_8ocrhNFci1xNkquekHYePAtKQvL9`, ready and aliased to `https://www.nexusrbx.com`. Its full production build includes the two browser-discovered layout/tree fixes.
- Current plugin build: `nexusrbx-studio-0.14.0-r15-animation.12-toolbox`.
- One additional, unrelated public HTML test still expects the previous homepage sentence (“Show what creators are building with Nexus”): 46 passed, 1 failed in that extra check. The homepage and assertion were not changed in this task.
- The complete manual Studio mutation/playtest checklist and an authenticated reconnect of the newly downloaded bytes were not performed. The existing installed plugin connects and the downloaded release is accepted by production, but that is not evidence of a fresh-install execution test. Automated tests cover Studio success, failed acknowledgments, and conflicts.
- Automatic project creation and draft asset retry paths were tested automatically; the signed-in browser account already had an active project, so a fresh-account first-send check remains separate.

The working tree also contains pre-existing plugin edits and concurrent chat-flow work. Those changes were preserved; this task did not reset or rewrite them.
