# NexusRBX Studio Bridge

Local Roblox Studio plugin for the NexusRBX website-to-Studio bridge.

## Source layout

The editable plugin source lives under `roblox-plugin/src/` and is bundled into the single local-plugin artifact at `roblox-plugin/NexusRBXStudioBridge.plugin.lua`.

- `src/Main.server.lua`: plugin lifecycle, toolbar wiring, pairing, polling, restore confirmation, disconnect.
- `src/config.lua`: backend URL and plugin/protocol versions.
- `src/ui/BridgePanel.lua`: dock widget layout, visual states, button interactions, banners, restore sheet.
- `src/net/httpClient.lua`: JSON helpers, backend requests, stored Studio token helpers.
- `src/studio/`: path resolution, serialization, hashing, snapshots, change history.
- `src/commands/`: Studio command handlers split by read/write, validation, native models, imports, and registry execution.

Rebuild the installable plugin after editing source:

```sh
npm run plugin:build
```

If `npm` is not on your PATH in a minimal shell, run the bundler directly with your Node binary:

```sh
node roblox-plugin/build/bundle-plugin.js
```

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
2. Run `npm run plugin:build` if you edited files under `roblox-plugin/src/`.
3. Create a new `Script` in `ServerStorage`, paste the latest `NexusRBXStudioBridge.plugin.lua`, and **Save as Local Plugin** again.
4. Reopen the NexusRBX dock and **Pair Studio** again (pairing codes are session-specific).
5. Confirm the dock shows the expected plugin version under the title.
