# Connecting NexusRBX Ai To Roblox Studio

This page explains how the plugin and Roblox Studio connection should work at a user level.

## Why Connection Matters

Some NexusRBX Ai workflows may need to know basic Studio context, such as where a script should go or whether Studio is ready for insertion. Connection helps the plugin support Studio-ready workflows while still requiring user review.

Exact connection behavior depends on the current NexusRBX Ai implementation:

- Studio connection method: `[Insert exact connection method]`
- Web app pairing required: `[Yes/No and details]`
- Plugin status label: `[Insert exact status label]`

## Connection Steps

1. Open Roblox Studio.
2. Open the place you want to work on.
3. Open NexusRBX Ai from the Plugins tab.
4. Sign in or connect your account if prompted.
5. Open the NexusRBX web app if pairing is required.
6. Confirm the plugin shows a connected status.
7. Start with a small prompt and review the generated output.

## What Connection Does Not Mean

Connection does not mean every generated suggestion should be inserted automatically.

Before accepting a change, check:

- The target script location.
- The script type.
- The object names referenced by the code.
- Any warnings shown by NexusRBX Ai.
- Whether the change affects important systems.

## Connection Status Checklist

| Status | Meaning | What to do |
| --- | --- | --- |
| Connected | Plugin can communicate with NexusRBX flow. | Start with a small prompt. |
| Not connected | Studio or account connection is incomplete. | Reopen the plugin and repeat setup. |
| Signing in | Account flow is still in progress. | Finish sign-in in the plugin or web app. |
| Outdated plugin | Plugin version may not match the current web app. | Update or reinstall from the Creator Store. |
| Error | Something failed during connection. | Copy the error and send it with a bug report. |

## If Connection Fails

Try one fix at a time:

1. Restart Roblox Studio.
2. Reopen the plugin.
3. Sign out and sign back in if the UI supports it.
4. Confirm your internet connection.
5. Update or reinstall the plugin.
6. Contact support with the exact error message.

