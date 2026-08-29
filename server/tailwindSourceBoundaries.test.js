const assert = require("node:assert/strict");
const test = require("node:test");

const config = require("../tailwind.config");

test("Tailwind excludes generated public exports from source discovery", () => {
  const sources = config.content.map((entry) => String(entry).replaceAll("\\", "/"));

  assert.ok(sources.some((entry) => entry.includes("public-frontend/**/*")));
  assert.ok(sources.some((entry) => entry.startsWith("!") && entry.includes("public-frontend/{out,.next}/**/*")));
  assert.ok(sources.some((entry) => entry.startsWith("!") && entry.includes("build/**/*")));
});
