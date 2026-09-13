# AURORA artwork pipeline sample

Saved in the local UI workspace as **AURORA · Gemini artwork menu** (design oaXLaAbGQK1EsYMPfgu8).

- 16 individual private artwork assets; Gemini 3.1 Flash Image 4K via the user's Vercel Gateway.
- Library and existing artwork reuse precedes new generation. Sheets are cropped, keyed, validated, and saved as separate canonical components.
- Native Luau text, button hooks, modal controllers, toggle and slider behavior; exact source embedded in main-menu.rbxm.
- Desktop, tablet, phone, Settings and Credits images are actual local builder/renderer outputs. Panel states are visibility projections, not Roblox runtime captures.
- 137 focused tests passed, changed backend JavaScript syntax checks passed, frontend production build passed.
- Static compiled-model compliance passed. Two automated visual reviews exposed issues that were repaired; final visual acceptance by the AI remains unconfirmed.
- No Studio installation or Roblox asset publication was performed. Private nexusasset references require publication before Roblox can display them.

## Files

- source/: final four Luau files
- desktop.png, tablet.png, phone.png: initial menu
- desktop-settings.png, phone-settings.png, phone-credits.png: panel layout checks
- generated.json: source and individual canonical asset references
- implementation-evidence.json, verification.json: scoped verification results
- visual-review-before-final-polish.json: earlier critique, not the final revision

The test uncovered and fixed sheet-layout drift, imprecise crop boxes, loose-control semantic mistakes, background pixel resurrection, preview payload overflow, required-icon bindings, layout shadows consuming list rows, and a plugin-only API in generated runtime source. The app-preview smoke initially selected the deployed queue; it now explicitly selects the local development queue.
