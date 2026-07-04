# Reviewing And Inserting Generated Code

This page explains how to review AI-generated Luau before inserting it into a Roblox project.

## Generated Code Is A Suggestion

NexusRBX Ai can generate a starting point, but your Roblox game has its own object names, folder structure, scripts, and gameplay rules.

Do not blindly insert code into important systems. Read the script first and test it in Studio.

## Review Checklist

| Check | Ask yourself |
| --- | --- |
| Script type | Is this a ServerScript, LocalScript, or ModuleScript? |
| Script location | Will this script run from the suggested location? |
| Object names | Do the names in the code match objects in Explorer? |
| Roblox services | Are the services correct for this task? |
| RemoteEvents | Are client and server responsibilities separated correctly? |
| Player data | Is data handled securely on the server? |
| Errors | Does the Output window show any warnings or errors? |

## Before You Insert

1. Read the generated code.
2. Compare object names with Explorer.
3. Confirm the script location.
4. Check for any setup steps.
5. Save your place or use source control if available.
6. Insert the code only after review.

## After You Insert

1. Run Play mode.
2. Test the exact behavior.
3. Watch the Output window.
4. Test with multiple players if the script affects multiplayer behavior.
5. Ask NexusRBX Ai for a fix if something fails.

## Extra Care Areas

Be more careful with code that affects:

- DataStore saves.
- developer products or game passes.
- RemoteEvents that grant rewards.
- admin commands.
- economy, inventory, or trading systems.
- moderation-sensitive user content.

For these systems, ask NexusRBX Ai to explain security risks and testing steps before using the code.

