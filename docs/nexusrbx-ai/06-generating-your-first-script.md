# Generating Your First Script

This page walks through a simple first script request for new NexusRBX Ai users.

## Choose A Simple First Script

Start with something low-risk, such as:

- Printing a setup message.
- Opening or closing a UI frame.
- Making a simple sprint script.
- Creating leaderstats for testing.

Avoid starting with player data, purchases, trading, moderation, or admin commands.

## Example First Prompt

```text
Create a beginner-friendly ServerScript for ServerScriptService. When a player joins, create leaderstats with Coins and Wins. Coins should start at 0 and Wins should start at 0. Include setup steps and how to test it in Play mode.
```

## Review The Output

Before inserting the code, confirm:

| Check | Why it matters |
| --- | --- |
| Script type is ServerScript | Leaderstats should be created on the server. |
| Location is ServerScriptService | This is a normal place for server logic. |
| Object names match the prompt | Typos can make debugging harder. |
| The code is understandable | You should know what it does before publishing. |
| Test steps are included | You need a way to confirm it works. |

## Insert Or Copy The Script

If NexusRBX Ai provides an insert button, review any confirmation screen before accepting.

If you copy manually:

1. In Roblox Studio, open ServerScriptService.
2. Insert a Script.
3. Paste the generated code.
4. Name the script clearly, such as `LeaderstatsSetup`.
5. Save your place.

## Test In Play Mode

1. Click Play.
2. Wait for your character to load.
3. Check the player list for Coins and Wins.
4. Open the Output window.
5. Look for errors.

If the values do not appear, ask:

```text
Debug this ServerScript. It is inside ServerScriptService. It should create leaderstats with Coins and Wins, but the values are not appearing on the leaderboard. Here is the script and Output error: [PASTE SCRIPT AND ERROR HERE].
```

