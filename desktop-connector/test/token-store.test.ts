import assert from "node:assert/strict";
import test from "node:test";
import { EncryptedTokenStore } from "../src/token-store.js";
test("encrypts the persisted connector session and never stores a pairing code", async () => {
  let value: Buffer | null = null;
  const store = new EncryptedTokenStore({ isEncryptionAvailable: () => true, encryptString: (text) => Buffer.from(`encrypted:${text}`), decryptString: (data) => data.toString().slice(10), read: async () => value, write: async (data) => { value = data; }, remove: async () => { value = null; } });
  await store.save({ token: "nsmcp_x_y", sessionId: "session", userId: "user", pollIntervalMs: 1000, expiresInMs: 2000 });
  assert.match(value?.toString() || "", /^encrypted:/);
  assert.equal(value?.toString().includes("pairCode"), false);
  assert.equal((await store.load())?.token, "nsmcp_x_y");
  await store.clear(); assert.equal(await store.load(), null);
});
