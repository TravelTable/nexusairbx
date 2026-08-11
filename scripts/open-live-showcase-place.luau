local Workspace = game:GetService("Workspace")

local baseplate = Instance.new("Part")
baseplate.Name = "LiveTestBaseplate"
baseplate.Anchored = true
baseplate.Size = Vector3.new(160, 1, 160)
baseplate.Position = Vector3.new(0, -0.5, 0)
baseplate.Material = Enum.Material.Slate
baseplate.Color = Color3.fromRGB(13, 18, 31)
baseplate.Parent = Workspace

local spawn = Instance.new("SpawnLocation")
spawn.Name = "LiveTestSpawn"
spawn.Anchored = true
spawn.Size = Vector3.new(10, 1, 10)
spawn.Position = Vector3.new(0, 0.5, 42)
spawn.Material = Enum.Material.Neon
spawn.Color = Color3.fromRGB(72, 116, 255)
spawn.Neutral = true
spawn.Parent = Workspace

print("[NexusRBX Live Test] Disposable showcase place ready")
