# Phase 7 Roblox Model Upload UI

Official Roblox Assets API documentation checked: 2026-06-18.

The model validation page can prepare and confirm Roblox uploads for:

- Validated source GLB files
- Completed validated optimized derivatives

The page sends only source IDs, creator type, display name, and description to the backend. It does not send Cloud Storage paths, signed URLs, SHA-256 values, file sizes, MIME types, or validation statuses as trusted input.

## Review Flow

The UI requires a backend prepare step before upload. The review displays source type, filename/hash summary, size, triangle counts, validation status, warnings, Roblox creator, display name, description, and moderation notices.

The user must confirm:

- Rights to upload the model and textures
- Roblox moderation applies
- The selected Roblox creator destination is correct

## States

The UI handles preparing, Roblox connection required, reauthorization required, review, queued, submitting, Roblox operation processing, succeeded pending moderation, approved, rejected, submission unknown, failed, and cancelled states.

For `submission_unknown`, the UI explains that NexusRBX does not automatically retry because a duplicate Roblox asset could be created.

## Receipt

Successful uploads display Roblox asset ID, revision ID, asset type, creator, source type, source hash summary, upload status, moderation state, copy asset ID, Creator Dashboard link, and moderation refresh.

No Phase 7 UI inserts the asset into Studio, publishes to Creator Store, makes the asset public, grants permissions, updates existing assets, or starts paid generation.
