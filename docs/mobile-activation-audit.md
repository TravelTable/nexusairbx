# NexusRBX Mobile Activation Audit

## Scope

Mobile activation was reviewed for the public landing path and the Quick Script workspace at 320px, 360px, 375px, 390px, 430px, and tablet-class widths. The focus was the journey from a landing-page prompt to a useful Quick Script result, then copy, save/export gates, Studio actions, sign-in handoff, and Agent Build upgrade.

## Screens and routes tested

- `/` public homepage prompt contract
- `/roblox-script-generator` and related server-rendered landing prompt contract
- `/ai` Quick Script workspace
- Quick Script generated-result action bar
- Anonymous save/export/Studio/continue/upgrade gates
- Sign-in nudge dialog over an existing workspace

Browser screenshots were not captured because the configured `agent-browser` helper is not available in this environment. The automated coverage added in this pass is static contract coverage plus production build verification.

## Problems found

- The AI workspace used `h-screen`, which is brittle on mobile browser chrome and keyboard resize.
- Quick Script imported the syntax highlighter in the main workspace bundle even before a result existed.
- The Quick Script prompt used a small text size on mobile, which can trigger iOS input zoom.
- Result action buttons used compact sizing that was below practical touch-target size.
- Generated code could scroll horizontally, but the code region was not keyboard-focusable or explicitly labelled.
- The sign-in nudge lacked dialog semantics and could exceed the smallest mobile viewport.
- Public landing pages did not explicitly guard against full-page horizontal overflow from narrow header and prompt layouts.

## Changes made

- Quick Script now uses dynamic mobile viewport containment through the parent workspace and an internal scroll area.
- Prompt focus recenters the textarea after the mobile keyboard opens and respects reduced-motion preferences.
- Mobile prompt text is 16px while preserving the established desktop density.
- Quick Script result actions and example prompt controls now meet practical touch-target sizing.
- Generated code is rendered inside a labelled, keyboard-focusable horizontal scroll region.
- Luau syntax highlighting is lazy-loaded only when a result is displayed.
- The sign-in nudge is a labelled dialog, remains dismissible, and scrolls within `92svh` on narrow screens.
- Public landing CSS now clips page-level horizontal overflow, keeps prompt inputs at 16px, compresses the header at narrow widths, and hides the account link below 420px to preserve the primary CTA.

## Flow coverage

- Homepage to Quick Script result: public prompt contract remains in place and the `/ai` Quick Script workspace accepts immediate generation.
- Script landing page to Quick Script result: server-rendered landing pages keep the prompt CTA contract.
- Anonymous result to copy: copy remains ungated.
- Anonymous result to signup and restored workspace: sign-in nudge now fits mobile and does not destroy the result behind it.
- Quick Script to Agent Build upgrade: existing upgrade action remains gated with preserved Quick Script context.
- Result to Studio information: Studio action remains visible in the result action group and gated through the pending-action path.
- Result to save/export gate: save and export remain visible after value and require authentication only when invoked.
- Navigation and return: this pass did not alter existing route history behavior.

## Accessibility results

- Prompt has a label, invalid state, visible focus styling, and keyboard submit behavior.
- Generation status continues to use polite status announcements.
- Result code region has an accessible label and keyboard focus.
- Sign-in nudge now exposes `role="dialog"`, `aria-modal`, `aria-labelledby`, and an accessible dismiss button.
- Touch targets were expanded on primary Quick Script activation controls.
- Existing reduced-motion support is preserved and prompt scrolling uses it.

## Performance measurements

- Before: `QuickScriptWorkspace` imported `react-syntax-highlighter` and the Luau language/style modules eagerly.
- After: `QuickScriptCodeBlock` lazy-loads the highlighter only after a Quick Script result exists.
- Public landing changes are CSS-only and do not add JavaScript.
- Build verification should be used as the source of truth for final chunk sizes after this audit.

## Remaining issues

- Real mobile keyboard behavior, OAuth return, and scroll stability during streaming still need device or browser-automation verification.
- No screenshots are attached because no browser automation helper was available.
- The authenticated Agent Build editor still ships its existing client-heavy surface by design; deeper bundle splitting should be handled as a separate editor-performance pass.
- The sign-in nudge does not implement focus trapping. That avoids the previous risk of trapping users, but a future pass could add focus return and bounded focus cycling if it is tested carefully on mobile.
