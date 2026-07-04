#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const pluginRoot = path.resolve(__dirname, "..");
const bundledPath = path.join(pluginRoot, "NexusRBXStudioBridge.plugin.lua");
const outDir = path.join(pluginRoot, "build", "studio-push-payloads");

require("./bundle-plugin.js");

const source = fs.readFileSync(bundledPath, "utf8");
const lines = source.split("\n");
const chunkSize = 900;
const chunks = [];
for (let i = 0; i < lines.length; i += chunkSize) {
  let chunk = lines.slice(i, i + chunkSize).join("\n");
  if (i + chunkSize < lines.length) {
    chunk += `\n-- __CHUNK_${chunks.length}__`;
  }
  chunks.push(chunk);
}

fs.mkdirSync(outDir, { recursive: true });

chunks.forEach((chunk, index) => {
  const code = [
    'local folder = game.ServerStorage:FindFirstChild("_NexusPluginBuild")',
    "if not folder then",
    '\tfolder = Instance.new("Folder")',
    '\tfolder.Name = "_NexusPluginBuild"',
    "\tfolder.Parent = game.ServerStorage",
    "end",
    `\tlocal sv = folder:FindFirstChild("${index}")`,
    "if not sv then",
    '\tsv = Instance.new("StringValue")',
    `\tsv.Name = "${index}"`,
    "\tsv.Parent = folder",
    "end",
    `sv.Value = [==[${chunk}]==]`,
    "return { chunk = " + index + ", length = #sv.Value }",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, `chunk-${index}.json`), JSON.stringify({ code }), "utf8");
});

const finalizeCode = [
  'local folder = game.ServerStorage:FindFirstChild("_NexusPluginBuild")',
  "if not folder then",
  '\treturn { ok = false, error = "Missing build chunks" }',
  "end",
  "local parts = {}",
  `for index = 0, ${chunks.length - 1} do`,
  '\tlocal sv = folder:FindFirstChild(tostring(index))',
  "\tif not sv then",
  '\t\treturn { ok = false, error = "Missing chunk " .. tostring(index) }',
  "\tend",
  '\tlocal part = sv.Value:gsub("\\n%-%- __CHUNK_%d+__$", "")',
  "\ttable.insert(parts, part)",
  "end",
  'local source = table.concat(parts, "\\n")',
  'local existing = game.ServerStorage:FindFirstChild("NexusRBXStudioBridge")',
  "if existing then",
  "\texisting:Destroy()",
  "end",
  'local scriptObj = Instance.new("Script")',
  'scriptObj.Name = "NexusRBXStudioBridge"',
  "scriptObj.Source = source",
  "scriptObj.Parent = game.ServerStorage",
  "folder:Destroy()",
  "return { ok = true, length = #source, name = scriptObj.Name }",
].join("\n");

fs.writeFileSync(path.join(outDir, "finalize.json"), JSON.stringify({ code: finalizeCode }), "utf8");
console.log(`Wrote ${chunks.length} chunk payloads and finalize payload to ${outDir}`);
