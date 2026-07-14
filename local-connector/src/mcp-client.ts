import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ConnectorError } from "./errors.js";
import type { Logger } from "./logger.js";
import type { DiscoveredTool, JsonObject, McpClientLike, McpConnectionInfo, ToolCallResult } from "./types.js";

const MAX_TOOL_PAGES = 100;
const MAX_TOOLS = 1_000;

export interface RobloxStudioMcpOptions {
  command: string;
  args: string[];
  connectorVersion: string;
  requestTimeoutMs: number;
  logger: Logger;
}

export class RobloxStudioMcpClient implements McpClientLike {
  #client: Client | null = null;
  #transport: StdioClientTransport | null = null;
  readonly #toolChangeHandlers = new Set<() => void>();
  readonly #disconnectHandlers = new Set<(error?: Error) => void>();
  #closing = false;

  constructor(private readonly options: RobloxStudioMcpOptions) {}

  async connect(signal?: AbortSignal): Promise<McpConnectionInfo> {
    await this.disconnect();
    this.#closing = false;
    const client = new Client(
      { name: "nexusrbx-local-connector", version: this.options.connectorVersion },
      {
        capabilities: {},
        listChanged: {
          tools: {
            onChanged: (error) => {
              if (error) {
                this.options.logger.warn("Roblox Studio MCP tool-change refresh failed.");
                return;
              }
              for (const handler of this.#toolChangeHandlers) handler();
            },
          },
        },
      },
    );
    const transport = new StdioClientTransport({
      command: this.options.command,
      args: this.options.args,
      stderr: "pipe",
    });
    transport.stderr?.on("data", () => {
      this.options.logger.debug("Roblox Studio MCP emitted a diagnostic message.");
    });
    client.onclose = () => {
      if (this.#client === client) this.#client = null;
      if (this.#transport === transport) this.#transport = null;
      if (!this.#closing) {
        const error = new ConnectorError("MCP_DISCONNECTED", "Roblox Studio MCP disconnected.", { retryable: true });
        for (const handler of this.#disconnectHandlers) handler(error);
      }
    };
    client.onerror = (error) => this.options.logger.debug("Roblox Studio MCP protocol error.", { message: error.message });
    this.#client = client;
    this.#transport = transport;
    try {
      await client.connect(transport, this.requestOptions(signal));
    } catch (error) {
      await this.disconnect();
      throw new ConnectorError("MCP_CONNECT_FAILED", "Could not connect to Roblox Studio MCP.", {
        retryable: true,
        cause: error,
      });
    }
    const version = client.getServerVersion();
    return {
      ...(version?.name === undefined ? {} : { serverName: version.name }),
      ...(version?.version === undefined ? {} : { serverVersion: version.version }),
    };
  }

  async disconnect(): Promise<void> {
    this.#closing = true;
    const client = this.#client;
    const transport = this.#transport;
    this.#client = null;
    this.#transport = null;
    try {
      if (client) await client.close();
      else if (transport) await transport.close();
    } catch {
      // Closing is best-effort and must not mask the caller's original error.
    }
  }

  async listTools(signal?: AbortSignal): Promise<DiscoveredTool[]> {
    const client = this.requireClient();
    const tools: DiscoveredTool[] = [];
    const cursors = new Set<string>();
    let cursor: string | undefined;
    for (let page = 0; page < MAX_TOOL_PAGES; page += 1) {
      const result = await client.listTools(cursor === undefined ? undefined : { cursor }, this.requestOptions(signal));
      for (const tool of result.tools) {
        if (tools.length >= MAX_TOOLS) throw new ConnectorError("MCP_TOOL_LIMIT", "Roblox Studio MCP returned too many tools.");
        tools.push({
          name: tool.name,
          ...(tool.description === undefined ? {} : { description: tool.description }),
          inputSchema: tool.inputSchema as JsonObject,
          ...(tool.outputSchema === undefined ? {} : { outputSchema: tool.outputSchema as JsonObject }),
        });
      }
      if (!result.nextCursor) return tools;
      if (cursors.has(result.nextCursor)) throw new ConnectorError("MCP_CURSOR_CYCLE", "Roblox Studio MCP returned a repeated page cursor.");
      cursors.add(result.nextCursor);
      cursor = result.nextCursor;
    }
    throw new ConnectorError("MCP_TOOL_PAGE_LIMIT", "Roblox Studio MCP tool discovery exceeded the page limit.");
  }

  async callTool(name: string, args: JsonObject, signal?: AbortSignal): Promise<ToolCallResult> {
    const client = this.requireClient();
    try {
      return (await client.callTool(
        { name, arguments: args },
        undefined,
        this.requestOptions(signal),
      )) as ToolCallResult;
    } catch (error) {
      throw new ConnectorError("MCP_TOOL_CALL_FAILED", `Roblox Studio MCP tool ${name} failed.`, {
        retryable: false,
        cause: error,
      });
    }
  }

  onToolsChanged(handler: () => void): void {
    this.#toolChangeHandlers.add(handler);
  }

  onDisconnect(handler: (error?: Error) => void): void {
    this.#disconnectHandlers.add(handler);
  }

  private requireClient(): Client {
    if (this.#client === null) throw new ConnectorError("MCP_NOT_CONNECTED", "Roblox Studio MCP is not connected.", { retryable: true });
    return this.#client;
  }

  private requestOptions(signal?: AbortSignal): { timeout: number; maxTotalTimeout: number; signal?: AbortSignal } {
    return {
      timeout: this.options.requestTimeoutMs,
      maxTotalTimeout: this.options.requestTimeoutMs,
      ...(signal === undefined ? {} : { signal }),
    };
  }
}
