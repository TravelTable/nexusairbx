# Troubleshooting

This page lists common NexusRBX Ai problems, possible causes, and practical fixes.

| Problem | Possible Cause | Fix |
| --- | --- | --- |
| Plugin does not appear in Roblox Studio | Studio was open during install, wrong account, or plugin disabled. | Restart Studio, confirm the same Roblox account installed it, and check plugin management. |
| Plugin opens but does not load | Network issue, temporary service issue, outdated plugin, or blocked sign-in flow. | Reopen the plugin, check internet connection, update the plugin, and try again later. |
| User cannot sign in | Account flow is incomplete or browser/plugin sign-in failed. | Confirm the sign-in method: `[Insert exact sign-in method]`. Retry in the plugin or web app. |
| Studio does not connect to NexusRBX | Pairing code expired, wrong account, or Studio session not active. | Reopen the plugin, generate a new pairing flow if needed, and confirm both sides use the same account. |
| Generated script has errors | Prompt missed object names, script type, or placement details. | Paste the exact Output error and ask NexusRBX Ai to debug it. |
| Script does not run | Wrong script type or wrong location. | Check whether it should be a ServerScript, LocalScript, or ModuleScript. |
| RemoteEvent is not found | The RemoteEvent does not exist or has a different name. | Create the RemoteEvent in ReplicatedStorage or update the script to match the real name. |
| UI button does nothing | LocalScript path, button name, or event connection is wrong. | Confirm the LocalScript is under StarterGui or another valid local location and object names match. |
| Leaderstats do not appear | Script is not server-side or leaderstats folder is incorrect. | Use a ServerScript in ServerScriptService and check Output for errors. |
| AI response is too vague | Prompt did not include enough context. | Include script type, location, object names, expected behavior, and current error. |
| AI generates code for the wrong script type | Prompt did not specify ServerScript, LocalScript, or ModuleScript. | Ask for the exact script type and explain where it will be placed. |
| Plugin is outdated | Creator Store version is older than current service behavior. | Update or reinstall the plugin from the Creator Store. |
| User needs to reinstall or update plugin | Local install is broken or outdated. | Remove the plugin from Studio plugin management, reinstall from `[Insert Creator Store listing URL]`, then restart Studio. |

## What To Send Support

Include:

- Roblox username.
- Plugin version: `[Insert where users find plugin version]`.
- Roblox Studio version.
- Exact error message.
- Screenshot or video.
- Steps to reproduce.

