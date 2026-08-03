import assert from "node:assert/strict";
import test from "node:test";
import { isTerminalSessionError, resetLocalSession } from "../src/session-lifecycle.js";

test("resetLocalSession clears local state when remote revocation fails", async () => {
  const events: string[] = [];
  const remoteError = new Error("session already revoked");

  const result = await resetLocalSession({
    revokeRemote: async () => { events.push("revoke"); throw remoteError; },
    stopLocal: async () => { events.push("stop"); },
    clearLocal: async () => { events.push("clear"); },
  });

  assert.equal(result, remoteError);
  assert.deepEqual(events, ["revoke", "stop", "clear"]);
});

test("resetLocalSession clears credentials even when local shutdown fails", async () => {
  const events: string[] = [];
  await assert.rejects(
    resetLocalSession({
      stopLocal: async () => { events.push("stop"); throw new Error("stop failed"); },
      clearLocal: async () => { events.push("clear"); },
    }),
    /stop failed/,
  );
  assert.deepEqual(events, ["stop", "clear"]);
});

test("identifies revoked connector sessions as terminal", () => {
  assert.equal(isTerminalSessionError({ code: "CONNECTOR_AUTH_FAILED" }), true);
  assert.equal(isTerminalSessionError({ code: "CONNECTOR_NOT_PAIRED" }), true);
  assert.equal(isTerminalSessionError({ code: "CONNECTOR_NETWORK_ERROR" }), false);
  assert.equal(isTerminalSessionError(new Error("CONNECTOR_AUTH_FAILED")), false);
});
