import assert from "node:assert/strict";
import test from "node:test";
import { extractExperienceName } from "../src/connector.js";

test("extractExperienceName reads bounded structured Studio state", () => {
  assert.equal(
    extractExperienceName({ structuredContent: { studio: { placeName: "  My   Roblox Experience  " } } }),
    "My Roblox Experience",
  );
});

test("extractExperienceName reads JSON MCP text content", () => {
  assert.equal(
    extractExperienceName({ content: [{ type: "text", text: JSON.stringify({ experience: { gameName: "Obby" } }) }] }),
    "Obby",
  );
});

test("extractExperienceName ignores unstructured and generic names", () => {
  assert.equal(extractExperienceName({ content: [{ type: "text", text: "Current experience: Secret" }] }), null);
  assert.equal(extractExperienceName({ structuredContent: { name: "Untrusted generic label" } }), null);
});
