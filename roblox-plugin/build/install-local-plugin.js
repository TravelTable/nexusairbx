#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { randomUUID } = require("crypto");

const pluginRoot = path.resolve(__dirname, "..");
const bundledPath = path.join(pluginRoot, "NexusRBXStudioBridge.plugin.lua");
const buildRbxmxPath = path.join(pluginRoot, "build", "NexusRBXStudioBridge.rbxmx");
const pluginsDir = path.join(os.homedir(), "Documents", "Roblox", "Plugins");
const installedPath = path.join(pluginsDir, "NexusRBXStudioBridge.rbxmx");
const buildOnly = process.argv.includes("--build-only");
const legacyPaths = [
  path.join(pluginsDir, "Plugin.rbxmx"),
  path.join(pluginsDir, "NexusRBXStudioBridge.plugin.rbxmx"),
];

function cdataEscape(source) {
  return source.replace(/\]\]>/g, "]]]]><![CDATA[>");
}

function buildRbxmx(source) {
  const referent = `RBX${randomUUID().replace(/-/g, "")}`;
  const scriptGuid = `{${randomUUID()}}`;
  return [
    '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">',
    "\t<External>null</External>",
    "\t<External>nil</External>",
    `\t<Item class="Script" referent="${referent}">`,
    "\t\t<Properties>",
    `\t\t\t<ProtectedString name="Source"><![CDATA[${cdataEscape(source)}]]></ProtectedString>`,
    "\t\t\t<bool name=\"Disabled\">false</bool>",
    "\t\t\t<Content name=\"LinkedSource\"><null></null></Content>",
    "\t\t\t<token name=\"RunContext\">0</token>",
    `\t\t\t<string name="ScriptGuid">${scriptGuid}</string>`,
    "\t\t\t<BinaryString name=\"AttributesSerialize\"></BinaryString>",
    "\t\t\t<SecurityCapabilities name=\"Capabilities\">0</SecurityCapabilities>",
    "\t\t\t<bool name=\"DefinesCapabilities\">false</bool>",
    "\t\t\t<string name=\"Name\">NexusRBXStudioBridge</string>",
    "\t\t\t<int64 name=\"SourceAssetId\">-1</int64>",
    "\t\t\t<SharedString name=\"Tags\">yuZpQdnvvUBOTYh1jqZ2cA==</SharedString>",
    "\t\t</Properties>",
    "\t</Item>",
    "\t<SharedStrings>",
    "\t\t<SharedString md5=\"yuZpQdnvvUBOTYh1jqZ2cA==\"></SharedString>",
    "\t</SharedStrings>",
    "</roblox>",
    "",
  ].join("\n");
}

require("./bundle-plugin.js");
require("./verify-plugin-artifact.js");

if (!fs.existsSync(bundledPath)) {
  throw new Error(`Missing bundled plugin: ${bundledPath}`);
}

const source = fs.readFileSync(bundledPath, "utf8");
const rbxmx = buildRbxmx(source);

fs.mkdirSync(path.dirname(buildRbxmxPath), { recursive: true });
fs.writeFileSync(buildRbxmxPath, rbxmx, "utf8");

if (!buildOnly) {
  fs.mkdirSync(pluginsDir, { recursive: true });
  fs.writeFileSync(installedPath, rbxmx, "utf8");

  for (const legacyPath of legacyPaths) {
    if (fs.existsSync(legacyPath)) {
      fs.unlinkSync(legacyPath);
      console.log(`Removed legacy plugin: ${legacyPath}`);
    }
  }

  console.log(`Installed local plugin: ${installedPath}`);
}

console.log(`Build artifact: ${buildRbxmxPath}`);
console.log(`Source bytes: ${source.length}`);
