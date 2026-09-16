import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const { resolvePublicAppHref, isPublicAppPath } = require(path.join(here, "lib/appHref.js"));

test("local public pages send workspace routes to the app origin", () => {
  const previous = process.env.NODE_ENV;

  process.env.NODE_ENV = "development";
  assert.equal(isPublicAppPath("/ai"), true);
  assert.equal(isPublicAppPath("/ai?mode=ui"), true);
  assert.equal(isPublicAppPath("/pricing"), false);
  assert.equal(resolvePublicAppHref("/ai"), "http://localhost:3000/ai");
  assert.equal(resolvePublicAppHref("/ai?mode=ui"), "http://localhost:3000/ai?mode=ui");
  assert.equal(resolvePublicAppHref("/pricing"), "/pricing");

  process.env.NODE_ENV = "production";
  assert.equal(resolvePublicAppHref("/ai"), "/ai");

  process.env.NODE_ENV = previous;
});
