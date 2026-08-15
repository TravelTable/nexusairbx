local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local runEvent = ReplicatedStorage:WaitForChild("NexusLiveGame"):WaitForChild("RunEvent")

local old = playerGui:FindFirstChild("NexusLiveRunHUD")
if old then old:Destroy() end

local gui = Instance.new("ScreenGui")
gui.Name = "NexusLiveRunHUD"
gui.IgnoreGuiInset = true
gui.ResetOnSpawn = false
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.Parent = playerGui

local function corner(parent, radius)
    local item = Instance.new("UICorner")
    item.CornerRadius = UDim.new(0, radius)
    item.Parent = parent
end

local function stroke(parent, color, thickness, transparency)
    local item = Instance.new("UIStroke")
    item.Color = color
    item.Thickness = thickness
    item.Transparency = transparency or 0
    item.Parent = parent
end

local shadow = Instance.new("Frame")
shadow.Name = "Shadow"
shadow.AnchorPoint = Vector2.new(0.5, 0)
shadow.Position = UDim2.new(0.5, 0, 0, 31)
shadow.Size = UDim2.new(0, 530, 0, 94)
shadow.BackgroundColor3 = Color3.new(0, 0, 0)
shadow.BackgroundTransparency = 0.58
shadow.BorderSizePixel = 0
shadow.Parent = gui
corner(shadow, 18)

local card = Instance.new("Frame")
card.Name = "RunCard"
card.AnchorPoint = Vector2.new(0.5, 0)
card.Position = UDim2.new(0.5, 0, 0, 24)
card.Size = UDim2.new(0, 530, 0, 94)
card.BackgroundColor3 = Color3.fromRGB(8, 13, 27)
card.BackgroundTransparency = 0.08
card.BorderSizePixel = 0
card.Parent = gui
corner(card, 18)
stroke(card, Color3.fromRGB(82, 145, 255), 1.5, 0.25)

local accent = Instance.new("Frame")
accent.Size = UDim2.new(0, 5, 1, -26)
accent.Position = UDim2.fromOffset(14, 13)
accent.BackgroundColor3 = Color3.fromRGB(45, 222, 255)
accent.BorderSizePixel = 0
accent.Parent = card
corner(accent, 3)

local title = Instance.new("TextLabel")
title.Position = UDim2.fromOffset(34, 15)
title.Size = UDim2.fromOffset(250, 26)
title.BackgroundTransparency = 1
title.Text = "NEXUS LIVE RUN"
title.TextColor3 = Color3.fromRGB(240, 247, 255)
title.Font = Enum.Font.GothamBold
title.TextSize = 20
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = card

local subtitle = Instance.new("TextLabel")
subtitle.Position = UDim2.fromOffset(34, 44)
subtitle.Size = UDim2.fromOffset(310, 34)
subtitle.BackgroundTransparency = 1
subtitle.Text = "Clear every checkpoint and reach the finish"
subtitle.TextColor3 = Color3.fromRGB(152, 169, 200)
subtitle.Font = Enum.Font.GothamMedium
subtitle.TextSize = 12
subtitle.TextWrapped = true
subtitle.TextXAlignment = Enum.TextXAlignment.Left
subtitle.Parent = card

local stagePill = Instance.new("TextLabel")
stagePill.Name = "StagePill"
stagePill.Position = UDim2.fromOffset(345, 16)
stagePill.Size = UDim2.fromOffset(88, 30)
stagePill.BackgroundColor3 = Color3.fromRGB(25, 40, 68)
stagePill.Text = "STAGE 0/3"
stagePill.TextColor3 = Color3.fromRGB(88, 242, 159)
stagePill.Font = Enum.Font.GothamBold
stagePill.TextSize = 12
stagePill.Parent = card
corner(stagePill, 15)
stroke(stagePill, Color3.fromRGB(70, 255, 120), 1, 0.5)

local timer = Instance.new("TextLabel")
timer.Name = "Timer"
timer.Position = UDim2.fromOffset(441, 15)
timer.Size = UDim2.fromOffset(74, 32)
timer.BackgroundTransparency = 1
timer.Text = "00:00.0"
timer.TextColor3 = Color3.fromRGB(45, 222, 255)
timer.Font = Enum.Font.Code
timer.TextSize = 17
timer.TextXAlignment = Enum.TextXAlignment.Right
timer.Parent = card

local progress = Instance.new("Frame")
progress.Position = UDim2.fromOffset(345, 58)
progress.Size = UDim2.fromOffset(170, 12)
progress.BackgroundTransparency = 1
progress.Parent = card

local progressLayout = Instance.new("UIListLayout")
progressLayout.FillDirection = Enum.FillDirection.Horizontal
progressLayout.HorizontalAlignment = Enum.HorizontalAlignment.Right
progressLayout.Padding = UDim.new(0, 8)
progressLayout.Parent = progress

local dots = {}
for index = 1, 3 do
    local dot = Instance.new("Frame")
    dot.Name = "Checkpoint" .. index
    dot.Size = UDim2.fromOffset(38, 8)
    dot.BackgroundColor3 = Color3.fromRGB(45, 58, 83)
    dot.BorderSizePixel = 0
    dot.LayoutOrder = index
    dot.Parent = progress
    corner(dot, 4)
    dots[index] = dot
end

local toast = Instance.new("TextLabel")
toast.Name = "Toast"
toast.AnchorPoint = Vector2.new(0.5, 1)
toast.Position = UDim2.new(0.5, 0, 1, -48)
toast.Size = UDim2.fromOffset(390, 52)
toast.BackgroundColor3 = Color3.fromRGB(9, 16, 31)
toast.BackgroundTransparency = 1
toast.TextTransparency = 1
toast.TextColor3 = Color3.fromRGB(235, 244, 255)
toast.Font = Enum.Font.GothamBold
toast.TextSize = 15
toast.Text = ""
toast.Visible = false
toast.Parent = gui
corner(toast, 14)
stroke(toast, Color3.fromRGB(70, 255, 120), 1.5, 0.3)

