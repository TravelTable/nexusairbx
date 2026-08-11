import { writeFile } from "node:fs/promises";
import { RobloxStudioMcpClient } from "../local-connector/dist/mcp-client.js";

const client = new RobloxStudioMcpClient({
  command: "cmd.exe",
  args: ["/d", "/s", "/c", "%LOCALAPPDATA%\\Roblox\\mcp.bat"],
  connectorVersion: "0.2.8-live-capture",
  requestTimeoutMs: 30_000,
  logger: { debug() {}, info() {}, warn() {}, error() {} },
});

try {
  await client.connect();
  const studiosResult = await client.callTool("list_roblox_studios", {});
  const studiosText = studiosResult.content?.find((item) => item.type === "text")?.text ?? "{}";
  const studios = JSON.parse(studiosText).studios ?? [];
  if (studios.length !== 1) throw new Error(`Expected one Studio, found ${studios.length}`);
  await client.callTool("set_active_studio", { studio_id: studios[0].id });
  const result = await client.callTool("screen_capture", {
    capture_id: "NexusLiveShowcase",
    camera_position: [72, 54, 72],
    look_at_position: [0, 6, 0],
  });
  const image = result.content?.find((item) => item.type === "image");
  if (!image || typeof image.data !== "string") {
    throw new Error(`Studio did not return image data: ${JSON.stringify(result)}`);
  }
  const output = new URL("../artifacts/nexus-live-showcase.png", import.meta.url);
  await writeFile(output, Buffer.from(image.data, "base64"));
  console.log(JSON.stringify({ output: output.pathname, mimeType: image.mimeType, bytes: Buffer.byteLength(image.data, "base64") }));
} finally {
  await client.disconnect().catch(() => undefined);
}
