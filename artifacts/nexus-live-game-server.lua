local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local course = Workspace:WaitForChild("NexusLiveGame"):WaitForChild("NexusLiveCourse")
local runEvent = ReplicatedStorage:WaitForChild("NexusLiveGame"):WaitForChild("RunEvent")
local spawn = course:WaitForChild("StartSpawn")
local lava = course:WaitForChild("LavaFloor")
local finish = course:WaitForChild("FinishPad")
local checkpoints = {
    course:WaitForChild("Checkpoint01"),
    course:WaitForChild("Checkpoint02"),
    course:WaitForChild("Checkpoint03"),
}

local touchDebounce = {}

local function playerFromHit(hit)
    local character = hit and hit:FindFirstAncestorOfClass("Model")
    if not character then return nil, nil end
    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if not humanoid then return nil, nil end
    return Players:GetPlayerFromCharacter(character), humanoid
end

local function getStage(player)
    local leaderstats = player:FindFirstChild("leaderstats")
    return leaderstats and leaderstats:FindFirstChild("Stage")
end

local function getBestTime(player)
    local leaderstats = player:FindFirstChild("leaderstats")
    return leaderstats and leaderstats:FindFirstChild("BestTime")
end

local function startRun(player, force)
    if force or not player:GetAttribute("RunStartedAt") then
        player:SetAttribute("RunStartedAt", Workspace:GetServerTimeNow())
        runEvent:FireClient(player, "start", { stage = (getStage(player) and getStage(player).Value or 0) })
    end
end

local function checkpointCFrame(stage)
    if stage <= 0 then return spawn.CFrame + Vector3.new(0, 4, 0) end
    local checkpoint = checkpoints[math.clamp(stage, 1, #checkpoints)]
    return checkpoint.CFrame + Vector3.new(0, 4, 0)
end

local function setUpPlayer(player)
    local leaderstats = player:FindFirstChild("leaderstats") or Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player

    local stage = leaderstats:FindFirstChild("Stage") or Instance.new("IntValue")
    stage.Name = "Stage"
    stage.Value = 0
    stage.Parent = leaderstats

    local bestTime = leaderstats:FindFirstChild("BestTime") or Instance.new("NumberValue")
    bestTime.Name = "BestTime"
    bestTime.Value = 0
    bestTime.Parent = leaderstats

    player:SetAttribute("RunStartedAt", nil)
    player:SetAttribute("NexusRunCompleted", false)

    player.CharacterAdded:Connect(function(character)
        local root = character:WaitForChild("HumanoidRootPart", 8)
        if not root then return end
        task.wait(0.15)
        root.CFrame = checkpointCFrame(stage.Value)
        startRun(player, stage.Value == 0)
    end)
end

Players.PlayerAdded:Connect(setUpPlayer)
for _, player in ipairs(Players:GetPlayers()) do setUpPlayer(player) end

course.StartPlatform.Touched:Connect(function(hit)
    local player = playerFromHit(hit)
    if not player then return end
    local stage = getStage(player)
    if stage and stage.Value == 0 then startRun(player, false) end
end)

lava.Touched:Connect(function(hit)
    local _, humanoid = playerFromHit(hit)
    if humanoid then humanoid.Health = 0 end
end)

for index, checkpoint in ipairs(checkpoints) do
    checkpoint.Touched:Connect(function(hit)
        local player = playerFromHit(hit)
        if not player then return end
        local key = tostring(player.UserId) .. ":checkpoint:" .. index
        if touchDebounce[key] then return end
        touchDebounce[key] = true
        task.delay(0.8, function() touchDebounce[key] = nil end)

        local stage = getStage(player)
        if not stage or stage.Value >= index then return end
        stage.Value = index
        startRun(player, false)
        runEvent:FireClient(player, "checkpoint", { stage = index, total = #checkpoints })
    end)
end

finish.Touched:Connect(function(hit)
    local player = playerFromHit(hit)
    if not player then return end
    local key = tostring(player.UserId) .. ":finish"
    if touchDebounce[key] then return end
    touchDebounce[key] = true
    task.delay(2, function() touchDebounce[key] = nil end)

    local stage = getStage(player)
    if not stage or stage.Value < #checkpoints then
        runEvent:FireClient(player, "blocked", { stage = stage and stage.Value or 0, total = #checkpoints })
        return
    end

    local startedAt = player:GetAttribute("RunStartedAt") or Workspace:GetServerTimeNow()
    local elapsed = math.max(0, Workspace:GetServerTimeNow() - startedAt)
    local best = getBestTime(player)
    local isBest = best and (best.Value <= 0 or elapsed < best.Value)
    if best and isBest then best.Value = elapsed end
    player:SetAttribute("NexusRunCompleted", true)
    runEvent:FireClient(player, "finish", { time = elapsed, best = best and best.Value or elapsed, isBest = isBest })

    task.delay(4, function()
        if player.Parent then
            stage.Value = 0
            player:SetAttribute("RunStartedAt", Workspace:GetServerTimeNow())
            player:SetAttribute("NexusRunCompleted", false)
            local character = player.Character
            local root = character and character:FindFirstChild("HumanoidRootPart")
            if root then root.CFrame = checkpointCFrame(0) end
            runEvent:FireClient(player, "reset", { stage = 0 })
        end
    end)
end)

print("[NexusLive] Server system ready: 3 checkpoints, lava reset, finish timing")
