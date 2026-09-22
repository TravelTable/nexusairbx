const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.resolve(__dirname, "../src/Main.server.lua"), "utf8")
  .replace(/\r\n?/g, "\n");

test("poll, executor, and heartbeat loops share a restart supervisor", () => {
  assert.match(source, /function superviseNexusBridgeLoop\(loopName, runLoop\)/);
  assert.match(source, /pcall\(runLoop\)/);
  assert.match(source, /task\.wait\(restartDelay\)/);

  const supervised = [...source.matchAll(/superviseNexusBridgeLoop\("([^"]+)", function\(\)[\s\S]{0,120}?while true do/g)]
    .map(match => match[1]);
  assert.deepEqual(supervised, ["command polling", "command executor", "session heartbeat"]);
});

test("loop restart diagnostics cannot interpolate caught error or credentials", () => {
  const start = source.indexOf("function superviseNexusBridgeLoop(loopName, runLoop)");
  const end = source.indexOf("\nend\n\n-- Poll loop:", start) + "\nend".length;
  assert.ok(start >= 0 && end > start);
  const supervisor = source.slice(start, end);
  assert.doesNotMatch(supervisor, /local\s+[^\n]*error|pcall\(runLoop\)\s*,/i);
  assert.doesNotMatch(supervisor, /getToken|nexusrbxStudioToken|Authorization|tostring\s*\(/);
  assert.match(supervisor, /warn\(\("NexusRBX %s loop stopped unexpectedly; restarting in %\.1fs"\):format\(loopName, restartDelay\)\)/);
});
