#!/usr/bin/env node

const path = require("node:path");
const net = require("node:net");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const backendRoot = path.join(root, "backend");
const reactStart = path.join(root, "node_modules", "react-scripts", "scripts", "start.js");
const children = new Set();
let shuttingDown = false;

function startProcess(label, args, cwd, overrides) {
  const child = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...overrides },
    stdio: "inherit",
    windowsHide: true,
  });
  children.add(child);
  child.once("exit", (code, signal) => {
    children.delete(child);
    if (shuttingDown) return;
    console.error(`\n[local] ${label} stopped unexpectedly (${signal || code || 0}).`);
    shutdown(code || 1);
  });
  child.once("error", (error) => {
    console.error(`[local] Could not start ${label}: ${error.message}`);
    shutdown(1);
  });
  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGINT");
  }
  const forceExit = setTimeout(() => process.exit(exitCode), 3000);
  forceExit.unref?.();
  if (children.size === 0) process.exit(exitCode);
  Promise.all(
    [...children].map((child) => new Promise((resolve) => child.once("exit", resolve)))
  ).finally(() => process.exit(exitCode));
}

function assertPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.once("error", (error) => {
      reject(new Error(
        error.code === "EADDRINUSE"
          ? `Port ${port} is already in use. Stop the old NexusRBX process and run this command again.`
          : `Could not check port ${port}: ${error.message}`
      ));
    });
    probe.listen(port, "127.0.0.1", () => probe.close(resolve));
  });
}

async function main() {
  await Promise.all([assertPortAvailable(3000), assertPortAvailable(5001)]);

  console.log("NexusRBX local AI environment");
  console.log("  Website:        http://localhost:3000/ai");
  console.log("  Local API:      http://localhost:5001");
  console.log("  Roblox redirect http://localhost:5001/api/roblox/oauth/callback");
  console.log("  AI worker:      enabled (real configured provider)\n");

  startProcess("backend", ["server.js"], backendRoot, {
    NODE_ENV: "development",
    HOST: "127.0.0.1",
    PORT: "5001",
    FRONTEND_ORIGIN: "http://localhost:3000",
    FRONTEND_URL: "http://localhost:3000",
    CORS_ALLOW_LOCALHOST: "true",
    APP_CHECK_MODE: "off",
    ROBLOX_OAUTH_REDIRECT_URI: "http://localhost:5001/api/roblox/oauth/callback",
    RUN_JOB_WORKER: "true",
    LOCAL_DEV_JOB_WORKER_ONLY: "true",
    JOB_WORKER_USER_ID: "nexusrbx-local-dev",
    JOB_WORKER_DISABLE_GLOBAL_SWEEPS: "true",
    STUDIO_AGENT_MAX_RUNTIME_MS: "0",
    TASK_RUNTIME_WRITE_MODE: "canonical",
    TASK_RUNTIME_READ_MODE: "canonical",
    TASK_CANONICAL_LEGACY_ADAPTER_ENABLED: "true",
    TASK_OUTBOX_DISPATCH_ENABLED: "false",
    RUN_CHAT_AGENT_RECONCILIATION_WORKER: "false",
    RUN_ASSET_PUBLISHING_RECONCILIATION_WORKER: "false",
    TRACK_PAGE_VIEWS: "false",
    JOB_WORKER_POLL_MS: "1000",
  });

  startProcess("frontend", [reactStart], root, {
    NODE_ENV: "development",
    PORT: "3000",
    REACT_APP_BACKEND_URL: "http://localhost:5001",
    REACT_APP_APP_CHECK_ENABLED: "false",
    REACT_APP_GENERATION_WALL_TIMEOUT_MS: "0",
    REACT_APP_PENDING_RUN_RECOVERY_WALL_TIMEOUT_MS: "0",
  });
}

process.once("SIGINT", () => shutdown(0));
process.once("SIGTERM", () => shutdown(0));
void main().catch((error) => {
  console.error(`[local] ${error.message}`);
  process.exit(1);
});
