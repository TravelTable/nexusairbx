#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const payloadDir = path.join(__dirname, "studio-push-payloads");
const outDir = "/tmp/nexus-mcp-payloads";
fs.mkdirSync(outDir, { recursive: true });

for (let i = 0; i < 6; i += 1) {
  const { code } = JSON.parse(fs.readFileSync(path.join(payloadDir, `chunk-${i}.json`), "utf8"));
  fs.writeFileSync(
    path.join(outDir, `chunk-${i}.json`),
    JSON.stringify({ datamodel_type: "Edit", code }),
    "utf8",
  );
}

const finalize = JSON.parse(fs.readFileSync(path.join(payloadDir, "finalize.json"), "utf8"));
fs.writeFileSync(
  path.join(outDir, "finalize.json"),
  JSON.stringify({ datamodel_type: "Edit", code: finalize.code }),
  "utf8",
);

console.log(JSON.stringify(fs.readdirSync(outDir).map((name) => ({
  name,
  bytes: fs.statSync(path.join(outDir, name)).size,
}))));
