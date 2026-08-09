import assert from "node:assert/strict";
import test from "node:test";
import { normalizePairingCode, parsePairingDeepLink } from "../src/pairing.js";
test("accepts only an issued connector pairing deep link", () => {
  assert.equal(parsePairingDeepLink("nexusrbx://connector/pair?code=ab1-2cd"), "AB12CD");
  assert.equal(parsePairingDeepLink("nexusrbx://connector/pair?code=ab12-cd34"), null);
  assert.equal(parsePairingDeepLink("nexusrbx://connector/other?code=AB12"), null);
  assert.equal(parsePairingDeepLink("https://connector/pair?code=AB12"), null);
});

test("manual entry and deep links share the exact six-character contract", () => {
  assert.equal(normalizePairingCode(" ab1-2cd "), "AB12CD");
  assert.throws(() => normalizePairingCode("AB12"), /six letters or numbers/);
  assert.throws(() => normalizePairingCode("AB12-CD34"), /six letters or numbers/);
});
