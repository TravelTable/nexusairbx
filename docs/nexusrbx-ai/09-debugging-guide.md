# Debugging Guide

This page explains how to use NexusRBX Ai to understand and fix Roblox script problems.

## Start With The Exact Error

When Roblox Studio shows an error, copy the full line from the Output window.

Include:

- The error message.
- The script name.
- The line number.
- The script type.
- Where the script is located.
- What should happen.
- What actually happens.

## Debug Prompt Template

```text
Debug this [ServerScript/LocalScript/ModuleScript]. It is inside [location]. It should [expected behavior], but [actual behavior]. The Output window says: [PASTE ERROR HERE]. Explain the cause and show the smallest safe fix.
```

## Test One Fix At A Time

1. Change one thing.
2. Run Play mode.
3. Check Output.
4. Confirm whether the behavior changed.
5. Save the working version before making another change.

Testing one fix at a time makes it easier to know what solved the problem.

## Common Roblox Debugging Issues

| Issue | What it usually means | What to check |
| --- | --- | --- |
| Object not found | The script path or object name is wrong. | Explorer names, capitalization, and WaitForChild usage. |
| Wrong script type | The script is running in the wrong environment. | ServerScript versus LocalScript. |
| RemoteEvent missing | The code expects a RemoteEvent that does not exist. | ReplicatedStorage and exact object names. |
| LocalScript will not run | LocalScripts only run from certain locations. | StarterPlayerScripts, StarterGui, StarterCharacterScripts, tools, or player-owned containers. |
| Server/client mismatch | Client code is trying to do server work, or the reverse. | Move secure logic to the server and use RemoteEvents carefully. |
| Misspelled object names | Roblox paths are case-sensitive. | Compare every name in code with Explorer. |
| Code runs before objects load | The script starts before objects exist. | Use WaitForChild where appropriate. |

## Ask For An Explanation

If you do not understand the fix, ask:

```text
Explain why this fix works in beginner-friendly language. Also explain what I should test in Roblox Studio.
```

Understanding the fix helps you avoid the same issue later.

