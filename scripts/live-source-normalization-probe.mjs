import { RobloxStudioMcpClient } from "../local-connector/dist/mcp-client.js";
import { CommandExecutor } from "../local-connector/dist/command-executor.js";
import { ToolCatalog } from "../local-connector/dist/tool-catalog.js";

const logger = { debug() {}, info() {}, warn() {}, error() {} };
const client = new RobloxStudioMcpClient({
  command: "cmd.exe",
  args: ["/d", "/s", "/c", "%LOCALAPPDATA%\\Roblox\\mcp.bat"],
  connectorVersion: "0.2.8-source-normalization-probe",
  requestTimeoutMs: 20_000,
  logger,
});

const path = "game.ServerScriptService.NexusSourceProbe";
const source = "local value = 1\nprint(\"probe — ready\", value)\n";
const textOf = (result) => result?.content?.find((item) => item?.type === "text")?.text ?? "";

try {
  await client.connect();
  const tools = await client.listTools();
  const studios = JSON.parse(textOf(await client.callTool("list_roblox_studios", {}))).studios ?? [];
  if (studios.length !== 1) throw new Error(`Expected one Studio, found ${studios.length}`);
  await client.callTool("set_active_studio", { studio_id: studios[0].id });
  await client.callTool("execute_luau", {
    code: `local old = game.ServerScriptService:FindFirstChild("NexusSourceProbe"); if old then old:Destroy() end; local script = Instance.new("Script"); script.Name = "NexusSourceProbe"; script.Source = ${JSON.stringify(source)}; script.Parent = game.ServerScriptService; return {ok = true}`,
    datamodel_type: "Edit",
  });
  const read = await new CommandExecutor(client, new ToolCatalog(tools)).execute({
    id: "live-source-normalization-probe",
    type: "read_script",
    payload: { path },
  });
  if (read.success !== true) throw new Error(`Connector read failed: ${JSON.stringify(read.error ?? read)}`);
  const actual = String(read.source ?? "");
  console.log(JSON.stringify({
    expectedLength: source.length,
    actualLength: actual.length,
    exact: actual === source,
    expectedJson: JSON.stringify(source),
    actualJson: JSON.stringify(actual),
    sourceHash: read.sourceHash ?? null,
    firstDifference: [...Array(Math.max(source.length, actual.length)).keys()].find((index) => source[index] !== actual[index]) ?? null,
  }, null, 2));
} finally {
  await client.callTool("execute_luau", {
    code: `local script = game.ServerScriptService:FindFirstChild("NexusSourceProbe"); if script then script:Destroy() end; return {ok = true}`,
    datamodel_type: "Edit",
  }).catch(() => undefined);
  await client.disconnect().catch(() => undefined);
}
