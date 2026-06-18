# Phase 6 Model Optimization

NexusRBX can create a private optimized copy of a GLB that has already completed Phase 5 validation. The original source file is immutable and remains visible in the validation report.

## Profiles

- `lossless_cleanup`: cleanup and deterministic repacking only. It is not intended to reduce texture size or triangle count.
- `roblox_balanced`: default profile for oversized textures and high-triangle meshes.
- `roblox_aggressive`: stronger targets and an extra confirmation because it can reduce more visual detail.

## Review Screen

The frontend shows the selected profile, planned mesh targets, planned texture resizing, warnings, and destructive operations before the user queues a job. The approval copy states that:

- The original file will not be changed.
- Simplification may reduce visual detail.
- The optimized copy is validated again before preview or download.

## Job States

The UI displays real backend stages such as queued, loading source, cleaning geometry, processing textures, simplifying meshes, writing derivative, validating derivative, completed, failed, and cancelled. It does not show fake percentages.

## Comparison

Completed derivatives can be previewed, downloaded, retained until retention expiry, or deleted independently from the source. The comparison view shows file size, triangle counts, largest mesh, texture bytes, compatibility changes, and warnings.

The feature does not upload models to Roblox, insert models into Studio, use Blender, convert FBX/OBJ, fetch external resources, or add paid AI generation. Reduced file size or triangle count does not guarantee identical visual quality or Roblox acceptance.
