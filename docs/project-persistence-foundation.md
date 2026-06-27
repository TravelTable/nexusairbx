# NexusRBX Project Persistence Foundation

This foundation keeps generated work addressable after the initial session while preserving the anonymous-first Quick Script path.

## Data model

Authenticated projects are stored under `users/{uid}/projects/{projectId}`. Content remains scoped to the owning user and is not written to public collections.

Core fields:

- `projectId`
- `ownerUid`
- `title`
- `projectType`: `quick_script`, `agent_build`, `script`, or `ui_project`
- `generatorMode`: `quick_script` or `agent_build`
- `originalRequest`: private request text plus a salted prompt hash
- `currentResult`: current generated output and setup/test guidance
- `generatedFiles`: generated Luau files with Studio placement metadata
- `versionCount`, `currentVersionId`, `currentContentHash`
- `lastActivityAt`, `createdAt`, `updatedAt`
- `studioSyncStatus`: `not_connected`, `connected`, `pending_sync`, `synced`, `conflict`, or `failed`
- `suggestedNextAction`
- `isArchived`, `archivedAt`, `isDeleted`, `deletedAt`
- `privacy`: private, non-indexable account content
- `sourceRefs`: optional anonymous Quick Script or legacy script references

Versions are stored at `users/{uid}/projects/{projectId}/versions/{versionId}`.

## Privacy and access

Project content is private account data. Prompt text, generated code, file content, project titles, and user identifiers are not sent as product analytics properties.

The API only reads and mutates projects through authenticated routes, and every project lookup is scoped by `req.user.uid`. Deleted projects are excluded from recent-work listings and cannot be updated through normal save paths.

The project metadata marks private projects as `indexable: false`; public SEO metadata and sitemaps must not use these records.

## API routes

All routes are mounted under `/api/projects` and require Firebase authentication.

- `GET /recent`
- `GET /:projectId`
- `POST /save-quick-script`
- `POST /:projectId/versions/:versionId/restore`
- `POST /:projectId/studio-status`
- `POST /:projectId/upgrade-agent`
- `DELETE /:projectId`

Quick Script saves accept an idempotency key. Repeated callbacks return the existing project instead of creating duplicates.

## Version strategy

The service creates a version only when the normalized result and generated files produce a new content hash. It does not version every UI interaction or keystroke.

Version sources:

- `ai_generation`
- `ai_edit`
- `user_edit`
- `studio_sync`
- `restore_checkpoint`

Restoring an older version first preserves the current state as a checkpoint when the current content differs from the target version.

## Anonymous claiming

Anonymous Quick Script results remain visible and copyable without an account. When a user signs in and saves, the project service can claim the anonymous result using its claim token.

The claim operation is idempotent for the same account and rejected for a different account, preventing two accounts from claiming the same temporary result.

## Migration

Legacy saved scripts remain available. A reversible backfill can create retention projects from existing `users/{uid}/scripts/{scriptId}` records only when a reliable latest code version exists.

Dry run:

```sh
cd backend && PATH=/usr/local/bin:$PATH node scripts/backfillRetentionProjects.js
```

Apply:

```sh
cd backend && PATH=/usr/local/bin:$PATH node scripts/backfillRetentionProjects.js --apply
```

Rollback dry run:

```sh
cd backend && PATH=/usr/local/bin:$PATH node scripts/backfillRetentionProjects.js --rollback
```

Rollback apply:

```sh
cd backend && PATH=/usr/local/bin:$PATH node scripts/backfillRetentionProjects.js --rollback --apply
```

Rollback only removes records created with migration key `retention-projects-v1`; it does not delete the legacy script library.

## Analytics

Server-confirmed project events are emitted through the existing product analytics system:

- `project_created`
- `project_saved`
- `project_reopened`
- `project_version_created`
- `project_version_restored`
- `quick_script_upgraded_to_agent`
- `studio_sync_status_changed`
- `anonymous_project_claimed`

Allowed properties are operational metadata such as project ID, project type, generator mode, output type, version source, Studio status, previous status, and idempotency key. Private prompt/code/title content stays out of analytics.

## Rollback procedure

1. Revert client calls to `/api/projects/save-quick-script` and `/api/projects/:id/upgrade-agent`.
2. Keep legacy script-library routes online.
3. Stop running the backfill script.
4. If backfill was applied, run the rollback command above to remove only migration-created project records.
5. Leave anonymous Quick Script generation and claiming endpoints intact; the persistence routes are additive.
