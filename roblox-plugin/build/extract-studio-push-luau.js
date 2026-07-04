#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const payloadDir = path.join(__dirname, "studio-push-payloads");
for (let i = 0; i < 6; i++) {
  const { code } = JSON.parse(fs.readFileSync(path.join(payloadDir, `chunk-${i}.json`), "utf8"));
  fs.writeFileSync(path.join("/tmp", `nexus-mcp-chunk-${i}.luau`), code, "utf8");
}
const finalize = JSON.parse(fs.readFileSync(path.join(payloadDir, "finalize.json"), "utf8"));
fs.writeFileSync("/tmp/nexus-mcp-finalize.luau", finalize.code, "utf8");
console.log("Wrote raw Luau payloads to /tmp/nexus-mcp-chunk-*.luau");
