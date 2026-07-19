#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const pluginRoot = path.resolve(__dirname, "..");
const artifactPath = path.join(pluginRoot, "NexusRBXStudioBridge.plugin.lua");
const configPath = path.join(pluginRoot, "src", "config.lua");
const checksumPath = path.join(pluginRoot, "NexusRBXStudioBridge.plugin.lua.sha256");

function fail(message) {
  console.error(`Plugin checksum failed: ${message}`);
  process.exitCode = 1;
}

try {
  if (!fs.existsSync(artifactPath)) {
    fail(`missing artifact at ${artifactPath}`);
  } else {
    const artifact = fs.readFileSync(artifactPath);
    const config = fs.readFileSync(configPath, "utf8");
    const buildIdMatch = config.match(/local PLUGIN_BUILD_ID = "([^"]+)"/);
    const buildId = buildIdMatch ? buildIdMatch[1] : "unknown";
    const sha256 = crypto.createHash("sha256").update(artifact).digest("hex");
    const line = `${sha256}  NexusRBXStudioBridge.plugin.lua\n`;
    fs.writeFileSync(checksumPath, line, "utf8");
    console.log(JSON.stringify({
      artifact: "NexusRBXStudioBridge.plugin.lua",
      buildId,
      bytes: artifact.length,
      sha256,
      checksumFile: path.relative(process.cwd(), checksumPath),
    }, null, 2));
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
