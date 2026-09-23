import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_PREFERENCES, getAutoStart, PreferenceStore, setAutoStart, validatePreferenceUpdate } from "../src/preferences.js";

test("updates only the constrained login preference", () => {
  let enabled = false;
  const login = {
    getLoginItemSettings: () => ({ openAtLogin: enabled }),
    setLoginItemSettings: (next: { openAtLogin: boolean }) => { enabled = next.openAtLogin; },
  };
  assert.equal(setAutoStart(login, true), true);
  assert.equal(getAutoStart(login), true);
});

test("preference validation accepts only the renderer allowlist and clamps reconnect delay", () => {
  assert.deepEqual(validatePreferenceUpdate("theme", "system"), { key: "theme", value: "system" });
  assert.deepEqual(validatePreferenceUpdate("autoReconnect", false), { key: "autoReconnect", value: false });
  assert.deepEqual(validatePreferenceUpdate("reconnectDelayMs", 200), { key: "reconnectDelayMs", value: 1_000 });
  assert.deepEqual(validatePreferenceUpdate("reconnectDelayMs", 90_000), { key: "reconnectDelayMs", value: 30_000 });

  assert.throws(() => validatePreferenceUpdate("theme", "purple"), /Invalid theme/);
  assert.throws(() => validatePreferenceUpdate("autoReconnect", "yes"), /boolean/);
  assert.throws(() => validatePreferenceUpdate("mcpCommand", "/tmp/not-allowed"), /Unknown preference/);
  assert.throws(() => validatePreferenceUpdate("workspaceEnabled", true), /Unknown preference/);
});

test("loads preferences while ignoring a legacy workspaceEnabled flag", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nexus-connector-prefs-"));
  const path = join(directory, "preferences.json");
  await writeFile(path, JSON.stringify({
    ...DEFAULT_PREFERENCES,
    theme: "light",
    workspaceEnabled: true,
  }));
  const loaded = await new PreferenceStore(path).load();
  assert.equal(loaded.theme, "light");
  assert.equal("workspaceEnabled" in loaded, false);
});
