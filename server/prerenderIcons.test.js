const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_PRERENDER_ICON_LIMIT,
  isPrerenderedIconId,
  prerenderIconLimit,
  selectPrerenderIcons,
} = require("./prerenderIcons");

test("selectPrerenderIcons limits static export count", () => {
  const icons = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(selectPrerenderIcons(icons, 2), [{ id: "a" }, { id: "b" }]);
  assert.equal(isPrerenderedIconId("c", icons, 2), false);
  assert.equal(isPrerenderedIconId("a", icons, 2), true);
});

test("selectPrerenderIcons is deterministic and removes invalid duplicate IDs", () => {
  const icons = [
    { id: "charlie", name: "Charlie" },
    { id: " alpha ", name: "Alpha" },
    { id: "bravo", name: "Bravo" },
    { id: "alpha", name: "Duplicate Alpha" },
    { name: "Missing ID" },
  ];

  assert.deepEqual(
    selectPrerenderIcons(icons, 2),
    [
      { id: "alpha", name: "Alpha" },
      { id: "bravo", name: "Bravo" },
    ],
  );
});

test("prerenderIconLimit falls back to default for invalid values", () => {
  const original = process.env.PRERENDER_ICON_LIMIT;
  process.env.PRERENDER_ICON_LIMIT = "not-a-number";
  assert.equal(prerenderIconLimit(), DEFAULT_PRERENDER_ICON_LIMIT);
  process.env.PRERENDER_ICON_LIMIT = original;
});
