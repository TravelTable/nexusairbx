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

This build also verifies that the bundled artifact contains its build attestation
and every registered Studio command. To check an already-generated artifact,
run `npm run plugin:verify`.

Install directly into Roblox Studio's local plugins folder:

```sh
npm run plugin:install
```

This writes `~/Documents/Roblox/Plugins/NexusRBXStudioBridge.rbxmx` as a **single bundled script** and removes legacy broken installs like `Plugin.rbxmx`.

If `npm` is not on your PATH in a minimal shell, run the bundler directly with your Node binary:

```sh
node roblox-plugin/build/bundle-plugin.js
node roblox-plugin/build/install-local-plugin.js
```

## Local install

1. Run `npm run plugin:install` (recommended), then restart Studio if it was open.
2. Manual fallback: create one new `Script`, paste **only** `NexusRBXStudioBridge.plugin.lua`, and use **Plugins > Save as Local Plugin**.
3. **Do not** save the `roblox-plugin/src/` folder or a place folder containing `src/` as a plugin.
4. Open the **NexusRBX** toolbar button.
5. On the website, click **Pair Studio** and enter the shown code in the plugin.
6. Click **Push Studio** on a generated artifact.

The plugin creates NexusRBX-managed folders under the target Roblox services and replaces only the matching generated folder on re-run.

## Updating the plugin

If the website queues tools like `get_project_manifest` and the plugin reports **Unsupported Studio command**, your local plugin is out of date.

1. In Studio, open **Plugins > Manage Plugins** and remove any old **Plugin** or **NexusRBX** local plugin.
2. Run `npm run plugin:install` (or `npm run plugin:build` plus manual paste if you prefer).
3. Restart Studio and reopen the NexusRBX dock.
4. **Pair Studio** again (pairing codes are session-specific).
5. Confirm the dock shows the expected plugin version under the title.

Pairing attests the exact plugin build, protocol version, capabilities, and live
command registry. A target mismatch means the installed artifact is stale: run
`npm run plugin:install`, restart Studio, and pair again. Editing files under
`roblox-plugin/src/` does not update the installed plugin on its own.

## Publishing to Roblox (cloud plugin)

See [PUBLISH.md](./PUBLISH.md). You must upload **only** the bundled `NexusRBXStudioBridge.plugin.lua` as a **single script**. Publishing the `src/` folder causes `Plugin.src.commands.*` parse errors in Studio.
