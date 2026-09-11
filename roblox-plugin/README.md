# NexusRBX Studio Plugin

The recommended Roblox Studio companion for Nexus Workspace.

## Studio toolbox

The plugin opens to **Tools**, with **Activity**, **Recovery**, and **Settings**
navigation. The dock uses Roblox Studio system surfaces with a restrained Nexus
accent and follows the active Studio theme where supported. There is no chat
composer or conversation transcript in the dock.

- Select objects in Explorer to inspect their properties, fix a problem, or
  describe an improvement. AI tasks accept up to five selected objects.
- **Create script** takes a name, script class, destination selected in Explorer,
  and a short behavior description. Existing names and invalid execution contexts
  are rejected before submission; generated source is validated again before apply.
- **Check playtest output** reads captured output. Start playtests in Studio.
- Results show progress and locally verified changed paths. Generated text alone
  is never shown as evidence that the place changed.
- Changes apply automatically unless **Automatic apply** is disabled in Settings.
  **Undo changes** queues the existing snapshot restore; Activity reports execution.
- **View latest task result** reopens the most recent task, including after restart.
  Interrupted tasks keep their request identity and block another submission until
  the previous outcome is resolved. Return to the original project/place when
  required; changing project or place requests cancellation of the old run.

Each submitted task has an independent backend conversation. Existing website
conversations and pairing credentials are retained. Saved Chat navigation opens
Tools after upgrading. Backend conversation endpoints remain unchanged.

## Source layout

The editable plugin source lives under `roblox-plugin/src/` and is bundled into the single local-plugin artifact at `roblox-plugin/NexusRBXStudioBridge.plugin.lua`.

- `src/Main.server.lua`: plugin lifecycle, toolbar wiring, pairing, polling, restore confirmation, disconnect.
- `src/config.lua`: backend URL and plugin/protocol versions.
- `src/ui/BridgePanel.lua`: dock widget layout, visual states, button interactions, banners, restore sheet.
- `src/ui/Toolbox.lua`, `ToolForm.lua`, `TaskResult.lua`: toolbox, focused forms, and result controls.
- `src/ui/TaskController.lua`: persisted task identity, submission, reconnect, cancel, approvals, and undo.
- `src/net/httpClient.lua`: JSON helpers, backend requests, stored Studio token helpers.
- `src/studio/`: path resolution, serialization, hashing, snapshots, change history.
- `src/commands/`: Studio command handlers split by read/write, validation, native models, imports, and registry execution.

Rebuild the installable plugin after editing source:

```sh
npm run plugin:build
```

This build also runs the script-context safety regressions and verifies that the
bundled artifact contains its build attestation and every registered Studio
command. To run only the context regressions, use `npm run plugin:test`. To check
an already-generated artifact, run `npm run plugin:verify`.

For executable task lifecycle scenarios, install the official Luau CLI and set
`LUAU_BIN` to its executable before running `npm run plugin:test`. Without it,
the lifecycle test explicitly reports a skip. Compile the generated plugin with
`luau-compile --null roblox-plugin/NexusRBXStudioBridge.plugin.lua` to check Luau
syntax and register limits.

The toolbox build is `nexusrbx-studio-0.15.1-ui-build.18-files-first`. Deploy the
matching backend release catalog before installing it against that backend.
The protocol version is unchanged and the prior chat build remains accepted.
`npm run plugin:build` creates the Lua bundle, checksum, and installable
`build/NexusRBXStudioBridge.rbxmx` without installing or publishing them.

Install directly into Roblox Studio's local plugins folder:

```sh
npm run plugin:install
```

On Windows this writes
`%LOCALAPPDATA%/Roblox/Plugins/NexusRBXStudioBridge.rbxmx`, the local plugin
folder loaded by Roblox Studio. The installer writes a **single bundled script**
and removes legacy broken installs like `Plugin.rbxmx`. If Studio uses a
nonstandard location, set `NEXUSRBX_STUDIO_PLUGINS_DIR` to an absolute path
ending in `Roblox/Plugins`; unsafe override paths are rejected.

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
3. Restart Studio and reopen the NexusRBX dock. The updated plugin refreshes its
   existing secure session automatically.
4. **Pair Studio** again only if the prior session has expired or was disconnected.
5. Confirm the dock shows the expected plugin version under the title.

Pairing attests the exact plugin build, protocol version, capabilities, and live
command registry. A target mismatch means the installed artifact is stale: it
may inspect the project, but AI mutations stay disabled until you run
`npm run plugin:install` and restart Studio. The current bundle repairs a
retained session automatically; re-pair only after an expired or disconnected
session. Editing files under `roblox-plugin/src/` does not update the installed
plugin on its own.

## Publishing to Roblox (cloud plugin)

See [PUBLISH.md](./PUBLISH.md). You must upload **only** the bundled `NexusRBXStudioBridge.plugin.lua` as a **single script**. Publishing the `src/` folder causes `Plugin.src.commands.*` parse errors in Studio.
