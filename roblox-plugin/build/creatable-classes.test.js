const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { CREATABLE_CLASSES } = require("../../backend/src/lib/studioToolProtocol");

test("Studio plugin accepts every create_instance class allowed by the backend", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "src", "studio", "serialization.lua"),
    "utf8"
  );
  const block = source.match(/local CREATABLE_CLASSES = \{([\s\S]*?)\n\}/)?.[1] || "";
  for (const className of CREATABLE_CLASSES) {
    assert.match(block, new RegExp(`(?:^|\\n)\\s*${className}\\s*=\\s*true,`), className);
  }
});

