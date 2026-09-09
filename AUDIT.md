# NexusRBX UI preview re-audit — 8 September 2026

## Scope and verdict

Reviewed these immutable repository snapshots:

- Frontend/plugin: TravelTable/nexusairbx @ e12d5b49f8929e7810b29b9d0fd0ff5a18461a10.
- Backend: TravelTable/nexusrbx-backend @ ca59f6a308604fefbd28ed608feea61e01225173.
- Requirements: the supplied FULL_UI_UPGRADE_PROMPT.md, especially sections 3, 5–7 and 9.

The new UI page automatically generates, accepts, applies and captures UI; the old validation.valid bug is fixed; capture now resolves a project-bound target; state derivation and a repair recapture/wait path were added. These are real improvements, not merely unused helper modules.

Not yet production-complete. There are cross-component contract defects that the component unit tests did not cover. The most consequential new change is public-demo rendering by default, contrary to the private, pinned-renderer requirement.

This audit made NO repository writes or deployment changes. It did not use an authenticated production account, live Studio, the actual Pinevex renderer, or a full React test environment. No user UI data was sent to the public demo.

## P1 — Stable UI IDs disagree between authoring and capture

Frontend/plugin `roblox-plugin/src/commands/writeTools.lua`, UiArtifact.applyRoot:

```lua
node:SetAttribute("NexusNodeId", tostring(nodeSpec.nodeId or ""))
```

Frontend/plugin `roblox-plugin/src/studio/uiSnapshotSerializer.lua`, claimId:

```lua
local rawId = instance:GetAttribute("NexusUiNodeId")
```

The normal UI authoring path therefore produces nodes whose IDs the new reader does not recognize. The reader assigns capture_1, capture_2, etc. Backend `src/lib/uiPreviewStates.js` then tries to find authored node IDs in that captured tree and drops unmatched patches. For example, an authored `shop-overlay` openModal action does not find a captured `capture_3`.

**Observed locally:** actual state-derivation module returns no popup variants when fed the serializer's fallback-ID shape. Supplying consistent IDs produces the expected variant. This is an actual JS module test using a fixture that models the two Luau attribute names, not a live Luau execution test.

**Required correction:** define one shared stable node identity contract. Preserve existing NexusNodeId-based controllers. Add a read-compatible migration for NexusUiNodeId; when both attributes exist and disagree, surface a conflict rather than guessing. Do not assign stable-looking IDs by name. Update the serializer, compiler, instance writer, tests and plugin release artifacts together.

## P1 — Cached previews cannot reopen through the current frontend hook

Backend `src/services/UiPreviewService.js`, enqueue:

```javascript
if (reusable) return { jobId: reusable.jobId, status: reusable.status };
```

Other admission/cache branches return the same minimal shape. Frontend `src/hooks/useUiPreview.js` only fetches a job while status is not ready, then immediately requires job.preview. A ready admission thus skips the manifest read and throws "Preview belongs to a different UI revision or state."

**Observed locally:** a queued admission fetches the manifest/image successfully. A cached ready admission performs zero manifest/image reads and fails. A narrow hook correction restores the manifest/image read.

**Correction:** after validating and saving jobId, fetch the job when ready lacks preview, or make every ready admission return the complete scoped manifest. Keep all the identity checks. The `proposed/useUiPreview.js` file contains the narrow frontend change; it is not deployed.

This bug is also present in the original handoff hook, so responsibility is not solely with the implementing agent.

## P1 — Automatic recapture loses its request ID during polling

Backend `src/services/UiPreviewCaptureService.js`, waitUntilSettled:

```javascript
result = await this.read({
  authenticatedUser: context.authenticatedUser,
  designId: context.designId,
  captureRequestId: result.captureRequestId,
});
```

The read method returns `{status:"running"}` or `{status:"queued"}` without captureRequestId. After one nonterminal read, the next iteration polls an undefined ID.

