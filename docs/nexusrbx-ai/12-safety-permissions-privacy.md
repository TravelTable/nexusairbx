# Safety, Permissions, And Privacy

This page explains how users should think about safety, permissions, privacy, and generated code review. Replace placeholders with exact product details before publishing.

## Beta Safety Notice

NexusRBX Ai is currently in beta. Generated code should be reviewed and tested before it is used in a live Roblox game.

The plugin can speed up development, but it does not replace developer judgment.

## What NexusRBX Ai Needs Access To

Document the exact access requirements here:

| Area | Details |
| --- | --- |
| Roblox Studio plugin access | `[Explain what the plugin can read or interact with inside Studio]` |
| NexusRBX account | `[Explain whether sign-in is required and why]` |
| Script content | `[Explain whether script content is sent to NexusRBX servers]` |
| Prompts | `[Explain whether prompts are stored]` |
| Project data | `[Explain whether project data is stored]` |
| Billing | `[Insert billing details]` |

## User Review Before Changes

NexusRBX Ai should clearly show when the user needs to approve generated code before it is inserted or applied.

Before approving code, users should check:

- What script will be created or changed.
- Where the script will go.
- Whether the script type is correct.
- Whether object names match the project.
- Whether the code affects important systems.

## What Is Not Automatically Changed

Document exact behavior here:

- `[Explain what the plugin does not automatically change without review]`
- `[Explain whether insertion requires a confirmation click]`
- `[Explain whether existing scripts can be edited automatically]`
- `[Explain whether destructive changes are blocked, confirmed, or unsupported]`

## Privacy And Data Handling

Add exact privacy details before publishing:

- Privacy Policy: `[Insert privacy policy link]`
- Terms of Service: `[Insert terms of service link]`
- Support contact: `[Insert support email]`
- Data retention: `[Explain prompt, script, and project data retention]`
- Account deletion: `[Explain account deletion or data request process]`

Do not paste secrets, private API keys, Roblox account credentials, billing details, or personal information into prompts.

## Report Suspicious Behavior Or Bugs

If the plugin inserts unexpected code, shows a suspicious permission request, or behaves differently from the documentation:

1. Stop using the affected workflow.
2. Save a copy of the script or error message.
3. Take a screenshot or short video if possible.
4. Report the issue through `[Insert support form link]`, `[Insert support email]`, or `[Insert Discord link]`.

