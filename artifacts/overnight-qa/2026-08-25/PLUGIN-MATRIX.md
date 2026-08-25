# Studio plugin matrix

Plugin transport and local MCP transport are recorded separately; the destructive production acceptance intentionally used the exact-window MCP target.

| Check | Status | Evidence |
| --- | --- | --- |
| Source protocol tests | Passed | 44/44. |
| Static verification | Passed | 50 handlers; build `nexusrbx-studio-0.12.0-script-context.3`; SHA-256 `cc741d4cf15c88b4b7eede9ea78b68dca43dc95056df2868f59fd421b2faebfb`. |
| Bundle | Passed | `roblox-plugin/build/NexusRBXStudioBridge.rbxmx` regenerated and verified. |
| Install | Passed | Installed at `%LOCALAPPDATA%/Roblox/Plugins/NexusRBXStudioBridge.rbxmx`. |
| Credential privacy | Passed | Dock success copy exposes no session/token credential. |
| Disposable QA Studio | Passed | Installed artifact loaded in the saved unpublished QA file. |
| Separate user Studio safety | Passed | `Place1 - Roblox Studio` remained open and untouched through final acceptance. |
| Plugin production read/write | Not exercised | The final mutation matrix used MCP exact-window transport; plugin transport was retained as a separate live option. |
| Place publish | Not performed | Acceptance remained local/unpublished (`placeId`/`universeId` sentinel identity). |
