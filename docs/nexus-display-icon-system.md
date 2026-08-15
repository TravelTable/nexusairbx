# Nexus display icon system

This board is the reference contract for NexusRBX’s flat 2D display icons. The family takes its rounded ink frame, off-white field, heavy line, and restrained purple seam signal from `nexus-mark.svg` without turning product actions into logo variants.

| Preview | Asset | Product meaning |
| --- | --- | --- |
| <img src="../public/assets/nexus-display-icons/ask.svg" width="72" height="72" alt="Ask display icon"> | `ask.svg` | Start with a creator request or question. |
| <img src="../public/assets/nexus-display-icons/build.svg" width="72" height="72" alt="Build display icon"> | `build.svg` | Construct a connected game system or experience. |
| <img src="../public/assets/nexus-display-icons/edit.svg" width="72" height="72" alt="Edit display icon"> | `edit.svg` | Change an existing script, interface, or object. |
| <img src="../public/assets/nexus-display-icons/debug.svg" width="72" height="72" alt="Debug display icon"> | `debug.svg` | Trace a failure and verify the correction. |
| <img src="../public/assets/nexus-display-icons/plan.svg" width="72" height="72" alt="Plan display icon"> | `plan.svg` | Review the route before material changes. |
| <img src="../public/assets/nexus-display-icons/studio-connect.svg" width="72" height="72" alt="Studio Connect display icon"> | `studio-connect.svg` | Pair Nexus with the selected Studio place. |
| <img src="../public/assets/nexus-display-icons/assets.svg" width="72" height="72" alt="Assets display icon"> | `assets.svg` | Inspect or work with project assets and references. |
| <img src="../public/assets/nexus-display-icons/snapshot.svg" width="72" height="72" alt="Snapshot display icon"> | `snapshot.svg` | Preserve a recoverable project state. |
| <img src="../public/assets/nexus-display-icons/publish.svg" width="72" height="72" alt="Publish display icon"> | `publish.svg` | Move a reviewed result toward release. |
| <img src="../public/assets/nexus-display-icons/complete.svg" width="72" height="72" alt="Complete display icon"> | `complete.svg` | Mark a reviewed request or verification as complete. |

## Visual contract

- Canvas: `96 × 96`, legible from 40 px upward.
- Construction: flat paths only; no gradients, filters, extrusion, perspective, text, sparkles, or wand metaphors.
- Ink: `currentColor`, four-pixel round line language, with a five-pixel check only where optical weight requires it.
- Field: warm off-white `#F7F4ED` inside the same 20 px rounded frame used across the set.
- Signal: exactly one restrained purple `#7C3AED` element per icon. It is a Nexus state cue, not decorative lighting.
- Use: explanatory workflow rows, empty states, onboarding, and other display-sized moments. Keep compact interactive controls on the existing semantic vector control set.
- Accessibility: use an empty alt when the adjacent label already names the action; provide concise alt text only when the image carries meaning on its own.

The identical mirror in `public-frontend/public/assets/nexus-display-icons/` is intentional: the statically exported public homepage and the authenticated React workspace have separate public roots.
