# NexusRBX Studio Bridge

Local Roblox Studio plugin for the NexusRBX website-to-Studio bridge.

## Local install

1. In Roblox Studio, create a new `Script` in `ServerStorage`.
2. Paste `NexusRBXStudioBridge.plugin.lua` into it.
3. Use **Plugins > Save as Local Plugin**.
4. Open the **NexusRBX** toolbar button.
5. On the website, click **Pair Studio** and enter the shown code in the plugin.
6. Click **Push Studio** on a generated artifact.

The plugin creates NexusRBX-managed folders under the target Roblox services and replaces only the matching generated folder on re-run.
