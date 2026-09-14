# Workspace presentation

`productLifecycle.js` owns lifecycle names, aliases, and completion copy.
`getWorkspacePresentation()` in `src/lib/runPresentation.js` derives the shared
state, label, tone, activity, waiting/terminal flags, motion, emphasis, and
accessibility metadata. It never changes runtime or Studio state. Full success
still requires the server's `completion.canComplete` evidence.

`AgentWorkspaceLayout` publishes that object through
`WorkspacePresentationContext` and `data-agent-*` attributes on the workspace
root. UI Creator adapts its real build stages through
`getUiWorkspacePresentation()` and publishes the same contract. Standalone
components use the same normalizer when no provider is available.

## Surface responsibilities

| Surface | Responsibility |
| --- | --- |
| Compact run bar | Current activity and entry to the full timeline |
| Composer | Focus and activity signal; queue controls retain their own purpose |
| Conversation | Communication, plans, artifacts, approvals, failure/recovery, final outcome |
| Activity drawer | Full live execution stream and detailed task/approval state |
| Technical history | Expandable recorded runtime events |
| UI result badges | Saved, Studio application, visual review, runtime verification as separate facts |

Internal lifecycle changes do not become new conversation rows. Suppressing an
inline activity row does not discard runtime events, source, approvals, or
artifacts. The full live stream remains available in Activity.

## Design ownership

- `src/design/nexus-foundation.css`: palette, typography, spacing, radii,
  semantic colors, elevation, and existing compatibility tokens.
- `src/design/nexus-motion.css`: timing, easing, shared entrances, interaction
  feedback, activity signals, and reduced-motion handling.
- `src/design/nexus-workspace.css`: workspace surfaces, composer, status,
  task hierarchy, conflict and credit confirmation treatments.
- `src/styles/aiTheme.css`: legacy aliases only.
- Component styles: component layout and responsive behavior.

Use `useMotionPresence()` for elements that need an exit phase. New activity
loops require explicit presentation flags. Waiting, cancellation, failure, and
terminal results stop the composer signal; the large atmospheric surfaces are
static. Most motion uses transform and opacity; preview/message blur is brief.

UI previews retain the preceding image while the replacement loads and
crossfades. The preview hook holds at most the current and preceding image URLs,
releases older URLs, and releases all owned URLs on unmount. Later builds retain
the previous preview; generated source remains accessible through Inspect.

Credit confirmations preserve the existing quote threshold and billing scope.
Continue resumes the reviewed submission once. Cancel, Escape, unmount, or a
change of chat/project/model/draft/context invalidates the pending confirmation.
An estimate failure cannot submit paid work.

## Validation

- 188 focused tests across 17 lifecycle, chat, workspace, UI Creator, and preview
  suites passed. The final drawer/header/focus changes also passed their 35
  targeted tests.
- `npm run build` passed, including the public frontend; changed JavaScript
  passed ESLint.
- Browser checks covered a 1440px desktop layout, 390px Chat/Preview views,
  full-width mobile drawer, keyboard focus trapping/restoration, reduced motion,
  and forced colors with higher contrast.
- A reversible DOM presentation fixture verified the working composer's 2px
  transform animation, no animation while waiting, and no animation with reduced
  motion. The fixture and browser overrides were restored. No new paid build or
  Studio application was needed for these presentation checks.
- 21st review reported no remaining errors in the core changed surfaces. Its
  remaining fixed-width warning refers to the run bar's `max-width`; the actual
  bar is fluid and was checked at 390px.
