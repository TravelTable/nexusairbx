#!/usr/bin/env node
/**
 * @lobehub/icons 5.x ships Obsidian Color.d.ts without Color.js, which breaks CRA builds.
 * Mirror Mono.js as Color.js when the file is missing.
 */
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "node_modules", "@lobehub", "icons", "es", "Obsidian", "components");
const colorJs = path.join(dir, "Color.js");
const monoJs = path.join(dir, "Mono.js");

if (!fs.existsSync(dir) || !fs.existsSync(monoJs)) {
  process.exit(0);
}

if (!fs.existsSync(colorJs)) {
  fs.copyFileSync(monoJs, colorJs);
  console.log("[patch-lobehub] wrote Obsidian/components/Color.js");
}
