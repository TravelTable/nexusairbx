import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("connector help opens the authoritative Studio plugin documentation", () => {
  const source = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");

  assert.match(
    source,
    /const HELP_PAGE = "https:\/\/www\.nexusrbx\.com\/docs\/studio-plugin";/,
  );
  assert.doesNotMatch(source, /\/docs\/studio-mcp/);
});
