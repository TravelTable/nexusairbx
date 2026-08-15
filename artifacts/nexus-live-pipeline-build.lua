local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerStorage = game:GetService("ServerStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local StarterGui = game:GetService("StarterGui")
local Lighting = game:GetService("Lighting")

local backups = ServerStorage:FindFirstChild("NexusLiveBackups") or Instance.new("Folder")
backups.Name = "NexusLiveBackups"
backups.Parent = ServerStorage

local existing = Workspace:FindFirstChild("NexusLiveGame")
if existing then
    local backup = existing:Clone()
    backup.Name = "NexusLiveGame_PreBuild"
    local previous = backups:FindFirstChild(backup.Name)
    if previous then previous:Destroy() end
    backup.Parent = backups
else
    existing = Instance.new("Folder")
    existing.Name = "NexusLiveGame"
    existing.Parent = Workspace
end

local oldCourse = existing:FindFirstChild("NexusLiveCourse")
if oldCourse then oldCourse:Destroy() end

local course = Instance.new("Model")
course.Name = "NexusLiveCourse"
course:SetAttribute("NexusLiveSystem", true)
course:SetAttribute("CourseVersion", 1)
course.Parent = existing

local function makePart(name, size, cframe, color, material, role)
    local part = Instance.new("Part")
    part.Name = name
    part.Size = size
    part.CFrame = cframe
    part.Anchored = true
    part.CanCollide = true
    part.CanTouch = true
    part.CanQuery = true
    part.CastShadow = true
    part.Color = color
    part.Material = material
    part:SetAttribute("NexusLiveRole", role or name)
    part.Parent = course
    return part
end

local start = makePart("StartPlatform", Vector3.new(24, 2, 24), CFrame.new(0, 2, 0), Color3.fromRGB(12, 28, 68), Enum.Material.Metal, "Start")
local spawn = Instance.new("SpawnLocation")
spawn.Name = "StartSpawn"
spawn.Size = Vector3.new(8, 1, 8)
spawn.CFrame = CFrame.new(0, 3.6, 0)
spawn.Anchored = true
spawn.CanCollide = true
spawn.Neutral = true
spawn.Duration = 0
spawn.Color = Color3.fromRGB(30, 64, 175)
spawn.Material = Enum.Material.Neon
spawn:SetAttribute("NexusLiveRole", "Spawn")
spawn.Parent = course

local obstacleSpecs = {
    {"Obstacle01", Vector3.new(10, 2, 8), CFrame.new(-6, 5, 22), Color3.fromRGB(255, 140, 66), Enum.Material.SmoothPlastic},
    {"Obstacle02", Vector3.new(8, 2, 8), CFrame.new(7, 8, 38) * CFrame.Angles(0, math.rad(18), 0), Color3.fromRGB(160, 110, 255), Enum.Material.Neon},
    {"Obstacle03", Vector3.new(16, 2, 5), CFrame.new(-4, 11, 55) * CFrame.Angles(0, math.rad(-14), 0), Color3.fromRGB(44, 200, 190), Enum.Material.Metal},
    {"Obstacle04", Vector3.new(6, 2, 12), CFrame.new(8, 14, 72) * CFrame.Angles(0, math.rad(22), 0), Color3.fromRGB(250, 205, 70), Enum.Material.WoodPlanks},
    {"Obstacle05", Vector3.new(12, 2, 5), CFrame.new(-8, 17, 90) * CFrame.Angles(0, math.rad(-22), 0), Color3.fromRGB(255, 92, 136), Enum.Material.Neon},
    {"Obstacle06", Vector3.new(7, 2, 14), CFrame.new(5, 20, 108) * CFrame.Angles(0, math.rad(16), 0), Color3.fromRGB(72, 155, 255), Enum.Material.DiamondPlate},
    {"Obstacle07", Vector3.new(15, 2, 5), CFrame.new(-5, 23, 126) * CFrame.Angles(0, math.rad(-18), 0), Color3.fromRGB(120, 235, 115), Enum.Material.Grass},
    {"Obstacle08", Vector3.new(9, 2, 9), CFrame.new(6, 26, 144) * CFrame.Angles(0, math.rad(30), 0), Color3.fromRGB(255, 160, 45), Enum.Material.Neon},
}
for _, spec in ipairs(obstacleSpecs) do
    makePart(spec[1], spec[2], spec[3], spec[4], spec[5], spec[1])
end

local lava = makePart("LavaFloor", Vector3.new(54, 2, 190), CFrame.new(0, -3, 80), Color3.fromRGB(255, 35, 35), Enum.Material.Neon, "Lava")
lava.CanCollide = false

local checkpoints = {
    {"Checkpoint01", Vector3.new(-4, 13.2, 58), 1},
    {"Checkpoint02", Vector3.new(-8, 19.2, 94), 2},
    {"Checkpoint03", Vector3.new(-5, 25.2, 130), 3},
}
for _, item in ipairs(checkpoints) do
    local checkpoint = makePart(item[1], Vector3.new(11, 1, 11), CFrame.new(item[2]), Color3.fromRGB(70, 255, 120), Enum.Material.Neon, "Checkpoint")
    checkpoint:SetAttribute("CheckpointNumber", item[3])
end

local finish = makePart("FinishPad", Vector3.new(22, 2, 22), CFrame.new(0, 29, 165), Color3.fromRGB(25, 225, 255), Enum.Material.Neon, "Finish")

local function addBillboard(parent, title, subtitle, color)
    local gui = Instance.new("BillboardGui")
    gui.Name = "CourseLabel"
    gui.Size = UDim2.fromOffset(220, 64)
    gui.StudsOffsetWorldSpace = Vector3.new(0, 4, 0)
    gui.AlwaysOnTop = true
    gui.MaxDistance = 220
    gui.Parent = parent

    local frame = Instance.new("Frame")
    frame.Size = UDim2.fromScale(1, 1)
    frame.BackgroundColor3 = Color3.fromRGB(8, 12, 24)
    frame.BackgroundTransparency = 0.12
    frame.Parent = gui
    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 12)
    corner.Parent = frame
    local stroke = Instance.new("UIStroke")
    stroke.Color = color
    stroke.Thickness = 2
    stroke.Transparency = 0.15
    stroke.Parent = frame

    local titleLabel = Instance.new("TextLabel")
    titleLabel.Size = UDim2.new(1, -16, 0, 30)
    titleLabel.Position = UDim2.fromOffset(8, 5)
    titleLabel.BackgroundTransparency = 1
    titleLabel.Text = title
    titleLabel.TextColor3 = color
    titleLabel.Font = Enum.Font.GothamBold
    titleLabel.TextSize = 18
    titleLabel.Parent = frame

    local subLabel = Instance.new("TextLabel")
    subLabel.Size = UDim2.new(1, -16, 0, 20)
    subLabel.Position = UDim2.fromOffset(8, 34)
    subLabel.BackgroundTransparency = 1
    subLabel.Text = subtitle
    subLabel.TextColor3 = Color3.fromRGB(220, 228, 245)
    subLabel.Font = Enum.Font.GothamMedium
    subLabel.TextSize = 12
    subLabel.Parent = frame
