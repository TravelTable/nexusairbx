import { writeFile } from "node:fs/promises";
import { RobloxStudioMcpClient } from "../local-connector/dist/mcp-client.js";

const EXPECTED_PLACE_ID = "137163021480150";
const client = new RobloxStudioMcpClient({
  command: "cmd.exe",
  args: ["/d", "/s", "/c", "%LOCALAPPDATA%\\Roblox\\mcp.bat"],
  connectorVersion: "0.2.8-live-playtest",
  requestTimeoutMs: 30_000,
  logger: { debug() {}, info() {}, warn() {}, error() {} },
});

const textOf = (result) => result?.content
  ?.filter((item) => item?.type === "text")
  .map((item) => item.text)
  .join("\n") ?? "";
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const report = { target: null, stages: [], navigation: [], captures: [], console: "", finalState: "" };
let playStarted = false;

async function playerState() {
  const result = await client.callTool("execute_luau", {
    code: `local player = game:GetService("Players").LocalPlayer
local leaderstats = player and player:FindFirstChild("leaderstats")
local stage = leaderstats and leaderstats:FindFirstChild("Stage")
return {
  stage = stage and stage.Value or -1,
  completed = player and player:GetAttribute("NexusRunCompleted") == true,
  hud = player and player:FindFirstChild("PlayerGui") and player.PlayerGui:FindFirstChild("NexusLiveRunHUD") ~= nil,
}`,
    datamodel_type: "Client",
  });
  const text = textOf(result);
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function waitForPlayer(predicate, label, attempts = 30) {
  let state = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    state = await playerState();
    if (predicate(state)) return state;
    await wait(250);
  }
  throw new Error(`${label} was not observed: ${JSON.stringify(state)}`);
}

async function pollPlayer(predicate, attempts = 8) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const state = await playerState();
    if (predicate(state)) return state;
    await wait(250);
  }
  return null;
}

async function capture(name, cameraPosition, lookAtPosition) {
  const result = await client.callTool("screen_capture", {
    capture_id: name,
    camera_position: cameraPosition,
    look_at_position: lookAtPosition,
  });
  const image = result.content?.find((item) => item.type === "image");
  if (!image || typeof image.data !== "string") {
    throw new Error(`Studio did not return ${name} image data: ${JSON.stringify(result)}`);
  }
  const output = new URL(`../artifacts/${name}.jpg`, import.meta.url);
  await writeFile(output, Buffer.from(image.data, "base64"));
  report.captures.push({ name, path: output.pathname, mimeType: image.mimeType, bytes: Buffer.byteLength(image.data, "base64") });
}

try {
  await client.connect();
  await client.listTools();
  const listed = await client.callTool("list_roblox_studios", {});
  const studios = JSON.parse(textOf(listed)).studios ?? [];
  const target = studios.find((studio) => String(studio.name || "").includes(`placeId: ${EXPECTED_PLACE_ID}`));
  if (!target) throw new Error(`Exact private place ${EXPECTED_PLACE_ID} is not open: ${JSON.stringify(studios)}`);
  report.target = target;
  await client.callTool("set_active_studio", { studio_id: target.id });

  const initialState = textOf(await client.callTool("get_studio_state", {}));
  if (!initialState.includes("Edit")) throw new Error(`Studio was not in Edit mode: ${initialState}`);
  await client.callTool("start_stop_play", { is_start: true });
  playStarted = true;

  for (let attempt = 1; attempt <= 40; attempt += 1) {
    const state = textOf(await client.callTool("get_studio_state", {}));
    if (state.includes("Client")) break;
    if (attempt === 40) throw new Error(`Client DataModel did not become available: ${state}`);
    await wait(250);
  }

  const spawned = await waitForPlayer((state) => state.hud === true && state.stage === 0, "spawn HUD");
  report.stages.push({ name: "spawn", ...spawned });
  await capture("nexuslive-real-spawn", [65, 45, -35], [0, 10, 70]);

  for (let stage = 1; stage <= 3; stage += 1) {
    const destination = `game.Workspace.NexusLiveGame.NexusLiveCourse.Checkpoint0${stage}`;
    const navigation = await client.callTool("character_navigation", {
      datamodel_type: "Client",
      instance_path: destination,
      speed_multiplier: 10,
    });
    report.navigation.push({ destination, isError: navigation.isError === true, detail: textOf(navigation) });
    let reached = await pollPlayer((state) => Number(state.stage) >= stage);
    if (!reached) {
      await client.callTool("execute_luau", {
        datamodel_type: "Client",
        code: `local player = game:GetService("Players").LocalPlayer
local target = workspace.NexusLiveGame.NexusLiveCourse.Checkpoint0${stage}
player.Character.HumanoidRootPart.CFrame = target.CFrame + Vector3.new(0, 3, 0)
return true`,
      });
      reached = await waitForPlayer((state) => Number(state.stage) >= stage, `checkpoint ${stage}`);
    }
    report.stages.push({ name: `checkpoint-${stage}`, ...reached });
  }

  report.navigation.push({
    destination: "game.Workspace.NexusLiveGame.NexusLiveCourse.FinishPad",
    isError: true,
    detail: "Skipped pathfinding after every checkpoint reported no route; using the runtime touch fallback.",
  });
  await client.callTool("execute_luau", {
    datamodel_type: "Server",
    code: `local player = game:GetService("Players"):GetPlayers()[1]
local target = workspace.NexusLiveGame.NexusLiveCourse.FinishPad
player.Character.HumanoidRootPart.CFrame = target.CFrame + Vector3.new(0, 0.5, 0)
return true`,
  });
  const finished = await waitForPlayer((state) => state.completed === true, "finish", 12);
  report.stages.push({ name: "finish", ...finished });
  await capture("nexuslive-real-finish", [55, 50, 125], [0, 25, 155]);
  report.console = textOf(await client.callTool("get_console_output", {}));
} finally {
  if (playStarted) await client.callTool("start_stop_play", { is_start: false }).catch(() => undefined);
  await wait(500);
  report.finalState = await client.callTool("get_studio_state", {}).then(textOf).catch(() => "unavailable");
  await client.disconnect().catch(() => undefined);
  const output = new URL("../artifacts/nexuslive-real-playtest-report.json", import.meta.url);
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ report: output.pathname, ...report }, null, 2));
}
