#!/usr/bin/env node

const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const nodemonBin = path.join(
  root,
  "backend",
  "node_modules",
  "nodemon",
  "bin",
  "nodemon.js"
);

// Source files are handled by React/Next hot reload and the backend's own
// nodemon process. These watches are limited to files that require rebuilding
// the process environment or restarting the complete local stack.
const watchedPaths = [
  "scripts/local-ai-dev.js",
  "package.json",
  ".env",
  ".env.local",
  "backend/package.json",
  "backend/.env",
  "public-frontend/package.json",
  "public-frontend/next.config.js",
  "public-frontend/next.config.mjs",
];

const args = [
  nodemonBin,
  "--signal",
  "SIGTERM",
  "--delay",
  "500ms",
  "--ext",
  "js,cjs,mjs,json,env",
];

for (const watchedPath of watchedPaths) {
  args.push("--watch", watchedPath);
}

args.push("scripts/local-ai-dev.js");

const watcher = spawn(process.execPath, args, {
  cwd: root,
  env: process.env,
  stdio: "inherit",
  windowsHide: true,
});

watcher.once("error", (error) => {
  console.error(`[local] Could not start the process watcher: ${error.message}`);
  process.exitCode = 1;
});

watcher.once("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});

