#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { NexusBackendClient } from "./backend-client.js";
import { HELP_TEXT, loadConfig } from "./config.js";
import { NexusLocalConnector } from "./connector.js";
import { asConnectorError } from "./errors.js";
import { ConsoleLogger } from "./logger.js";
import { RobloxStudioMcpClient } from "./mcp-client.js";
import { CONNECTOR_VERSION } from "./version.js";

const argv = process.argv.slice(2);

if (argv.includes("--help")) {
  stdout.write(HELP_TEXT);
} else if (argv.includes("--version")) {
  stdout.write(`${CONNECTOR_VERSION}\n`);
} else {
  await main(argv);
}

async function main(arguments_: string[]): Promise<void> {
  const config = loadConfig(arguments_);
  const logger = new ConsoleLogger(config.verbose);
  stdout.write(
    [
      "NexusRBX Local Connector",
      "Open Roblox Studio and enable Studio MCP.",
      "Go to NexusRBX → Connect Roblox Studio → Advanced → Roblox MCP.",
      "",
    ].join("\n"),
  );
  const pairCode = config.pairCode ?? (await promptForPairingCode());
  const backend = new NexusBackendClient({
    apiUrl: config.apiUrl,
    connectorVersion: CONNECTOR_VERSION,
    requestTimeoutMs: config.requestTimeoutMs,
    logger,
  });
  const mcp = new RobloxStudioMcpClient({
    command: config.mcpCommand,
    args: config.mcpArgs,
    connectorVersion: CONNECTOR_VERSION,
    requestTimeoutMs: config.requestTimeoutMs,
    logger,
  });
  const connector = new NexusLocalConnector({
    config,
    connectorVersion: CONNECTOR_VERSION,
    backend,
    mcp,
    logger,
  });

  const controller = new AbortController();
  const stop = (): void => {
    if (!controller.signal.aborted) controller.abort(new DOMException("Connector stopped", "AbortError"));
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    await connector.run(pairCode, controller.signal);
  } catch (error) {
    const connectorError = asConnectorError(error);
    logger.error(connectorError.message, { code: connectorError.code });
    process.exitCode = 1;
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}

async function promptForPairingCode(): Promise<string> {
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    return await readline.question("Enter the connector pairing code shown on the website:\n> ");
  } finally {
    readline.close();
  }
}