local finishOverlay = Instance.new("Frame")
finishOverlay.Name = "FinishOverlay"
finishOverlay.AnchorPoint = Vector2.new(0.5, 0.5)
finishOverlay.Position = UDim2.fromScale(0.5, 0.5)
finishOverlay.Size = UDim2.fromOffset(440, 230)
finishOverlay.BackgroundColor3 = Color3.fromRGB(7, 13, 27)
finishOverlay.BackgroundTransparency = 0.04
finishOverlay.Visible = false
finishOverlay.Parent = gui
corner(finishOverlay, 24)
stroke(finishOverlay, Color3.fromRGB(45, 222, 255), 2, 0.1)

local finishTitle = Instance.new("TextLabel")
finishTitle.Position = UDim2.fromOffset(24, 30)
finishTitle.Size = UDim2.new(1, -48, 0, 42)
finishTitle.BackgroundTransparency = 1
finishTitle.Text = "PIPELINE COMPLETE"
finishTitle.TextColor3 = Color3.fromRGB(45, 222, 255)
finishTitle.Font = Enum.Font.GothamBlack
finishTitle.TextSize = 26
finishTitle.Parent = finishOverlay

local finishTime = Instance.new("TextLabel")
finishTime.Position = UDim2.fromOffset(24, 82)
finishTime.Size = UDim2.new(1, -48, 0, 60)
finishTime.BackgroundTransparency = 1
finishTime.Text = "00:00.0"
finishTime.TextColor3 = Color3.fromRGB(244, 249, 255)
finishTime.Font = Enum.Font.Code
finishTime.TextSize = 40
finishTime.Parent = finishOverlay

local finishHint = Instance.new("TextLabel")
finishHint.Position = UDim2.fromOffset(24, 158)
finishHint.Size = UDim2.new(1, -48, 0, 38)
finishHint.BackgroundTransparency = 1
finishHint.Text = "Returning to the start for another run…"
finishHint.TextColor3 = Color3.fromRGB(157, 174, 205)
finishHint.Font = Enum.Font.GothamMedium
finishHint.TextSize = 13
finishHint.Parent = finishOverlay

local function formatTime(seconds)
    seconds = math.max(0, seconds or 0)
    local minutes = math.floor(seconds / 60)
    local remaining = seconds - minutes * 60
    return string.format("%02d:%04.1f", minutes, remaining)
end

local toastVersion = 0
local function showToast(message, color)
    toastVersion += 1
    local version = toastVersion
    toast.Text = message
    toast.TextColor3 = color or Color3.fromRGB(235, 244, 255)
    toast.Visible = true
    TweenService:Create(toast, TweenInfo.new(0.18), { BackgroundTransparency = 0.08, TextTransparency = 0 }):Play()
    task.delay(2.2, function()
        if version ~= toastVersion then return end
        local tween = TweenService:Create(toast, TweenInfo.new(0.22), { BackgroundTransparency = 1, TextTransparency = 1 })
        tween:Play()
        tween.Completed:Wait()
        if version == toastVersion then toast.Visible = false end
    end)
end

local stageValue
local function updateProgress()
    local stage = stageValue and stageValue.Value or 0
    stagePill.Text = string.format("STAGE %d/3", stage)
    for index, dot in ipairs(dots) do
        local active = index <= stage
        TweenService:Create(dot, TweenInfo.new(0.2), {
            BackgroundColor3 = active and Color3.fromRGB(70, 255, 120) or Color3.fromRGB(45, 58, 83),
        }):Play()
    end
end

task.spawn(function()
    local leaderstats = player:WaitForChild("leaderstats", 15)
    stageValue = leaderstats and leaderstats:WaitForChild("Stage", 5)
    if stageValue then
        stageValue.Changed:Connect(updateProgress)
        updateProgress()
    end
end)

RunService.RenderStepped:Connect(function()
    if player:GetAttribute("NexusRunCompleted") then return end
    local startedAt = player:GetAttribute("RunStartedAt")
    if startedAt then timer.Text = formatTime(Workspace:GetServerTimeNow() - startedAt) end
end)

runEvent.OnClientEvent:Connect(function(kind, payload)
    payload = payload or {}
    if kind == "checkpoint" then
        showToast(string.format("CHECKPOINT %d/3 SECURED", payload.stage or 0), Color3.fromRGB(70, 255, 120))
    elseif kind == "blocked" then
        showToast(string.format("REACH CHECKPOINT %d NEXT", (payload.stage or 0) + 1), Color3.fromRGB(255, 185, 80))
    elseif kind == "finish" then
        toastVersion += 1
        toast.Visible = false
        toast.BackgroundTransparency = 1
        toast.TextTransparency = 1
        timer.Text = formatTime(payload.time)
        finishTime.Text = formatTime(payload.time)
        finishHint.Text = payload.isBest and "NEW BEST — returning to the start…" or "Returning to the start for another run…"
        finishOverlay.Visible = true
        finishOverlay.Size = UDim2.fromOffset(390, 198)
        TweenService:Create(finishOverlay, TweenInfo.new(0.28, Enum.EasingStyle.Back), { Size = UDim2.fromOffset(440, 230) }):Play()
    elseif kind == "reset" then
        finishOverlay.Visible = false
        showToast("NEW RUN STARTED", Color3.fromRGB(45, 222, 255))
    elseif kind == "start" then
        showToast("RUN TIMER STARTED", Color3.fromRGB(45, 222, 255))
    end
end)

print("[NexusLive] Client HUD ready")
