import { RobloxStudioMcpClient } from "../local-connector/dist/mcp-client.js";
import { StudioTargetManager } from "../local-connector/dist/studio-targeting.js";

const logger = {
  debug() {},
  info() {},
  warn(message, details) { console.error("WARN", message, details ?? ""); },
  error(message, details) { console.error("ERROR", message, details ?? ""); },
};

const client = new RobloxStudioMcpClient({
  command: "cmd.exe",
  args: ["/d", "/s", "/c", "%LOCALAPPDATA%\\Roblox\\mcp.bat"],
  connectorVersion: "0.2.8-live-project-test",
  requestTimeoutMs: 20_000,
  logger,
});

try {
  await client.connect();
  const tools = await client.listTools();
  let studios;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    studios = await client.callTool("list_roblox_studios", {});
    const text = studios.content?.find((item) => item.type === "text")?.text ?? "";
    if (!text.includes('"studios":[]')) break;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  const parsedStudios = (() => {
    try { return JSON.parse(studios.content?.find((item) => item.type === "text")?.text ?? "{}").studios ?? []; }
    catch { return []; }
  })();
  const targetManager = new StudioTargetManager(client, true);
  await targetManager.refresh();
  const targetMetadata = targetManager.metadata();
  let exactFence = "not_run";
  let mismatchedFence = "not_run";
  const fenceCommand = {
    id: "live-target-fence",
    type: "create_instance",
    payload: { path: "Workspace/NexusFenceProbe", className: "Folder" },
    connectionType: "mcp_local",
    expectedPlaceId: targetMetadata.placeId,
    expectedUniverseId: targetMetadata.universeId,
    expectedPlaceSignature: targetMetadata.placeSignature,
    studioTarget: { studioId: targetMetadata.activeStudioId },
  };
  await targetManager.ensureMutationTarget(fenceCommand);
  exactFence = "accepted";
  try {
    await targetManager.ensureMutationTarget({ ...fenceCommand, expectedPlaceId: "999" });
    mismatchedFence = "incorrectly_accepted";
  } catch (error) {
    mismatchedFence = error?.code ?? String(error);
  }
  let marker = null;
  let studioState = null;
  let identityProbe = null;
  if (parsedStudios.length === 1) {
    await client.callTool("set_active_studio", { studio_id: parsedStudios[0].id });
    studioState = await client.callTool("get_studio_state", {});
    identityProbe = await client.callTool("execute_luau", {
      code: "return {placeId = tostring(game.PlaceId), universeId = tostring(game.GameId), placeName = game.Name}",
      datamodel_type: "Edit",
    });
    marker = await client.callTool("inspect_instance", { path: "game.Workspace.NexusLiveShowcase" });
  }
  console.log(JSON.stringify({
    toolCount: tools.length,
    toolNames: tools.map(({ name }) => name),
    screenCaptureTool: tools.find(({ name }) => name === "screen_capture") ?? null,
    studios,
    studioState,
    identityProbe,
    targetMetadata,
    targetFences: { exactFence, mismatchedFence },
    marker,
  }, null, 2));
} finally {
  await client.disconnect().catch(() => undefined);
}
