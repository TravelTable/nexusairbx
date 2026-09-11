# UI Creator continuous sessions

The `/ai?mode=ui` workspace owns a durable conversation for each UI design. A new prompt uses the existing task runtime and streams its events over SSE, with cursor-based polling recovery. Public action labels are an allowlist; provider requests and backend payloads are never rendered as conversation actions.

## Build lifecycle

1. Generate and validate the Roblox UI document. This phase has no Studio prerequisite. Synthetic contact sheets are excluded from the continuous build's visual review.
2. Compile and persist the generated implementation files as an immutable workspace artifact.
3. Project that same compiler input into an immutable Roblox property tree (`capture.kind=design`) and render it through private Pinevex. There is no Studio prerequisite and no browser substitute renderer.
4. Apply automatically when Studio is connected, retaining existing conflict hashes, checkpoints, project/session binding and destructive-command approvals. When disconnected, continue rendering and review, showing Saved and Studio not applied yet. Connect & Apply later uses the saved revision without regenerating it.
5. When Studio is applied, verify its acknowledgement and capture the actual UI. Review matching Pinevex images on desktop and phone, including declared states. Repair the real implementation and repeat, up to the existing two-repair limit.
6. Only a completed visual review produces Ready. An acknowledged Studio apply, saved revision, and preview availability are separate statuses.

Capture or renderer failures produce `preview_unavailable` and preserve artifacts and application receipts. Retry Preview only submits/reconnects a render for the selected immutable source. Recapture Studio is a separate explicit action. A successful manual render retry does not retroactively claim that a failed acceptance review passed.

Visual review uses enforced JSON Schema output bound to the supplied image IDs. Truncated or malformed responses cannot produce Ready. Retry review (or Review saved UI in revision details) creates a new review task for the saved revision, republishes its deterministic files into that task's scope, and reuses matching renders. It does not regenerate or apply the UI unless the review identifies a defect that requires a repair.

