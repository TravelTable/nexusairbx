# UI Creator continuous sessions

The `/ai?mode=ui` workspace owns a durable conversation for each UI design. A new prompt uses the existing task runtime and streams its events over SSE, with cursor-based polling recovery. Public action labels are an allowlist; provider requests and backend payloads are never rendered as conversation actions.

## Build lifecycle

1. Generate and validate the Roblox UI document. This phase has no Studio prerequisite. Synthetic contact sheets are excluded from the continuous build's visual review.
2. Compile and persist the generated implementation files as an immutable workspace artifact.
3. Apply automatically with `auto_after_approval`, retaining existing conflict hashes, checkpoints, project/session binding and destructive-command approvals.
4. If Studio is unavailable, finish with `saved` / `saved_without_studio`. The conversation remains open. Connect & Apply creates an application continuation for that exact saved revision, without generating it again.
5. Verify Studio application, capture its UI, and render the acceptance matrix through private Pinevex. Visually review matching captures; repair the real implementation and repeat, up to the existing two-repair limit.
6. Only a completed visual review produces Ready. An acknowledged Studio apply, saved revision, and preview availability are separate statuses.

Capture or renderer failures produce `preview_unavailable` and preserve artifacts and application receipts. Retry Preview only submits/reconnects a render for the selected verified capture. Recapture Studio is a separate explicit action. A successful manual render retry does not retroactively claim that a failed acceptance review passed.

## Preview identity

Images are scoped to user, project, design, source revision, capture, state and viewport. The browser verifies the PNG hash. Device/state changes only request images; they never apply, capture or generate code. Existing build render jobs are observed directly.

The most recently published successful preview reference is saved on the design. It can be re-authorized and reloaded after refresh, even after a new source revision is saved. The last valid image stays visible until a replacement succeeds, with Earlier version and its original device/state/revision. Switching users/projects/designs clears the in-memory private image immediately. Public renderer results are rejected, including historical image reads.

## Inspection and recovery

Code / Files opens a nonmodal desktop drawer and a modal mobile sheet. Luau and files are exact read-only artifact reads, never an automatic compilation. JSON, assets, interactions and revision details share the drawer. It remains usable during builds. Templates create new designs; interaction suggestions populate the current prompt. Recent designs contain persisted records only. Checkpoint restore and recently-deleted recovery are explicit, and do not automatically apply to Studio.

## Verification

Run the focused frontend tests for UiCreatorWorkspace, UiImplementationDrawer, UiPreviewPane, useUiPreview and taskRuntimeApi. Run the backend UiBuildService, UiDesignGenerationService, UiStudioApplyService, UiPreviewCaptureService, UiPreviewService, TaskIntakeService, ArtifactTaskRuntimeFacade and Studio protocol tests. Run the frontend production build and backend syntax checks.

For live end-to-end validation, use one enabled task worker, a bound Studio session with the current bridge, and the configured private Pinevex renderer. Verify offline Saved first, then Connect & Apply, capture and automatic preview; interrupt rendering and test Retry Preview; change devices/states and confirm Studio is untouched. The UI never substitutes an example image when these services are unavailable.
