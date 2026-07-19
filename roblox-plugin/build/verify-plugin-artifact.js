#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const pluginRoot = path.resolve(__dirname, "..");
const registryPath = path.join(pluginRoot, "src", "commands", "registry.lua");
const configPath = path.join(pluginRoot, "src", "config.lua");
const artifactPath = path.join(pluginRoot, "NexusRBXStudioBridge.plugin.lua");

function fail(message) {
  console.error(`Plugin artifact integrity check failed: ${message}`);
  process.exitCode = 1;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectHandlerNames(source) {
  const tableStart = source.indexOf("local TOOL_HANDLERS = {");
  const tableEnd = source.indexOf("\n}\n\n-- Pairing must", tableStart);
  if (tableStart < 0 || tableEnd < 0) {
    throw new Error("could not locate the TOOL_HANDLERS table");
  }

  const handlers = new Set();
  for (const match of source.slice(tableStart, tableEnd).matchAll(/^\s*([a-z][a-z0-9_]*)\s*=/gm)) {
    handlers.add(match[1]);
  }
  for (const match of source.matchAll(/^TOOL_HANDLERS\.([a-z][a-z0-9_]*)\s*=/gm)) {
    handlers.add(match[1]);
  }
  return [...handlers].sort();
}

try {
  const registry = fs.readFileSync(registryPath, "utf8");
  const config = fs.readFileSync(configPath, "utf8");
  const artifact = fs.readFileSync(artifactPath, "utf8");
  const buildId = config.match(/local PLUGIN_BUILD_ID = "([^"]+)"/);
  const handlers = collectHandlerNames(registry);

  if (!buildId) {
    fail("src/config.lua does not declare PLUGIN_BUILD_ID");
  } else if (!artifact.includes(`local PLUGIN_BUILD_ID = "${buildId[1]}"`)) {
    fail(`bundle does not contain build ID ${buildId[1]}`);
  }
  if (!artifact.includes("getPluginAttestation = function")) {
    fail("bundle does not expose getPluginAttestation");
  }
  if (!artifact.includes("supportedCommands = supportedCommands")) {
    fail("bundle pairing payload does not include supportedCommands");
  }
  if (!artifact.includes("buildId = attestation.buildId")) {
    fail("bundle pairing payload does not include buildId");
  }

  for (const command of handlers) {
    const commandPattern = new RegExp(
      `(?:^\\s*${escapeRegExp(command)}\\s*=|TOOL_HANDLERS\\.${escapeRegExp(command)}\\s*=)`,
      "m",
    );
    if (!commandPattern.test(artifact)) {
      fail(`bundle is missing command handler ${command}`);
    }
  }

  if (process.exitCode) {
    process.exit(process.exitCode);
  }

  const crypto = require("crypto");
  const sha256 = crypto.createHash("sha256").update(Buffer.from(artifact, "utf8")).digest("hex");
  console.log(`Plugin artifact verified (${handlers.length} handlers, ${buildId[1]}).`);
  console.log(`sha256=${sha256}`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