Pinevex accepts JSON directly: [upstream repository](https://github.com/whutdev/pinevex-renderer), [demo](https://pinevex-renderer-demo.vercel.app/). Our private wrapper retains the pinned upstream engine and fonts, preserves the requested viewport, and materializes authorized image assets. The demo's automatic cropping is intentionally absent so device layout remains inspectable. A design render verifies appearance; runtime behavior still requires Studio testing.

## Preview identity

Images are scoped to user, project, design, source revision, capture, state and viewport. The browser verifies the PNG hash. Device/state changes only request images; they never apply, capture or generate code. Existing build render jobs are observed directly.

The most recently published successful preview reference is saved on the design. It can be re-authorized and reloaded after refresh, even after a new source revision is saved. The last valid image stays visible until a replacement succeeds, with Earlier version and its original device/state/revision. Switching users/projects/designs clears the in-memory private image immediately. Public renderer results are rejected, including historical image reads.

## Inspection and recovery

Chat occupies the resizable left sidebar and the preview sits on the right. Agent, UI and Assets share compact rounded composer controls, the Nexus gradient outline, tooltips and drawer styling. Mobile stacks conversation and preview and uses a modal files sheet.

Code / Files opens a nonmodal desktop drawer and a modal mobile sheet. Artifact metadata and Luau content load on inspection. Luau and files are exact read-only artifact reads, never an automatic compilation. JSON, assets, interactions and revision details share the drawer. It remains usable during builds. Templates create new designs; interaction suggestions populate the current prompt. Recent designs contain persisted records only. Checkpoint restore and recently-deleted recovery are explicit, and do not automatically apply to Studio.

Generation retrieves bounded real assets from the project's registry and icon market. Private canonical image references can render before Roblox publication; applying them to Studio requires published Roblox asset IDs. No invented IDs or sample images are substituted.

## Verification

Run the focused frontend tests for UiCreatorWorkspace, UiImplementationDrawer, UiPreviewPane, useUiPreview and taskRuntimeApi. Run the backend UiBuildService, UiDesignGenerationService, UiStudioApplyService, UiPreviewCaptureService, UiPreviewService, TaskIntakeService, ArtifactTaskRuntimeFacade and Studio protocol tests. Run the frontend production build and backend syntax checks.

For live end-to-end validation, use a configured private Pinevex renderer and an enabled worker. New builds use the `ui_build_v2` queue and new renders use `ui_preview_render_v2`, so older workers cannot stop offline builds or reject design sources during rolling deployment. The updated production worker also drains legacy jobs. Local development may run `NODE_ENV=development node scripts/run-ui-worker.cjs <authenticated-uid>` to process only that account's new UI build and preview jobs. Canonical task reads/writes and the canonical legacy artifact adapter must be enabled. The worker resolves the billing email from server-side Auth when canonical dispatch omits it; paid-account checks remain enforced.

Verify disconnected generation, automatic preview and Saved first, then Connect & Apply with the current Studio bridge; interrupt rendering and test Retry Preview; change devices/states and confirm Studio is untouched. The UI never substitutes an example image when these services are unavailable.

Local verification on 2026-09-09: real disconnected generation produced Luau and private Pinevex desktop/phone images for Default, Close and Claimed states. Preview retry recovered a failed slot without changing the document. Image review reached Ready across all six slots; an explicit re-review retained the same document and artifact revisions, and Luau downloaded from the drawer during review. Reload restored the image and Ready status with no fresh browser errors. Desktop and mobile layout, drawer focus and resizing were checked. The Agent task observer is disabled while the separate UI/Asset workspace owns the surface. Live Studio apply/capture was not tested because Studio was disconnected; its protocol and service checks remain required before deployment.
# Files-first UI builds

New `ui_build_v3` jobs generate a manifest of 2-24 Luau files as the authoritative source. `View.luau` and `Controller.client.luau` remain required entry points; focused `.luau` modules and `.client.luau` scripts may be added in safe relative folders. Provider deltas are parsed into bounded file drafts, persisted through the fenced task event/projection transaction, and shown in the right-hand editor with the manifest's real file count. Reloads recover drafts from the task. Completed files are saved as a source revision and workspace artifact before model packaging begins. JSON is an internal transport/renderer representation; the UI no longer has a JSON inspection tab.

The private renderer image now includes checksum-pinned Lune 0.10.5. `/v1/build-model` executes only `View.build()` in a restricted Luau environment inside a CPU/memory/time-limited child process with sockets denied. Controller code is syntax checked and embedded, never executed by the builder. The resulting ScreenGui, View module and Controller LocalScript are serialized into binary RBXM. The trusted runner deserializes those exact bytes to provide the canonical tree consumed by the existing private Pinevex adapter. Downloads return the same stored model bytes with a verified SHA-256 hash. No browser rendering is used.

The previous preview remains mounted while the live editor is shown. The editor gives way to the new image automatically when its revision is ready. Failed/incomplete files stay inspectable; render failures preserve saved source and model artifacts. Device changes request a render from the saved model capture without regenerating source or touching Studio. File-based builds currently expose the model's Default state; controller interactions require Roblox runtime verification.

Studio is optional. Updated plugins advertise `apply_ui_model`, which imports the exact saved model into StarterGui, snapshots replacement roots, checks known source hashes, and returns a verified model receipt. Older/disconnected plugins do not block generation or rendering. Unpublished `nexusasset://` artwork remains previewable and explicitly blocks Studio application until it has a usable Roblox asset reference.

Verification: run `node backend/scripts/verify-ui-files.cjs` against the configured private renderer for files → binary RBXM → decoded tree → Pinevex PNG. `backend/renderer/test_build.py` exercises actual Lune output, denied host APIs, controller non-execution, syntax failures, and runaway-code termination. No AI call, user record or Studio connection is needed for that integration check.