**Observed locally:** the exact extracted method body polls `request-1`, then undefined. A fixed request-ID variable avoids the defect.

**Required method correction:**

```javascript
async waitUntilSettled(context, { timeoutMs = 90_000, intervalMs = 250 } = {}) {
  let result = await this.request(context);
  if (["ready", "failed", "unavailable"].includes(result.status)) return result;
  const captureRequestId = result.captureRequestId;
  if (typeof captureRequestId !== "string" || !captureRequestId) {
    throw new Error("Capture admission did not return a request identity.");
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(intervalMs);
    result = await this.read({
      authenticatedUser: context.authenticatedUser,
      designId: context.designId,
      captureRequestId,
    });
    if (["ready", "failed", "unavailable"].includes(result.status)) return result;
  }
  return { status: "failed", message: "Studio has not returned this capture yet." };
}
```

Separately propagate cancellation/deadlines through actual status reads; this narrow correction addresses identity loss only.

## P1 — Visual repairs omit the prior managed-tree hash

Backend `UiPreviewCaptureService.applyCompiledDocument` uses:

```javascript
payload: compileUiDocument(document, { forStudio: true })
```

The compiler accepts `expectedTreeHash` and `replaceModifiedRoot`, not a forStudio option for this purpose. With neither supplied, the compiled UI root has no previous tree hash. The plugin's UiArtifact.preflightRoot rejects an existing managed root without an expectedTreeHash unless explicit replacement was authorized, using ui_tree_precondition_required.

**Evidence level:** source-contract analysis; not executed in Roblox.

**Required correction:** use the same authoritative compile/apply service as ordinary UI updates, obtain the current managed-tree precondition, preserve saved hooks and asset bindings, await successful apply/readback, then mark the revision applied. Do not set replaceModifiedRoot=true to conceal this omission. A SHA-256 capture-tree hash is not interchangeable with the plugin's managed-tree hash.

The route currently saves the repaired authoring document before Studio apply. Track draft versus applied revisions separately so a failed apply cannot make the new revision appear synced.

## P1 — Public renderer path drops materialized images and bypasses the audited adapter build

Backend `UiPreviewRendererChain` now defaults to the third-party public demo. `PinevexPublicRenderClient.render` destructures only tree and viewport. The supplied assets (private PNG bytes and hashes) and fontRevision are not sent.

The chain chooses the private renderer for image-bearing requests only when a private client exists. With no private client, an image-bearing payload still goes public. The tree carries scoped keys such as img_<sha256>, but the public service receives none of the corresponding bytes. A correctly sized returned PNG can still be accepted with no local missing-image warning.

**Observed locally:** a mocked public request contains the image key, omits assets and fontRevision, and a correctly sized PNG is accepted as success. This test proves the lost-data request contract; it does not claim to have contacted or rendered with the real demo.

The public client uses `pinevex-public-demo` / `public-unpinned` labels. It cannot establish that the audited grid patch or pinned fonts are deployed. Merely checking PNG dimensions does not validate geometry, images, fonts, or rendering parity.

It also sends captured UI hierarchy/text to a third-party public deployment. The master prompt explicitly prohibits that. Keeping renderer credentials private does not prevent this transfer.

**Required correction:** restore private pinned rendering for production UI. Remove default public routing; public-demo experiments, if retained at all, must be separately authorized and limited to synthetic fixtures. Do not silently degrade image-bearing renders to a backend incapable of receiving their image data. If no compatible private service exists, return an explicit preview-unavailable result while preserving the applied Studio UI.

## P2 — Derived states do not preserve the real controller semantics

Even with stable IDs fixed:

- `selectTab` only shows the target in the preview; the compiled Luau hides sibling managed GuiObjects. Two tabs can remain visible in the preview.
- Any boolean `setState`, even `isMuted=false`, is converted into Visible=false on a target/source node. The compiled setState operation changes state[action.key], not arbitrary node visibility.
- Grouping by target/kind merges or discards effects from separate events. Multiple openModal actions for distinct shop targets can collapse into shop-open, while distinct setText scenarios on one node keep only the first patch.

