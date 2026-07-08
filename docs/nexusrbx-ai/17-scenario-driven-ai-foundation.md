# Scenario-Driven AI Foundation

This page summarizes the deterministic AI foundation added across Slices 1-15. It is a developer handoff, not user-facing product copy.

## Scenario taxonomy

| Scenario ID | Use |
| --- | --- |
| `studio_visibility` | Ask what files, scripts, manifest state, or Studio context is visible. |
| `script_explanation` | Ask what a script, module, or file does. |
| `bug_diagnosis` | Ask why something is broken or failing. |
| `targeted_edit_request` | Ask to change a specific file, script, UI, or system. |
| `feature_build_request` | Ask to add or build a new feature or system. |
| `search_and_compare` | Ask to find or compare candidate files or modules. |
| `workflow_guidance` | Ask how to do something conceptually. |
| `project_planning` | Ask to scope, plan, or break down broad work. |
| `environment_recovery` | Ask about Studio/session/manifest recovery issues. |
| `safety_boundary` | Ask for destructive, unsafe, or unsupported actions. |

## Normalized outcome

Every AI request now produces a normalized outcome object with:

- `scenarioId`
- `routeMode`
- `intentConfidence`
- `clarificationRequired`
- `studioRequired`
- `studioAvailable`
- `contextSourcesUsed`
- `actionLevel`
- `outcome`
- `blockerCode`
- `userGoalResolved`
- `nextBestAction`

Telemetry and reporting can read the same normalized shape without changing runtime behavior.

## Classifier

- The classifier is deterministic and first-pass only.
- Safety and environment recovery rules take priority over ordinary edit/feature classification.
- Ambiguous mutation requests set `clarificationRequired: true`.
- Unsafe or destructive requests map to `safety_boundary` with `blockerCode: unsafe_action`.

## Route hints

- Route hints recommend `ask`, `agent`, or `plan`.
- They do not auto-switch routes yet.
- They exist so future routing changes can stay observable and safe.

## Context policy

- `requiredContextSources` describes what should be inspected first.
- `minimumContextSatisfied` stays false until enough read-only context is available.
- `contextAcquisitionBlocked` explains why inspection cannot proceed.
- `workflow_guidance` intentionally avoids Studio reads unless the prompt already asks about project state.

## Studio blocker normalization

Common blocker codes include:

- `studio_not_connected`
- `missing_session`
- `manifest_building`
- `manifest_stale`
- `manifest_partial`
- `manifest_conflicted`
- `studio_timeout`
- `permission_denied`
- `unsupported_command`
- `ambiguous_intent`
- `unsafe_action`
- `unknown_error`

The blocker code drives recovery guidance. It does not apply changes automatically.

## Manual review policy

- `targeted_edit_request` never executes directly.
- `feature_build_request` never executes directly.
- Both require manual review before any mutation can be applied.
- Hash guards such as `expectedSourceHash` remain part of the safe mutation path where already supported.

## Metrics and release gates

- Capability metrics aggregate by scenario, blocker, route hint, and manual-review requirement.
- Release gates compare eval metrics against fixed thresholds and optional baselines.
- New prompts should be added through the existing eval fixture structure, then re-run through the eval and gate commands.

## Future slices

- Safe route switching
- Better read-only context acquisition
- Reporting dashboard
- Improved Studio recovery
- LLM-vs-deterministic classifier comparison
- Expanded manual verification

## Developer handoff checklist

1. Inspect `backend/src/lib/aiConversationOutcome.js` first.
2. Run `cd backend && node --test src/lib/aiConversationOutcome.test.js`.
3. Keep `manual_review` and Studio mutation rules intact.
4. Add new scenario families through the deterministic classifier and tests.
5. Add new blocker codes only when the signal is specific and stable.

