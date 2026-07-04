# Understanding Script Types

This page explains the main Roblox script types in beginner-friendly terms.

## ServerScript

ServerScripts run on the Roblox server. They are used for game logic that should be trusted and shared across players.

Use ServerScripts for:

- leaderstats.
- rewards.
- DataStore saving.
- server-side combat rules.
- secure shop checks.
- RemoteEvent handlers.

Common locations:

- ServerScriptService.
- Workspace for specific objects when appropriate.

Example prompt:

```text
Create a ServerScript for ServerScriptService that creates leaderstats with Coins and Wins when a player joins.
```

## LocalScript

LocalScripts run for an individual player. They are used for player-specific behavior such as UI, camera, input, and local effects.

Use LocalScripts for:

- UI buttons.
- player input.
- camera effects.
- local animations and effects.
- client-side RemoteEvent requests.

Common locations:

- StarterPlayerScripts.
- StarterGui.
- StarterCharacterScripts.
- Tools.

Example prompt:

```text
Create a LocalScript inside StarterGui that opens ShopFrame when OpenShopButton is clicked.
```

## ModuleScript

ModuleScripts store reusable code that other scripts can require.

Use ModuleScripts for:

- shared configuration.
- reusable functions.
- item data.
- ability definitions.
- utility code used by multiple scripts.

Common locations:

- ReplicatedStorage for shared client/server modules.
- ServerScriptService for server-only modules.

Example prompt:

```text
Create a ModuleScript named ItemConfig in ReplicatedStorage that stores item prices and display names. Also show how a ServerScript can require it.
```

## Quick Comparison

| Script type | Runs where | Best for | Common mistake |
| --- | --- | --- | --- |
| ServerScript | Server | Secure game logic and shared systems | Trying to control player UI directly. |
| LocalScript | Player client | UI, input, camera, local effects | Placing it somewhere it will not run. |
| ModuleScript | Required by other scripts | Reusable code and data | Expecting it to run by itself. |

