# Roblox Example Conversion

Put raw Roblox example files in `raw/`. The converter supports `.rbxl`, `.rbxm`, `.rbxlx`, and `.rbxmx` files.

Run from the repository root:

```sh
npm run convert:roblox-examples
```

Or run the converter directly with quoted paths:

```sh
node scripts/convertRobloxExamples.js "Roblox examples for Ai/raw" "Roblox examples for Ai/converted"
```

Converted output is written to the sibling `converted/` folder. The raw folder is not modified, and converted files are never written inside `raw/`.

Use the generated `.lua`, `.json`, and `.md` files as AI examples or context. Do not send raw `.rbxl` or `.rbxm` binaries directly to an AI model.

Each converted example contains:

- `scripts/` with extracted `Script`, `LocalScript`, and `ModuleScript` source files.
- `instance-tree.json` with the safe Roblox hierarchy, selected properties, paths, script references, and counts.
- `summary.md` with detected systems, important scripts, UI structure, remotes/events, DataStore usage, and asset references.
- `rojo/default.project.json` as a lightweight inferred helper project.

The converter skips oversized inputs, avoids binary payload properties, redacts likely secrets in script sources, caps very large script and property output, and preserves hierarchy, paths, script source, remotes, UI, and asset references needed for NexusRBX context.
