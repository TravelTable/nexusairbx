import { RobloxStudioMcpClient } from "../local-connector/dist/mcp-client.js";
import { FixedRoutineRunner } from "../local-connector/dist/fixed-routines.js";
import { ToolCatalog } from "../local-connector/dist/tool-catalog.js";
import { CommandExecutor } from "../local-connector/dist/command-executor.js";

const logger = {
  debug() {}, info() {},
  warn(message, details) { console.error("WARN", message, details ?? ""); },
  error(message, details) { console.error("ERROR", message, details ?? ""); },
};

const client = new RobloxStudioMcpClient({
  command: "cmd.exe",
  args: ["/d", "/s", "/c", "%LOCALAPPDATA%\\Roblox\\mcp.bat"],
  connectorVersion: "0.2.8-live-project-test",
  requestTimeoutMs: 30_000,
  logger,
});

const textOf = (result) => result?.content?.filter((item) => item?.type === "text").map((item) => item.text).join("\n") ?? "";
const jsonText = (result) => {
  try { return JSON.parse(textOf(result)); } catch { return {}; }
};
const v3 = (x, y, z) => ({ $type: "Vector3", x, y, z });
const c3 = (r, g, b) => ({ $type: "Color3", x: r / 255, y: g / 255, z: b / 255 });
const u2 = (xScale, xOffset, yScale, yOffset) => ({ $type: "UDim2", xScale, xOffset, yScale, yOffset });
const v2 = (x, y) => ({ $type: "Vector2", x, y });
const en = (enumType, name) => ({ $type: "Enum", enumType, name });

const serverSource = `local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local root = workspace:WaitForChild("NexusLiveShowcase")
local arena = root:WaitForChild("Arena")
local orbs = root:WaitForChild("Orbs")
local core = arena:WaitForChild("Core")

local function setupPlayer(player)
    local leaderstats = player:FindFirstChild("leaderstats") or Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player
    local coins = leaderstats:FindFirstChild("Energy") or Instance.new("IntValue")
    coins.Name = "Energy"
    coins.Parent = leaderstats
end

Players.PlayerAdded:Connect(setupPlayer)
for _, player in Players:GetPlayers() do setupPlayer(player) end

local origins = {}
for _, orb in orbs:GetChildren() do
    if orb:IsA("BasePart") then
        origins[orb] = orb.Position
        local glow = Instance.new("PointLight")
        glow.Color = orb.Color
        glow.Brightness = 2.5
        glow.Range = 13
        glow.Parent = orb
        local sparkles = Instance.new("Sparkles")
        sparkles.SparkleColor = orb.Color
        sparkles.Parent = orb
        local busy = false
        orb.Touched:Connect(function(hit)
            if busy then return end
            local character = hit.Parent
            local player = character and Players:GetPlayerFromCharacter(character)
            if not player then return end
            busy = true
            local energy = player:FindFirstChild("leaderstats") and player.leaderstats:FindFirstChild("Energy")
            if energy then energy.Value += 1 end
            orb.CanTouch = false
            TweenService:Create(orb, TweenInfo.new(0.18), {Transparency = 1, Size = Vector3.new(0.2, 0.2, 0.2)}):Play()
            task.delay(2.5, function()
                orb.Size = Vector3.new(2.6, 2.6, 2.6)
                orb.Transparency = 0
                orb.CanTouch = true
                busy = false
            end)
        end)
    end
end

local started = os.clock()
RunService.Heartbeat:Connect(function()
    local t = os.clock() - started
    core.CFrame = CFrame.new(core.Position) * CFrame.Angles(t * 0.35, t * 0.75, 0)
    for orb, origin in origins do
        if orb.Parent and orb.Transparency < 1 then
            local phase = (orb:GetAttribute("Index") or 0) * 0.7
            orb.Position = origin + Vector3.new(0, math.sin(t * 2 + phase) * 0.65, 0)
            orb.Orientation = Vector3.new(0, (t * 80 + phase * 25) % 360, 0)
        end
    end
end)

print("[NexusRBX Live Test] SERVER_READY orbs=" .. #orbs:GetChildren())`;

const clientSource = `local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local gui = script.Parent
local card = gui:WaitForChild("Card")
local score = card:WaitForChild("Score")
local title = card:WaitForChild("Title")
local hint = card:WaitForChild("Hint")

card.Position = UDim2.fromScale(0.5, -0.2)
TweenService:Create(card, TweenInfo.new(0.65, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
    Position = UDim2.new(0.5, -190, 0, 24)
}):Play()

local energy = player:WaitForChild("leaderstats"):WaitForChild("Energy")
local function render()
    score.Text = string.format("ENERGY  %02d / 08", energy.Value)
    if energy.Value >= 8 then
        hint.Text = "CORE STABILIZED — PERFECT RUN"
        hint.TextColor3 = Color3.fromRGB(76, 255, 177)
    end
end
energy:GetPropertyChangedSignal("Value"):Connect(render)
render()

local t = 0
RunService.RenderStepped:Connect(function(dt)
    t += dt
    title.TextColor3 = Color3.fromHSV((0.58 + math.sin(t) * 0.035) % 1, 0.55, 1)
end)

print("[NexusRBX Live Test] CLIENT_READY")`;

