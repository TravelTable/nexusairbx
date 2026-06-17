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

## Creator Store imports

The website can queue a safe import for existing public Creator Store `Model` and `Mesh` assets. The backend verifies the asset again before queueing, then the plugin loads it with Roblox Studio's `AssetService:LoadAssetAsync(assetId)`.

Strict import sanitization keeps the loaded asset unparented while scanning. The plugin removes scripts, LocalScripts, ModuleScripts, RemoteEvents, RemoteFunctions, UnreliableRemoteEvents, BindableEvents, and BindableFunctions before placing the sanitized result under `Workspace/NexusImports` by default. Behavioural objects such as tools, prompts, sounds, humanoids, click detectors, package metadata, and suspicious constraints are reported as warnings for review. This reduces risk but does not guarantee an asset is harmless.

If Studio returns `THIRD_PARTY_ASSETS_DISABLED`, open **Game Settings / Experience Settings** in Roblox Studio and enable **Allow Loading Third Party Assets**, then retry. The plugin does not change that setting automatically.

Supported destination roots are `Workspace`, `ReplicatedStorage`, and `ServerStorage`. Phase 2 does not add paid 3D generation, GLB/FBX uploads, arbitrary URL fetching, unrestricted Luau execution, or runtime asset insertion for live players.

## Updating the plugin

If the website queues tools like `get_project_manifest` and the plugin reports **Unsupported Studio command**, your local plugin is out of date.

1. In Studio, open **Plugins > Manage Plugins** and remove the old **NexusRBX** local plugin.
2. Create a new `Script` in `ServerStorage`, paste the latest `NexusRBXStudioBridge.plugin.lua`, and **Save as Local Plugin** again.
3. Reopen the NexusRBX dock and **Pair Studio** again (pairing codes are session-specific).
4. Confirm the dock shows `Plugin 0.4.1-protocol` (or newer) under the title.
