# Basic Workflow

This page explains the normal NexusRBX Ai workflow from prompt to tested script.

## Standard Flow

1. Open Roblox Studio.
2. Open NexusRBX Ai.
3. Describe what you want to build.
4. Include where the script will go.
5. Generate a Luau starting point.
6. Review the code.
7. Insert or copy the code.
8. Test in Play mode.
9. Ask follow-up prompts to improve or debug the result.

## Example Workflow

### 1. Describe the script

```text
Create a LocalScript for a sprint system. The script will go inside StarterPlayerScripts. When the player holds LeftShift, increase WalkSpeed from 16 to 24. Add a stamina value that drains while sprinting and regenerates when not sprinting.
```

### 2. Review the response

Check that the response includes:

- The correct script type.
- The correct location.
- Any required objects or setup steps.
- Notes about testing.

### 3. Insert or copy the code

Only insert or copy code after checking it. If object names do not match your game, update them first.

### 4. Test in Play mode

Use Roblox Studio Play mode and watch the Output window.

If an error appears, copy the exact error text and ask NexusRBX Ai to explain it.

## What To Include In Most Requests

| Include | Example |
| --- | --- |
| Goal | "Create a sprint system." |
| Script location | "Inside StarterPlayerScripts." |
| Script type | "LocalScript." |
| Object names | "RemoteEvent named BuyItemEvent." |
| Expected behavior | "Clicking the button should buy one item." |
| Current problem | "The button clicks but nothing happens." |

## Good Follow-Up Prompts

```text
Make this script easier for a beginner to understand and add comments only where they help.
```

```text
The Output window says: [PASTE ERROR HERE]. Explain the error and show the smallest fix.
```

```text
Change this to use a RemoteEvent so the server handles the reward securely.
```

