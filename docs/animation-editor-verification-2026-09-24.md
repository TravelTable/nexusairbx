# Animation set editor verification — 2026-09-24

## Implemented surface

The existing Animate workspace retains Clip studio and adds Animation sets. The editor uses existing Nexus UI primitives and design tokens, saves complete versioned set documents through authenticated APIs, and preserves each workspace's draft when switching views.

- Persisted brief planning, saved-set selection, layer/state hierarchy, state renaming with reference updates, and JSON export.
- Resource selection, suitability-filtered library search, slot replacement, Studio-exported RBXM/RBXMX import, published animation ID linking, and explicit resource readiness.
- Authored R15 preview, source-time scrubbing, named marker positions, timing windows, loop and speed controls, and resource comparison. Published IDs without authored frames do not produce fabricated browser animation.
- Marker/window editing, synchronized sound/VFX/gameplay/camera bindings, state interruption and timeout controls, transitions, blend durations, timing-window gates, and buffered input.
- Save-before-validate/compile/deploy, optimistic-version conflict preservation, preview versus published deployment, target rig/universe fields, staged Studio receipt polling, temporary-preview controls and control receipt polling.
- Server-backed published-marker inspection and Play Server experience-access probes use separate request/apply-receipt steps. A queued command is never labelled verified playback. Temporary attachment has an expiry and an explicit restart action.

## Actual browser evidence

Verification used `agent-browser` against the existing authenticated development app at `http://localhost:3000/ai?mode=animate`, backed by the real local Node service at port 5001 and its normal Firestore persistence. No mocked browser routes or fake auth were used. The existing admin setting **Show Animate workspace** was enabled to access the surface.

The browser created set `aset_42bbf62f530c4f4fa480980a6a676c76`, named **Animation browser QA sword combat with equip, two attacks, hit reaction and dodge**, in the current QA project. It remains a clearly named test artifact.

Observed workflow:

1. Plan returned a persisted combat set with ready/equip/attack/combo/hit-reaction/dodge states and authored draft resources.
2. Select attack; seek its Impact marker at 360 ms. The R15 approximation and source-time playhead responded.
3. Change playback speed from 1 to 1.3; Validate saved first, then returned **0 errors, 5 warnings**. Each warning explicitly identified an unpublished preview-only clip.
4. Compile runtime returned an artifact and the status **Runtime compiled. Studio playback has not been verified.**
5. Reload the entire app; open Animation sets and choose the saved set; attack still had speed 1.3. DOM input value/valueAsNumber were exactly 1.3 (the browser accessibility snapshot alone displayed a float32 approximation).
6. Search reusable resources for attack; a real project-scoped authored attack appeared. Replace the selected slot, save, and validate. Reopening the saved set retained the state and semantic window requirements; validation again returned 0 errors/5 preview warnings.
7. Inspect screenshots at 1440×1000 and 390×844. The editor had no horizontal overflow at either size. Mobile marker labels initially collided; a two-row marker label layout corrected this. The canvas and inspector remain scroll-accessible at narrow width.
8. No JavaScript page errors or webpack error overlay were reported in the final browser checks.

Screenshot files are temporary local evidence, deliberately not source-controlled:

- `C:\Users\jackt\AppData\Local\Temp\nexus-animation-set-desktop-final.png` — saved combat set, R15 canvas, state properties, semantic timeline, real validation warnings.
- `C:\Users\jackt\AppData\Local\Temp\nexus-animation-set-mobile.png` — narrow hierarchy and toolbar.
- `C:\Users\jackt\AppData\Local\Temp\nexus-animation-set-mobile-final.png` — corrected mobile timeline, canvas, and validation.

The browser pass did not send commands that modify Studio; the root acceptance pass owns genuine Studio integration evidence. File upload, published-marker receipt application, universe access probing, and all temporary-preview controls have focused frontend tests, but this browser session does not establish live publication or production asset permission success. Browser R15 rendering is an authored approximation and is not proof of Roblox track blending or gameplay correctness.

## Verification and local fixes

- 20 focused frontend tests passed across AnimationSetEditor, animationSetApi, and the existing AnimateWorkspace integration. Coverage includes save-before-validation, conflict preservation, reference-safe rename, marker scrubbing, real-frame-only preview, replacement contracts, multipart file transport, receipt polling, published-marker application, scoped access probing, and buffered timing-window editing.
- ESLint passed for new editor/API code and tests.
- Full `npm run build` passed: React production bundle, Next public export (188 pages), and final merge. Existing unrelated WorkspaceShell unused-import warnings and Tailwind mixed-unit breakpoint warning remain.
- After the final one-button restart addition, a fresh React production rebuild and public export merge also passed. The emitted bundle was checked to contain `Restart Studio preview`.
- Browser integration discovered missing deployed Firestore composite indexes. The backend agent added a bounded owner-filtered fallback specifically for missing-index errors, retaining the indexed query as the normal path. This allowed real save/list/reuse verification without claiming indexes were deployed.
- Restarting the stale local backend surfaced a native dependency conflict. An untracked nested Sharp 0.35.4 installation contradicted ndarray-pixels' `^0.34.0` requirement and collided with the existing root Sharp 0.34.5 on Windows. Only that verified nested package directory was moved to a sibling backup, allowing normal resolution to 0.34.5. Both native consumers loaded, and the backend was restored on port 5001. No tracked dependency tree files were changed for that local repair.

## Practical limits

The current set planner creates deliberately labelled procedural drafts and reuses suitable resources. It is not a promise of polished authored combat from every prompt. Imported animation files must still follow the publishing workflow. Server callbacks and authority remain game integration responsibilities. The existing global workspace header is crowded at a 390-pixel viewport; the new editor itself fits without horizontal overflow.
