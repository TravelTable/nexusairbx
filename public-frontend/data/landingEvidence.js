export const landingEvidenceBySlug = {
  "roblox-script-generator": {
    id: "script-generator-round-timer",
    title: "Complete server round timer",
    summary:
      "A focused one-file result that owns round state on the server and publishes timer updates for client UI.",
    prompt:
      "Create a server round timer with a 20-second intermission, a 90-second round, and a RemoteEvent that updates clients.",
    files: [
      {
        filename: "RoundTimer.server.lua",
        className: "Script",
        location: "ServerScriptService/RoundTimer",
        code: `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local timerEvent = ReplicatedStorage:FindFirstChild("RoundTimerUpdate")
if not timerEvent then
    timerEvent = Instance.new("RemoteEvent")
    timerEvent.Name = "RoundTimerUpdate"
    timerEvent.Parent = ReplicatedStorage
end

local INTERMISSION_SECONDS = 20
local ROUND_SECONDS = 90

local function countdown(phase, duration)
    for remaining = duration, 0, -1 do
        timerEvent:FireAllClients({
            phase = phase,
            remaining = remaining,
        })
        task.wait(1)
    end
end

while true do
    countdown("Intermission", INTERMISSION_SECONDS)

    if #Players:GetPlayers() > 0 then
        countdown("Round", ROUND_SECONDS)
    else
        timerEvent:FireAllClients({
            phase = "Waiting for players",
            remaining = 0,
        })
        task.wait(2)
    end
end`,
      },
    ],
    setup: [
      "Create a Script named RoundTimer under ServerScriptService.",
      "Paste the complete file above. It creates ReplicatedStorage/RoundTimerUpdate when needed.",
      "Connect a LocalScript HUD to RoundTimerUpdate if the timer should be visible.",
    ],
    verification: [
      "Run a two-player Studio test and inspect the RemoteEvent payloads.",
      "Confirm Intermission counts from 20 and Round counts from 90.",
      "Stop all clients and confirm the waiting state is published without an error.",
    ],
    expectedResult:
      "All connected clients receive the same phase and remaining-time payload once per second.",
    limitations:
      "This focused example does not choose maps, detect winners, award currency, or draw a HUD. Verify it in a test place before release.",
  },

  "roblox-ai-scripter": {
    id: "ai-scripter-respawn-debug",
    title: "Before-and-after respawn debugging",
    summary:
      "The failure fixture keeps a stale Humanoid reference. The repaired LocalScript refreshes that reference whenever CharacterAdded fires.",
    prompt:
      "My sprint LocalScript works once, then stops after respawn. Explain the cause and rewrite it with CharacterAdded handling.",
    files: [
      {
        label: "Before: reproducible failure fixture",
        filename: "Sprint.before.client.lua",
        className: "LocalScript",
        location: "StarterPlayer/StarterPlayerScripts/Sprint",
        code: `local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")

UserInputService.InputBegan:Connect(function(input, processed)
    if not processed and input.KeyCode == Enum.KeyCode.LeftShift then
        humanoid.WalkSpeed = 24
    end
end)

UserInputService.InputEnded:Connect(function(input)
    if input.KeyCode == Enum.KeyCode.LeftShift then
        humanoid.WalkSpeed = 16
    end
end)`,
      },
      {
        label: "After: refreshed character state",
        filename: "Sprint.client.lua",
        className: "LocalScript",
        location: "StarterPlayer/StarterPlayerScripts/Sprint",
        code: `local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local humanoid: Humanoid? = nil
local sprinting = false

local function applySpeed()
    if humanoid then
        humanoid.WalkSpeed = if sprinting then 24 else 16
    end
end

local function onCharacterAdded(character: Model)
    humanoid = character:WaitForChild("Humanoid") :: Humanoid
    applySpeed()
end

player.CharacterRemoving:Connect(function()
    humanoid = nil
end)

player.CharacterAdded:Connect(onCharacterAdded)
if player.Character then
    onCharacterAdded(player.Character)
end

UserInputService.InputBegan:Connect(function(input, processed)
    if not processed and input.KeyCode == Enum.KeyCode.LeftShift then
        sprinting = true
        applySpeed()
    end
end)

UserInputService.InputEnded:Connect(function(input)
    if input.KeyCode == Enum.KeyCode.LeftShift then
        sprinting = false
        applySpeed()
    end
end)`,
      },
    ],
    setup: [
      "Put only the repaired Sprint.client.lua in StarterPlayerScripts.",
      "Leave StarterPlayer.CharacterWalkSpeed at 16, or change both speed constants to match your game.",
      "Use the before file only as a failure fixture in a disposable test place.",
    ],
    verification: [
      "Hold Left Shift and confirm WalkSpeed becomes 24, then returns to 16.",
      "Reset the character and repeat the same input after respawn.",
      "Reset while holding Shift and confirm the new Humanoid receives the current sprint state.",
    ],
    expectedResult:
      "Sprint input continues to work after every respawn because the script no longer writes to the destroyed Humanoid.",
    limitations:
      "Client movement speed can still be manipulated by an exploiter. Server systems must independently validate speed-sensitive gameplay.",
  },

  "roblox-lua-script-generator": {
    id: "lua-generator-strict-module",
    title: "Typed Luau weighted-reward module",
    summary:
      "A strict, reusable ModuleScript with an exported record type, validation, and injectable randomness for deterministic tests.",
    prompt:
      "Write a --!strict Luau module that chooses a weighted reward and rejects empty or invalid reward tables.",
    files: [
      {
        filename: "WeightedRewards.lua",
        className: "ModuleScript",
        location: "ReplicatedStorage/Shared/WeightedRewards",
        code: `--!strict

export type Reward = {
    name: string,
    weight: number,
}

local WeightedRewards = {}

function WeightedRewards.choose(
    rewards: { Reward },
    random: Random?
): Reward
    assert(#rewards > 0, "At least one reward is required")

    local totalWeight = 0
    for _, reward in rewards do
        assert(reward.weight > 0, "Reward weights must be positive")
        totalWeight += reward.weight
    end

    local generator = random or Random.new()
    local roll = generator:NextNumber(0, totalWeight)
    local cursor = 0

    for _, reward in rewards do
        cursor += reward.weight
        if roll <= cursor then
            return reward
        end
    end

    return rewards[#rewards]
end

return WeightedRewards`,
      },
    ],
    setup: [
      "Create ReplicatedStorage/Shared and add a ModuleScript named WeightedRewards.",
      "Require it from a server Script for authoritative reward selection.",
      "Pass Random.new(seed) in tests when you need repeatable selections.",
    ],
    verification: [
      "Call choose with two positive weights and confirm it returns one of the supplied records.",
      "Pass an empty table and confirm the assertion identifies the missing rewards.",
      "Pass a zero or negative weight and confirm validation fails before selection.",
    ],
    expectedResult:
      "Callers receive one typed Reward record, while malformed configuration fails with a specific assertion.",
    limitations:
      "This module only selects a value. The server must separately grant, persist, and audit any valuable reward.",
  },

  "roblox-studio-script-generator": {
    id: "studio-generator-multifile-round-system",
    title: "Three-file Studio round system",
    summary:
      "A placement-aware example that separates shared configuration, server-owned state, and client HUD rendering.",
    prompt:
      "Build a Studio-ready round system with shared timing config, server countdown state, and a client HUD.",
    files: [
      {
        filename: "RoundConfig.lua",
        className: "ModuleScript",
        location: "ReplicatedStorage/RoundSystem/RoundConfig",
        code: `--!strict

return {
    intermissionSeconds = 10,
    roundSeconds = 60,
}`,
      },
      {
        filename: "RoundService.server.lua",
        className: "Script",
        location: "ServerScriptService/RoundService",
        code: `local ReplicatedStorage = game:GetService("ReplicatedStorage")

local roundSystem = ReplicatedStorage:WaitForChild("RoundSystem")
local config = require(roundSystem:WaitForChild("RoundConfig"))

local stateEvent = roundSystem:FindFirstChild("RoundState")
if not stateEvent then
    stateEvent = Instance.new("RemoteEvent")
    stateEvent.Name = "RoundState"
    stateEvent.Parent = roundSystem
end

local function countdown(phase, duration)
    for remaining = duration, 0, -1 do
        stateEvent:FireAllClients(phase, remaining)
        task.wait(1)
    end
end

while true do
    countdown("Intermission", config.intermissionSeconds)
    countdown("Round", config.roundSeconds)
end`,
      },
      {
        filename: "RoundHud.client.lua",
        className: "LocalScript",
        location: "StarterPlayer/StarterPlayerScripts/RoundHud",
        code: `local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local stateEvent = ReplicatedStorage
    :WaitForChild("RoundSystem")
    :WaitForChild("RoundState")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "RoundHud"
screenGui.ResetOnSpawn = false
screenGui.Parent = Players.LocalPlayer:WaitForChild("PlayerGui")

local label = Instance.new("TextLabel")
label.AnchorPoint = Vector2.new(0.5, 0)
label.Position = UDim2.fromScale(0.5, 0.04)
label.Size = UDim2.fromScale(0.34, 0.08)
label.BackgroundTransparency = 0.2
label.TextScaled = true
label.Parent = screenGui

stateEvent.OnClientEvent:Connect(function(phase, remaining)
    label.Text = string.format("%s: %d", phase, remaining)
end)`,
      },
    ],
    setup: [
      "Create ReplicatedStorage/RoundSystem and place RoundConfig inside it.",
      "Place RoundService in ServerScriptService and RoundHud in StarterPlayerScripts.",
      "Keep the names unchanged, or update every WaitForChild path together.",
    ],
    verification: [
      "Start a server with two clients and confirm both HUDs show the same value.",
      "Change the two config durations and confirm the server uses the new values.",
      "Reset one character and confirm ResetOnSpawn keeps the HUD connected.",
    ],
    expectedResult:
      "One server controls the phase while each client renders the same state through a small, replaceable HUD.",
    limitations:
      "This architecture example omits map loading, minimum-player checks, winners, cleanup, and rewards. Add those as separate server-owned responsibilities.",
  },

  "roblox-gui-maker": {
    id: "gui-maker-responsive-hud",
    title: "Responsive status HUD",
    summary:
      "A complete LocalScript that builds a scale-based ScreenGui with safe size limits and a text-scaled status label.",
    prompt:
      "Create a responsive Roblox HUD that shows the current objective and stays readable on phone, tablet, and desktop.",
    files: [
      {
        filename: "StatusHud.client.lua",
        className: "LocalScript",
        location: "StarterPlayer/StarterPlayerScripts/StatusHud",
        code: `local Players = game:GetService("Players")

local playerGui = Players.LocalPlayer:WaitForChild("PlayerGui")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "StatusHud"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = false
screenGui.Parent = playerGui

local panel = Instance.new("Frame")
panel.Name = "StatusPanel"
panel.AnchorPoint = Vector2.new(0.5, 0)
panel.Position = UDim2.fromScale(0.5, 0.04)
panel.Size = UDim2.fromScale(0.5, 0.1)
panel.BackgroundColor3 = Color3.fromRGB(16, 20, 31)
panel.BackgroundTransparency = 0.12
panel.Parent = screenGui

local sizeConstraint = Instance.new("UISizeConstraint")
sizeConstraint.MinSize = Vector2.new(240, 56)
sizeConstraint.MaxSize = Vector2.new(620, 96)
sizeConstraint.Parent = panel

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 14)
corner.Parent = panel

local padding = Instance.new("UIPadding")
padding.PaddingLeft = UDim.new(0.04, 0)
padding.PaddingRight = UDim.new(0.04, 0)
padding.Parent = panel

local label = Instance.new("TextLabel")
label.Name = "Objective"
label.Size = UDim2.fromScale(1, 1)
label.BackgroundTransparency = 1
label.Font = Enum.Font.GothamBold
label.Text = "Objective: Reach the checkpoint"
label.TextColor3 = Color3.fromRGB(245, 247, 255)
label.TextScaled = true
label.TextWrapped = true
label.Parent = panel

local textConstraint = Instance.new("UITextSizeConstraint")
textConstraint.MinTextSize = 14
textConstraint.MaxTextSize = 28
textConstraint.Parent = label`,
      },
    ],
    setup: [
      "Create a LocalScript named StatusHud under StarterPlayerScripts.",
      "Paste the file above; it builds the ScreenGui inside the local PlayerGui.",
      "Replace the static objective text from your own client event or state controller.",
    ],
    verification: [
      "Use Studio device emulation for a narrow phone, tablet, and desktop.",
      "Confirm the panel stays between its 240px minimum and 620px maximum.",
      "Use a longer objective and confirm wrapping does not overflow the panel.",
    ],
    expectedResult:
      "The HUD stays centered and readable across viewport sizes without depending on one fixed pixel width.",
    limitations:
      "The example renders local text only. Objective state that affects progression must come from server-authoritative logic.",
  },
};

export function getLandingEvidence(slug) {
  return landingEvidenceBySlug[slug] || null;
}
