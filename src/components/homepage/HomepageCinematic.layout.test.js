const fs = require("fs");
const path = require("path");
const postcss = require("postcss");

const css = fs.readFileSync(path.join(__dirname, "HomepageCinematic.module.css"), "utf8");
const root = postcss.parse(css);

function declarations(rule) {
  return Object.fromEntries(
    rule.nodes
      .filter((node) => node.type === "decl")
      .map((node) => [node.prop, node.value]),
  );
}

function topLevelRule(selector) {
  return root.nodes.find((node) => node.type === "rule" && node.selector === selector);
}

function mediaRule(params, selector) {
  const media = root.nodes.find(
    (node) => node.type === "atrule" && node.name === "media" && node.params === params,
  );
  return media.nodes.find((node) => node.type === "rule" && node.selector === selector);
}

test("keeps the desktop hero editorial, flexible, and genre-rich", () => {
  expect(declarations(topLevelRule(".hero"))).not.toHaveProperty("height");
  expect(declarations(topLevelRule(".heroGrid"))).toMatchObject({
    "min-height": "min(820px, calc(100dvh - 64px))",
    "grid-template-columns": "minmax(0, 0.94fr) minmax(0, 1.06fr)",
  });
  expect(declarations(topLevelRule(".heroCopy h1"))["font-size"]).toBe("clamp(54px, 5.2vw, 80px)");
  expect(declarations(topLevelRule(".genreGrid"))["grid-template-columns"]).toBe(
    "repeat(6, minmax(0, 1fr))",
  );
});

test("stacks on tablet and turns genres into a compact phone strip", () => {
  expect(declarations(mediaRule("(max-width: 1023px)", ".heroGrid"))).toMatchObject({
    "min-height": "auto",
    "grid-template-columns": "1fr",
  });
  expect(declarations(mediaRule("(max-width: 767px)", ".genreGrid"))["grid-template-columns"]).toBe(
    "repeat(2, minmax(0, 1fr))",
  );
  const narrowGridRule = root.nodes
    .find((node) => node.type === "atrule" && node.params === "(max-width: 520px)")
    .nodes.find((node) => node.type === "rule" && node.selector.includes(".genreGrid"));
  expect(declarations(narrowGridRule)).toMatchObject({
    "grid-template-columns": "none",
    "grid-auto-flow": "column",
    "overflow-x": "auto",
    "scroll-snap-type": "x mandatory",
  });
  expect(declarations(mediaRule("(max-width: 520px)", ".workshopArt"))["display"]).toBe("none");
});

test("includes calmer fallbacks and no cinematic bitmap dependency", () => {
  expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  expect(css).toContain("@media (prefers-reduced-transparency: reduce)");
  expect(css).not.toContain("nexus-cinematic");
});
