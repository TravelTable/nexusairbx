# Studio onboarding screenshot slots

This directory intentionally contains no fabricated setup images. Each slot is
marked `assetAvailable: false`, so the web UI renders an honest written label
without issuing a guaranteed-404 image request. Set the matching slot to
`assetAvailable: true` only in the same change that adds its reviewed Roblox
Studio screenshot.

Replace the slots with these exact WebP filenames:

| File | Required subject | Crop / aspect ratio |
| --- | --- | --- |
| `install-plugin.webp` | Roblox Studio plugin management with NexusRBX installed and enabled | 1600×1000 (8:5), subject centred near 42% vertical |
| `open-plugin.webp` | Plugins tab and the open NexusRBX plugin panel beside the place | 1600×1000 (8:5), centre crop |
| `enter-pair-code.webp` | NexusRBX plugin pairing field ready for the one-time code | 1600×1000 (8:5), subject centred near 45% vertical |
| `allow-http.webp` | Game Settings → Security with Allow HTTP Requests enabled | 1600×1000 (8:5), subject centred near 58% vertical |
| `connected-state.webp` | NexusRBX plugin showing the verified connection and current place | 1600×1000 (8:5), centre crop |

Before adding or replacing a file:

1. Capture a disposable, unpublished experience with no usernames, pairing
   codes, tokens, private place names, notifications, or unrelated desktop UI.
2. Use a current production-equivalent plugin build and Studio release. Do not
   mock a connection, edit status text, or imply that a reference screenshot is
   live state.
3. Crop to 1600×1000 without stretching. Keep the named control legible at
   narrow widths and at 200% browser zoom.
4. Export as WebP, preserve the exact filename, and verify the UI at 320, 412,
   834, 1136, and 1512 pixels.
5. If the Studio UI changes materially, replace the screenshot and update the
   matching metadata in
   `src/components/onboarding/StudioSetupVisual.jsx` in the same change.

The visible fallback is deliberate release behaviour. Do not replace it with
an illustration, generic mockup, generated image, or empty decorative frame.
