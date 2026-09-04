#!/usr/bin/env node
import { stdout } from "node:process";
import { NexusBackendClient } from "./backend-client.js";
import { deleteCliSession, loginWithBrowser, loadCliSession, saveCliSession } from "./cli-auth.js";
import { HELP_TEXT, loadConfig } from "./config.js";
import { NexusLocalConnector } from "./connector.js";
import { asConnectorError } from "./errors.js";
import { ConsoleLogger } from "./logger.js";
import { RobloxStudioMcpClient } from "./mcp-client.js";
import { CONNECTOR_VERSION } from "./version.js";

const argv = process.argv.slice(2);
if (argv.includes("--help")) stdout.write(HELP_TEXT);
else if (argv.includes("--version")) stdout.write(`${CONNECTOR_VERSION}\n`);
else await main(argv);

async function main(arguments_: string[]): Promise<void> {
  const config = loadConfig(arguments_.filter((value) => !["login", "logout", "mcp"].includes(value)));
  const logger = new ConsoleLogger(config.verbose);
  const backend = new NexusBackendClient({
    apiUrl: config.apiUrl,
    connectorVersion: CONNECTOR_VERSION,
    requestTimeoutMs: config.requestTimeoutMs,
    logger,
    onSessionUpdated: saveCliSession,
    onSessionCleared: deleteCliSession,
  });
  let session = await loadCliSession();
  if (session) backend.restoreSession(session);
  if (arguments_.includes("logout")) { await backend.logoutStoredSession(); stdout.write("Signed out of NexusRBX.\n"); return; }
  if (!session) {
    stdout.write("Opening NexusRBX in your browser…\n");
    session = await loginWithBrowser({ webUrl: config.webUrl, backend, connectorVersion: CONNECTOR_VERSION });
    stdout.write("✓ Signed in to NexusRBX\n✓ This computer is authorized\n");
  }
  if (arguments_.includes("login")) return;
  const mcp = new RobloxStudioMcpClient({ command: config.mcpCommand, args: config.mcpArgs, connectorVersion: CONNECTOR_VERSION, requestTimeoutMs: config.requestTimeoutMs, toolTimeoutMs: config.mcpToolTimeoutMs, logger });
  const connector = new NexusLocalConnector({ config, connectorVersion: CONNECTOR_VERSION, backend, mcp, logger, clearTokenOnShutdown: false });
  const controller = new AbortController();
  const stop = () => { if (!controller.signal.aborted) controller.abort(new DOMException("Connector stopped", "AbortError")); };
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  try { stdout.write("✓ NexusRBX cloud connected\n"); await connector.runClaimed(session, controller.signal); }
  catch (error) { const connectorError = asConnectorError(error); logger.error(connectorError.message, { code: connectorError.code }); process.exitCode = 1; }
  finally { process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop); }
}
