# Prompting Guide

This page teaches users how to write clear prompts that produce more useful Luau suggestions.

## What To Include

Good prompts usually include:

- What you want the script to do.
- Where the script will be placed.
- Whether it is a ServerScript, LocalScript, or ModuleScript.
- Relevant object names.
- Current errors.
- Expected behavior.
- What is actually happening.
- Roblox services being used.
- Whether the code should be beginner-friendly, optimized, or modular.

## Bad Prompts And Better Prompts

| Bad prompt | Better prompt |
| --- | --- |
| "make a shop" | "Create a LocalScript for a shop button inside StarterGui. When the player clicks the button, it should fire a RemoteEvent named BuyItemEvent in ReplicatedStorage." |
| "fix my script" | "Debug this ServerScript. It is inside ServerScriptService. It should create leaderstats with Coins and Wins, but the values are not appearing on the leaderboard. Here is the error: [PASTE ERROR HERE]." |
| "make a game" | "Turn this game idea into a script plan for Roblox Studio. The game is a round-based obby. Include needed scripts, RemoteEvents, UI, and testing steps." |
| "add sprint" | "Create a LocalScript for a sprint system. The script will go inside StarterPlayerScripts. When the player holds LeftShift, increase WalkSpeed from 16 to 24. Add stamina that drains and regenerates." |
| "make it work" | "This LocalScript is inside StarterGui. The button should open a Frame, but clicking it does nothing. Explain the issue and show a fixed version. Error: [PASTE ERROR HERE]." |

## Prompt Templates

### Generate a script

```text
Create a [ServerScript/LocalScript/ModuleScript] for [feature]. It will go inside [location]. It should [expected behavior]. The important object names are [object names]. Make it beginner-friendly and include setup steps.
```

### Debug a script

```text
Debug this [script type]. It is inside [location]. It should [expected behavior], but [actual behavior]. The Output window says: [error message]. Explain the issue and show a fixed version.
```

### Explain code

```text
Explain this script in beginner-friendly language. Tell me what each main section does, what objects it expects to exist, and what could break.
```

## Strong Example Prompts

```text
Create a LocalScript for a sprint system. The script will go inside StarterPlayerScripts. When the player holds LeftShift, increase WalkSpeed from 16 to 24. Add a stamina value that drains while sprinting and regenerates when not sprinting.
```

```text
Debug this ServerScript. It is inside ServerScriptService. It should create leaderstats with Coins and Wins, but the values are not appearing on the leaderboard.
```

```text
Create a LocalScript for a shop button inside StarterGui. When the player clicks the button, it should fire a RemoteEvent named BuyItemEvent in ReplicatedStorage.
```

```text
Explain this error and show me how to fix it: [PASTE ERROR HERE]. The script is a LocalScript inside StarterGui.
```

