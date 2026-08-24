#!/usr/bin/env node
/**
 * rehype-harden 1.1.8 publishes only dist/, but its JavaScript source map
 * references ../src/index.ts without embedding the source. CRA's
 * source-map-loader consequently warns on every build.
 *
 * Remove only the unusable source-map directive when that exact source is
 * absent. Valid maps, including a future package release that ships or embeds
 * the source, are left untouched.
 */
const fs = require("fs");
const path = require("path");

const packageDir = path.join(__dirname, "..", "node_modules", "rehype-harden");
const entryPath = path.join(packageDir, "dist", "index.js");
const mapPath = path.join(packageDir, "dist", "index.js.map");

if (!fs.existsSync(entryPath) || !fs.existsSync(mapPath)) {
  process.exit(0);
}

const sourceMap = JSON.parse(fs.readFileSync(mapPath, "utf8"));
const brokenSource = "../src/index.ts";
const sourceIndex = Array.isArray(sourceMap.sources)
  ? sourceMap.sources.indexOf(brokenSource)
  : -1;

if (sourceIndex === -1) {
  process.exit(0);
}

const embeddedSource = Array.isArray(sourceMap.sourcesContent)
  ? sourceMap.sourcesContent[sourceIndex]
  : undefined;
const sourcePath = path.resolve(
  path.dirname(mapPath),
  sourceMap.sourceRoot || "",
  brokenSource
);

if (typeof embeddedSource === "string" || fs.existsSync(sourcePath)) {
  process.exit(0);
}

const sourceMapDirective = /(?:\r?\n)?\/\/# sourceMappingURL=index\.js\.map\s*$/;
const entrySource = fs.readFileSync(entryPath, "utf8");

if (!sourceMapDirective.test(entrySource)) {
  process.exit(0);
}

fs.writeFileSync(entryPath, entrySource.replace(sourceMapDirective, "\n"));
console.log("[patch-rehype-harden] removed broken dist/index.js source-map reference");