**Observed locally:** the real JS derivation/application modules leave both tabs visible and convert isMuted=false into hiding a button.

**Required correction:** derive a restricted presentation reducer from the same documented controller contract. Group one scenario by action sequence, preserve its ordered effects and mutually exclusive siblings, and generate scenarios only where state-to-view binding is explicit. Do not infer business state from string matching or any boolean. Keep previews clearly simulated; arbitrary callback execution is not required for this release.

## P2 — The normal UI build still finishes before the new visual-review loop

Frontend `UiCreatorWorkspace.handleRenderStatus` calls uiRun.finish as soon as the first preview is ready. The traced generate → apply → capture → render flow does not call the new visual-review endpoint before finishing.

Backend `UiVisualReviewService` now does ask for a settled recapture and re-render, which is progress. However, it uses desktop only; `waitForRevisionRenders` returns ready when ANY preview for the source revision exists, rather than verifying all requested snapshot/state/viewport jobs. These issues are additional to the polling and precondition failures above.

**Required correction:** invoke bounded visual review from a durable authorized build step, not from state switching. Wait for the exact acceptance matrix and use real PNGs. Only finish the build-review phase when it has a truthful result. Do not mark runtime callbacks or gameplay verified from a PNG.

## P2 — Frontend-run recovery remains incomplete

The automatic build is a sequence of browser promises. Approval continuation and awaiting-render identity are React refs. Persisting the Studio command ID does not preserve the complete build continuation after reload. Generic generation and acceptance are not a durable server-side multi-stage UI build by virtue of rendering steps in chat.

**Required correction:** persist generation/apply/capture/render/review stages under the existing canonical run. Reopening the UI reconnects to that run instead of reconstructing intent or reapplying Studio operations. Scope callbacks to user/project/design/run and implement cancellation. Test reload after generation, after approval, during capture and during rendering.

## Interface observations

The latest UI is closer to the intended preview-first experience: a conversation column, main Preview/Code area and prompt composer. It is not the three-column image mockup, and a permanently expanded components panel is not necessary.

Keep the preview large; keep Code as a separate file editor; use one device selector and one state selector; show a small sync status. Do not add Pinevex branding to user-created games. The current code view still uses pre/code and a textarea rather than the existing Monaco/versioned-file workspace. Manual asset/history/editor affordances removed from the main page should remain reachable in optional drawers, not be lost.

## Local verification

Ran `node --test tests/reproductions.test.cjs`:

- 6 defect reproductions confirmed expected bad behavior.
- 2 passing controls show normal input can work.
- 2 narrow fix checks pass.
- 1 integrity check validates five full copied files against GitHub blob SHA-1 identities.

All 11 assertions pass because defect tests deliberately assert the CURRENT BAD BEHAVIOR. This is NOT 11 production acceptance tests passing.

The full source files copied into this package were verified against GitHub blob hashes. The capture wait is explicitly marked an extracted method. React hooks, network, storage and Studio are mocked/injected where needed. No real PNG rendering occurred; the transparent PNG is a response fixture.

## Recommended implementation order

1. Restore private renderer ownership and asset transport.
2. Unify compiler/plugin/capture node IDs with migration tests.
3. Fix cached-ready manifest loading and capture polling identity.
4. Route visual repairs through the normal hash-fenced apply/hook preservation path.
5. Replace inferred state patches with controller-consistent scenario transitions.
6. Connect durable build recovery and the complete visual-review/render matrix.
7. Run a real private-renderer smoke test and disposable Studio fixture: create UI, verify closed/open/tab states, repeat preview switches, reload, edit, repair, and compare mobile/desktop views.

Do not merge a claim of complete UI parity or automatic verification until the real Studio/renderer/browser acceptance checks have run.
