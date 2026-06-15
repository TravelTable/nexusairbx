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

## Updating the plugin

If the website queues tools like `get_project_manifest` and the plugin reports **Unsupported Studio command**, your local plugin is out of date.

1. In Studio, open **Plugins > Manage Plugins** and remove the old **NexusRBX** local plugin.
2. Create a new `Script` in `ServerStorage`, paste the latest `NexusRBXStudioBridge.plugin.lua`, and **Save as Local Plugin** again.
3. Reopen the NexusRBX dock and **Pair Studio** again (pairing codes are session-specific).
4. Confirm the dock shows `Plugin 0.4.0-protocol` (or newer) under the title.