const createdPaths = [];
const report = { target: null, capabilities: null, created: [], rollback: null, sourceVerification: [], playtest: null, console: "", tree: "" };

try {
  await client.connect();
  const tools = await client.listTools();
  const catalog = new ToolCatalog(tools);
  const routines = new FixedRoutineRunner(client);
  const executor = new CommandExecutor(client, catalog);
  report.capabilities = catalog.capabilities;

  let targets = [];
  for (let attempt = 0; attempt < 30; attempt += 1) {
    targets = jsonText(await client.callTool("list_roblox_studios", {})).studios ?? [];
    if (targets.length) break;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  if (targets.length !== 1) throw new Error(`Expected exactly one MCP-visible disposable Studio, found ${targets.length}`);
  const target = targets[0];
  await client.callTool("set_active_studio", { studio_id: target.id });
  const stateResult = await client.callTool("get_studio_state", {});
  report.target = { selected: target, state: jsonText(stateResult) || textOf(stateResult) };

  await client.callTool("execute_luau", {
    code: `for _, pair in ipairs({
      {game.Workspace, "NexusLiveShowcase"},
      {game.StarterGui, "NexusLiveHUD"},
      {game.ServerScriptService, "NexusLiveShowcaseServer"}
    }) do
      local instance = pair[1]:FindFirstChild(pair[2])
      if instance then instance:Destroy() end
    end
    return {ok = true}`,
    datamodel_type: "Edit",
  });

  const create = async (path, className, properties = {}, attributes = {}) => {
    const result = await routines.run("create_instance", { path, className, properties, attributes });
    createdPaths.push(path);
    report.created.push({ path, className, verified: true, snapshots: result.snapshots?.length ?? 0 });
    return result;
  };

  await create("Workspace/NexusLiveShowcase", "Folder", {}, { NexusLiveTest: true, Version: "0.2.8" });
  await create("Workspace/NexusLiveShowcase/Arena", "Model");
  await create("Workspace/NexusLiveShowcase/Arena/Platform", "Part", {
    Anchored: true, Size: v3(70, 2, 70), Position: v3(0, 1, 0), Material: en("Material", "Metal"),
    Color: c3(18, 27, 48), CanCollide: true,
  });
  await create("Workspace/NexusLiveShowcase/Arena/Core", "Part", {
    Anchored: true, Size: v3(9, 9, 9), Position: v3(0, 8, 0), Material: en("Material", "Neon"),
    Color: c3(91, 123, 255), CanCollide: false, Shape: en("PartType", "Ball"),
  });

  const ringColors = [[66, 231, 255], [112, 91, 255], [255, 87, 196], [76, 255, 177]];
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    const [r, g, b] = ringColors[index % ringColors.length];
    await create(`Workspace/NexusLiveShowcase/Arena/Pylon${index + 1}`, "Part", {
      Anchored: true, Size: v3(2.4, 11 + (index % 3) * 2, 2.4), Position: v3(Math.cos(angle) * 28, 6.5, Math.sin(angle) * 28),
      Material: en("Material", "Neon"), Color: c3(r, g, b), CanCollide: true,
    }, { Index: index + 1 });
  }

  await create("Workspace/NexusLiveShowcase/Orbs", "Folder");
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4 + Math.PI / 8;
    const [r, g, b] = ringColors[(index + 1) % ringColors.length];
    await create(`Workspace/NexusLiveShowcase/Orbs/Energy${index + 1}`, "Part", {
      Anchored: true, Size: v3(2.6, 2.6, 2.6), Position: v3(Math.cos(angle) * 19, 5, Math.sin(angle) * 19),
      Material: en("Material", "Neon"), Color: c3(r, g, b), CanCollide: false, CanTouch: true,
      Shape: en("PartType", "Ball"),
    }, { Collectible: true, Index: index + 1 });
  }

  await create("StarterGui/NexusLiveHUD", "ScreenGui", { ResetOnSpawn: false, IgnoreGuiInset: true });
  await create("StarterGui/NexusLiveHUD/Card", "Frame", {
    Size: u2(0, 380, 0, 132), Position: u2(0.5, -190, 0, 24), AnchorPoint: v2(0, 0),
    BackgroundColor3: c3(10, 16, 30), BackgroundTransparency: 0.08,
  });
  await create("StarterGui/NexusLiveHUD/Card/Title", "TextLabel", {
    Size: u2(1, -36, 0, 38), Position: u2(0, 18, 0, 14), BackgroundTransparency: 1,
    Text: "NEXUS // CORE RUSH", TextColor3: c3(143, 177, 255),
  });
  await create("StarterGui/NexusLiveHUD/Card/Score", "TextLabel", {
    Size: u2(1, -36, 0, 34), Position: u2(0, 18, 0, 52), BackgroundTransparency: 1,
    Text: "ENERGY  00 / 08", TextColor3: c3(255, 255, 255),
  });
  await create("StarterGui/NexusLiveHUD/Card/Hint", "TextLabel", {
    Size: u2(1, -36, 0, 26), Position: u2(0, 18, 0, 91), BackgroundTransparency: 1,
    Text: "COLLECT ALL EIGHT ENERGY ORBS", TextColor3: c3(136, 150, 178),
  });
  await create("StarterGui/NexusLiveHUD/Card/Corner", "UICorner", { CornerRadius: { $type: "UDim", scale: 0, offset: 18 } });
  await create("StarterGui/NexusLiveHUD/Card/Stroke", "UIStroke", {
    Color: c3(91, 123, 255), Transparency: 0.25, Thickness: 2,
  });

  const createScript = async (path, className, source) => {
    const result = await executor.execute({ id: `live-${report.sourceVerification.length + 1}`, type: "create_script", payload: { path, className, source } });
    if (result.success !== true) throw new Error(`Script creation failed at ${path}: ${JSON.stringify(result.error)}`);
    createdPaths.push(path);
    report.created.push({ path, className, verified: result.verified, snapshots: result.snapshots?.length ?? 0 });
    report.sourceVerification.push({ path, hash: result.resultingHashes?.[path], exact: result.verificationChecks?.[0]?.passed === true });
  };
  await createScript("ServerScriptService/NexusLiveShowcaseServer", "Script", serverSource);
  await createScript("StarterGui/NexusLiveHUD/NexusLiveHUDClient", "LocalScript", clientSource);

  await create("Workspace/NexusLiveShowcase/RollbackProbe", "Part", {
    Anchored: true, Size: v3(3, 3, 3), Position: v3(0, 4, 34), Material: en("Material", "Neon"),
    Color: c3(255, 193, 74), Transparency: 0.15,
  });
  const mutation = await routines.run("update_properties", {
    path: "Workspace/NexusLiveShowcase/RollbackProbe", properties: { Transparency: 0.85, Color: c3(255, 75, 110) },
  });
  const restored = await routines.run("restore_snapshot", { snapshots: mutation.snapshots });
  const probe = await client.callTool("inspect_instance", { path: "Workspace.NexusLiveShowcase.RollbackProbe" });
  report.rollback = { snapshotCount: mutation.snapshots.length, restored: restored.restored?.length ?? 0, inspection: textOf(probe) };

  const serverRead = await executor.execute({ id: "live-read-server", type: "read_script", payload: { path: "ServerScriptService/NexusLiveShowcaseServer" } });
  const clientRead = await executor.execute({ id: "live-read-client", type: "read_script", payload: { path: "StarterGui/NexusLiveHUD/NexusLiveHUDClient" } });
  report.sourceVerification.push({ path: "ServerScriptService/NexusLiveShowcaseServer", rereadMatches: serverRead.source === serverSource, hash: serverRead.sourceHash });
  report.sourceVerification.push({ path: "StarterGui/NexusLiveHUD/NexusLiveHUDClient", rereadMatches: clientRead.source === clientSource, hash: clientRead.sourceHash });

  const tree = await client.callTool("search_game_tree", { datamodel_type: "Edit", path: "Workspace.NexusLiveShowcase", max_depth: 4, head_limit: 100 });
  report.tree = textOf(tree);

  const safeTransition = await executor.execute({ id: "live-play-transition", type: "run_play_test", payload: { confirmed: true, maxDurationSeconds: 15 } });
  report.playtest = safeTransition;

  let extendedStarted = false;
  try {
    await client.callTool("start_stop_play", { is_start: true });
    extendedStarted = true;
    await new Promise((resolve) => setTimeout(resolve, 6_000));
    report.console = textOf(await client.callTool("get_console_output", {}));
  } finally {
    if (extendedStarted) await client.callTool("start_stop_play", { is_start: false }).catch(() => undefined);
  }

  await new Promise((resolve) => setTimeout(resolve, 1_000));
  report.finalState = jsonText(await client.callTool("get_studio_state", {}));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error), report, createdPaths }, null, 2));
  process.exitCode = 1;
} finally {
  await client.callTool("start_stop_play", { is_start: false }).catch(() => undefined);
  await client.disconnect().catch(() => undefined);
}
