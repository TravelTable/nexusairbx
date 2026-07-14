import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const mode = process.argv[2] ?? "normal";

if (mode === "exit") process.exit(0);

const server = new Server(
  { name: "nexusrbx-test-mcp", version: "1.2.3-test" },
  { capabilities: { tools: { listChanged: true } } },
);

const readTool = {
  name: "script_read",
  description: "Read a test script",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      datamodel_type: { type: "string", enum: ["Edit"] },
    },
    required: ["path", "datamodel_type"],
  },
};

const stateTool = {
  name: "get_studio_state",
  inputSchema: { type: "object", properties: {}, required: [] },
};

const disconnectTool = {
  name: "disconnect_test_server",
  inputSchema: { type: "object", properties: {}, required: [] },
};

server.setRequestHandler(ListToolsRequestSchema, async (request) => {
  if (mode === "cycle") {
    return { tools: [readTool], nextCursor: "repeated-cursor" };
  }
  if (request.params?.cursor === "page-2") {
    return { tools: [stateTool, disconnectTool] };
  }
  return { tools: [readTool], nextCursor: "page-2" };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "disconnect_test_server") {
    setTimeout(() => process.exit(0), 25).unref();
    return { content: [{ type: "text", text: "disconnecting" }] };
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ called: request.params.name, arguments: request.params.arguments ?? {} }),
      },
    ],
  };
});

server.oninitialized = () => {
  if (mode === "normal") {
    setTimeout(() => void server.sendToolListChanged(), 40).unref();
  }
};

await server.connect(new StdioServerTransport());
