import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("deep links cannot observe the desktop controller before initialization completes", () => {
  const source = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
  const startup = source.slice(source.indexOf("app.whenReady().then(async () =>"));
  const constructed = startup.indexOf("const initializedController = new DesktopController()");
  const initialized = startup.indexOf("await initializedController.initialize()");
  const published = startup.indexOf("controller = initializedController");

  assert.ok(constructed >= 0, "startup must construct a private controller");
  assert.ok(initialized > constructed, "the private controller must initialize after construction");
  assert.ok(published > initialized, "the global controller must not publish before initialization completes");
  assert.match(source, /if \(!controller\) \{\s+pendingPairingCode = code;/);
});
