import assert from "node:assert/strict";
import test from "node:test";
import { parsePairingDeepLink } from "../src/pairing.js";
test("accepts only an issued connector pairing deep link", () => {
  assert.equal(parsePairingDeepLink("nexusrbx://connector/pair?code=ab12-cd34"), "AB12-CD34");
  assert.equal(parsePairingDeepLink("nexusrbx://connector/other?code=AB12"), null);
  assert.equal(parsePairingDeepLink("https://connector/pair?code=AB12"), null);
});
