import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConnectorError } from "../src/errors.js";
import { McpPortGuard, windowsPortOperations, type PortOwner } from "../src/mcp-port-guard.js";
import type { Logger } from "../src/logger.js";

const env = { LOCALAPPDATA: "C:\\Users\\test\\AppData\\Local", APPDATA: "C:\\Users\\test\\AppData\\Roaming" };
const official = { command: `${env.LOCALAPPDATA}\\Roblox\\Versions\\version-abcdef\\StudioMCP.exe`, args: [] };
const ropilot: PortOwner = { pid: 123, name: "ropilot-infra-helper.exe", path: `${env.APPDATA}\\ropilot\\bin\\ropilot-infra-helper.exe`, createdAt: "2026-09-06T01:02:03.123456Z", sameUser: true };
const logger: Logger = { info() {}, warn() {}, error() {}, debug() {}, addSecret() {}, addTransientSecret() {} };
const conflict = (error: unknown) => error instanceof ConnectorError && error.code === "MCP_PORT_CONFLICT";

function fixture(initial: PortOwner[], after: PortOwner[] = [], overrides: { platform?: NodeJS.Platform; env?: NodeJS.ProcessEnv } = {}) {
  let owners = initial;
  let checks = 0;
  const released: PortOwner[] = [];
  const guard = new McpPortGuard(logger, { platform: "win32", env, ...overrides, operations: {
    async inspect() { checks++; return owners; },
    async release(owner) { released.push(owner); owners = after; },
  } });
  return { guard, released, get checks() { return checks; }, setOwners(value: PortOwner[]) { owners = value; } };
}

test("free port and official Studio server are left alone", async () => {
  for (const owners of [[], [{ ...ropilot, name: "StudioMCP.exe", path: official.command }]]) {
    const f = fixture(owners); await f.guard.prepare(official); assert.equal(f.released.length, 0);
  }
});

test("known same-user Ropilot proxy is released once before a fresh handshake", async () => {
  const f = fixture([ropilot]);
  await f.guard.prepare(official);
  assert.deepEqual(f.released, [ropilot]);
  assert.equal(f.checks, 2);
  await f.guard.prepare(official);
  f.setOwners([ropilot]);
  await assert.rejects(f.guard.prepare(official), conflict);
  assert.equal(f.released.length, 1);
});

test("unknown apps, lookalike binaries, other users and multiple owners are never stopped", async () => {
  for (const owners of [
    [{ ...ropilot, name: "RobloxStudioBeta.exe", path: official.command.replace("StudioMCP", "RobloxStudioBeta") }],
    [{ ...ropilot, path: "C:\\other\\ropilot-infra-helper.exe" }],
    [{ ...ropilot, sameUser: false }],
    [ropilot, { ...ropilot, pid: 456 }],
    [{ ...ropilot, name: "service.exe", path: "" }],
  ]) {
    const f = fixture(owners);
    await assert.rejects(f.guard.prepare(official), conflict);
    assert.equal(f.released.length, 0);
  }
});

test("rapidly respawning Ropilot stops recovery with an actionable conflict", async () => {
  const f = fixture([ropilot], [{ ...ropilot, pid: 456 }]);
  await assert.rejects(f.guard.prepare(official), conflict);
  await assert.rejects(f.guard.prepare(official), conflict);
  assert.equal(f.released.length, 1);
});

test("a Roblox server taking over immediately after recovery is accepted", async () => {
  const f = fixture([ropilot], [{ ...ropilot, name: "StudioMCP.exe", path: official.command, pid: 456 }]);
  await f.guard.prepare(official);
  assert.equal(f.released.length, 1);
});

test("opt-out, custom launchers, alternate ports and non-Windows hosts are respected", async () => {
  const off = fixture([ropilot], [], { env: { ...env, NEXUSRBX_AUTO_RESOLVE_MCP_CONFLICTS: "0" } });
  await assert.rejects(off.guard.prepare(official), conflict);
  assert.equal(off.released.length, 0);
  for (const [launch, overrides] of [
    [{ command: "custom-mcp.exe", args: [] }, {}],
    [{ ...official, args: ["--custom"] }, {}],
    [official, { env: { ...env, MCP_PROXY_HTTP_PORT: "23456" } }],
    [official, { platform: "darwin" }],
  ] as const) {
    const f = fixture([ropilot], [], overrides);
    await f.guard.prepare({ ...launch, args: [...launch.args] });
    assert.equal(f.checks, 0);
    assert.equal(f.released.length, 0);
  }
});

test("simultaneous attempts share inspection and cannot release overlapping helpers", async () => {
  const f = fixture([ropilot]);
  await Promise.all([f.guard.prepare(official), f.guard.prepare(official), f.guard.prepare(official)]);
  assert.equal(f.released.length, 1);
  assert.equal(f.checks, 2);
});

test("failed release is bounded and does not expose raw process errors or credentials", async () => {
  let releases = 0;
  const guard = new McpPortGuard(logger, { platform: "win32", env, operations: {
    async inspect() { return [ropilot]; },
    async release() { releases++; throw Error("Access denied token=private-value"); },
  } });
  for (let i = 0; i < 2; i++) await assert.rejects(guard.prepare(official), error => {
    assert.ok(conflict(error));
    assert.doesNotMatch(JSON.stringify(error), /private-value/);
    return true;
  });
  assert.equal(releases, 1);
});

test("aborting during inspection never closes a process", async () => {
  const controller = new AbortController(); let releases = 0;
  const guard = new McpPortGuard(logger, { platform: "win32", env, operations: {
    async inspect() { controller.abort(); return [ropilot]; },
    async release() { releases++; },
  } });
  await assert.rejects(guard.prepare(official, controller.signal), { name: "AbortError" });
  assert.equal(releases, 0);
});

test("Windows native inspection works and refuses an unowned process identity", { skip: process.platform !== "win32" }, async () => {
  const operations = windowsPortOperations();
  const owners = await operations.inspect();
  assert.ok(Array.isArray(owners));
  // A real process id with an impossible creation time must never be terminated.
  await assert.rejects(operations.release({ ...ropilot, pid: process.pid, createdAt: "invalid" }));
  assert.ok(process.pid > 0);
});

test("Windows native recovery validates identity and stops only the isolated conflicting helper", { skip: process.platform !== "win32", timeout: 40000 }, async (t) => {
  const root = await mkdtemp(join(tmpdir(), "nexus-mcp-guard-"));
  const bin = join(root, "ropilot", "bin");
  await mkdir(bin, { recursive: true });
  const exe = join(bin, "ropilot-infra-helper.exe");
  await copyFile(process.execPath, exe);
  const child = spawn(exe, ["-e", "const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>console.log(s.address().port));"], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  const exited = once(child, "exit");
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) child.kill(); await exited; await rm(root, { recursive: true, force: true }); });
  const [chunk] = await once(child.stdout!, "data");
  const operations = windowsPortOperations({ port: Number(String(chunk).trim()), appData: root });
  const [owner] = await operations.inspect();
  assert.equal(owner?.pid, child.pid);
  assert.equal(owner?.sameUser, true);
  await assert.rejects(operations.release({ ...owner!, createdAt: "wrong-creation-time" }));
  assert.equal(child.exitCode, null);
  await operations.release(owner!);
  await exited;
  assert.deepEqual(await operations.inspect(), []);
});