end

addBillboard(start, "NEXUS LIVE RUN", "Reach all checkpoints, then finish", Color3.fromRGB(100, 170, 255))
for index = 1, 3 do
    addBillboard(course:FindFirstChild(string.format("Checkpoint%02d", index)), "CHECKPOINT " .. index, "Progress saved", Color3.fromRGB(70, 255, 120))
end
addBillboard(finish, "FINISH", "Complete the live pipeline test", Color3.fromRGB(25, 225, 255))

local remotes = ReplicatedStorage:FindFirstChild("NexusLiveGame") or Instance.new("Folder")
remotes.Name = "NexusLiveGame"
remotes.Parent = ReplicatedStorage
local runEvent = remotes:FindFirstChild("RunEvent") or Instance.new("RemoteEvent")
runEvent.Name = "RunEvent"
runEvent.Parent = remotes

local atmosphere = Lighting:FindFirstChild("NexusLiveAtmosphere") or Instance.new("Atmosphere")
atmosphere.Name = "NexusLiveAtmosphere"
atmosphere.Color = Color3.fromRGB(195, 218, 255)
atmosphere.Decay = Color3.fromRGB(72, 86, 130)
atmosphere.Density = 0.22
atmosphere.Glare = 0.15
atmosphere.Haze = 1.1
atmosphere.Parent = Lighting
Lighting.Brightness = 2.5
Lighting.ClockTime = 14.5
Lighting.Ambient = Color3.fromRGB(70, 78, 105)
Lighting.OutdoorAmbient = Color3.fromRGB(110, 125, 160)

return {
    ok = true,
    coursePath = course:GetFullName(),
    partCount = #course:GetChildren(),
    backupPath = backups:GetFullName(),
    remotePath = runEvent:GetFullName(),
}
