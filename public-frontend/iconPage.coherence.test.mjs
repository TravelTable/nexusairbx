import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL("./app/icons/[id]/page.jsx", import.meta.url),
  "utf8",
);

test("public icon detail uses the canonical Creator Store name", () => {
  assert.match(source, /name: "Creator Store"/);
  assert.match(source, />Creator Store<\/a>/);
  assert.match(source, /Browse Creator Store/);
  assert.doesNotMatch(source, /Icon Marketplace|Icons Market|Browse marketplace/);
});
