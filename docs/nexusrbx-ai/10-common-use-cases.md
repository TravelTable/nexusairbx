# Common Use Cases

This page gives practical prompt patterns for common Roblox scripting tasks.

## Sprint System

| Field | Guidance |
| --- | --- |
| What to ask | Create a sprint system with keybind, speed change, and stamina. |
| Context to include | LocalScript, StarterPlayerScripts, speed values, keybind, stamina rules. |
| Example prompt | "Create a LocalScript for StarterPlayerScripts. Holding LeftShift should increase WalkSpeed from 16 to 24. Add stamina that drains while sprinting and regenerates when not sprinting." |
| Check after generation | Character movement, stamina limits, mobile support needs, Output errors. |

## Leaderstats

| Field | Guidance |
| --- | --- |
| What to ask | Create leaderboard values for players. |
| Context to include | ServerScript, ServerScriptService, value names, starting values. |
| Example prompt | "Create a ServerScript for ServerScriptService that creates leaderstats with Coins and Wins when a player joins. Both values should start at 0." |
| Check after generation | Player list values, server placement, no duplicate leaderstats. |

## Shop Button

| Field | Guidance |
| --- | --- |
| What to ask | Connect a UI button to a purchase request. |
| Context to include | LocalScript location, button name, RemoteEvent name, server validation needs. |
| Example prompt | "Create a LocalScript for a shop button inside StarterGui. When clicked, it fires a RemoteEvent named BuyItemEvent in ReplicatedStorage with the item id Sword01." |
| Check after generation | Button path, RemoteEvent exists, server validates the purchase. |

## UI Open And Close Button

| Field | Guidance |
| --- | --- |
| What to ask | Toggle a Frame when buttons are clicked. |
| Context to include | ScreenGui name, button names, frame name. |
| Example prompt | "Create a LocalScript inside StarterGui for a ScreenGui named ShopGui. Clicking OpenShopButton should show ShopFrame, and clicking CloseButton should hide it." |
| Check after generation | UI object names, frame visibility, script location. |

## Tool Script

| Field | Guidance |
| --- | --- |
| What to ask | Add behavior when a player uses a Tool. |
| Context to include | Tool name, Script or LocalScript, activated behavior, RemoteEvent if needed. |
| Example prompt | "Create a Script for a Tool named SpeedPotion. When activated, it increases the player's WalkSpeed for 10 seconds, then returns it to normal." |
| Check after generation | Tool placement, cooldown needs, exploit-sensitive logic. |

## RemoteEvent Connection

| Field | Guidance |
| --- | --- |
| What to ask | Connect client UI to secure server logic. |
| Context to include | RemoteEvent name, ReplicatedStorage location, client action, server validation. |
| Example prompt | "Show me a LocalScript and ServerScript that use a RemoteEvent named ClaimRewardEvent in ReplicatedStorage. The client asks to claim a reward, and the server checks whether the player can receive it." |
| Check after generation | Server validates rewards, no trusting client-only values. |

## NPC Interaction

| Field | Guidance |
| --- | --- |
| What to ask | Add prompt or click interaction for an NPC. |
| Context to include | NPC model name, ProximityPrompt or ClickDetector, desired action. |
| Example prompt | "Create a ServerScript for an NPC named QuestGiver. When a player triggers a ProximityPrompt, print the player's name and show where to add quest logic later." |
| Check after generation | Prompt location, NPC object path, multiplayer behavior. |

## Debugging An Error Message

| Field | Guidance |
| --- | --- |
| What to ask | Explain and fix a Studio Output error. |
| Context to include | Full error, script type, script location, current code. |
| Example prompt | "Explain this error and show me how to fix it: [PASTE ERROR HERE]. The script is a LocalScript inside StarterGui." |
| Check after generation | Fix matches line number, no unrelated rewrite, Play mode passes. |

## Explaining An Existing Script

| Field | Guidance |
| --- | --- |
| What to ask | Explain what the script does and what objects it needs. |
| Context to include | Script type, location, code. |
| Example prompt | "Explain this script for a beginner. Tell me what each section does, what objects it expects, and what could break." |
| Check after generation | Explanation matches the code and helps you edit safely. |

## Turning Rough Game Ideas Into Script Plans

| Field | Guidance |
| --- | --- |
| What to ask | Break an idea into scripts, UI, objects, and testing steps. |
| Context to include | Game genre, main loop, player actions, data needs. |
| Example prompt | "Turn this idea into a Roblox scripting plan: a round-based obby where players race for coins. Include scripts, RemoteEvents, UI, and testing steps." |
| Check after generation | Plan is realistic, split into steps, and avoids claiming the full game is finished. |

