const fs = require("fs");
const path = require("path");
const postcss = require("postcss");

const css = fs.readFileSync(path.join(__dirname, "HomepageCinematic.module.css"), "utf8");
const root = postcss.parse(css);

function declarations(rule) {
  if (!rule) throw new Error("Expected CSS rule was not found");
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
  return media?.nodes.find((node) => node.type === "rule" && node.selector === selector);
}

test("keeps the product as the hero rather than a decorative workshop", () => {
  expect(declarations(topLevelRule(".hero"))).not.toHaveProperty("height");
  expect(declarations(topLevelRule(".productDemo"))).toMatchObject({
    display: "grid",
    "grid-template-columns": "176px minmax(340px, 0.86fr) minmax(430px, 1.14fr)",
    "min-height": "660px",
  });
  expect(declarations(topLevelRule(".heroIntro h1"))["font-size"]).toBe("clamp(42px, 5.2vw, 72px)");
  expect(css).not.toMatch(/workshop|miniWorld|nexus-cinematic/i);
});

test("reflows the product, Stage, and genre controls instead of clipping them", () => {
  expect(declarations(mediaRule("(max-width: 1180px)", ".productDemo"))["grid-template-columns"]).toBe(
    "minmax(340px, 0.86fr) minmax(430px, 1.14fr)",
  );
  expect(declarations(mediaRule("(max-width: 1023px)", ".productDemo"))["grid-template-columns"]).toBe("1fr");
  expect(declarations(mediaRule("(max-width: 1023px)", ".productStage"))["min-height"]).toBe("610px");
  expect(declarations(mediaRule("(max-width: 767px)", ".genreSelector"))["grid-template-columns"]).toBe("1fr");
  expect(declarations(mediaRule("(max-width: 767px)", ".requestRail"))["overflow-x"]).toBe("auto");
  expect(declarations(topLevelRule(".genreImage"))["aspect-ratio"]).toBe("16 / 10");
  expect(declarations(topLevelRule(".genreImage img"))).toMatchObject({
    width: "100%",
    height: "100%",
    "object-fit": "cover",
  });
});

test("uses purposeful one-shot motion with calmer accessibility fallbacks", () => {
  expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  expect(css).toContain("@media (prefers-reduced-transparency: reduce)");
  expect(css).toContain("@media (forced-colors: active)");
  expect(css).not.toContain("infinite");
  expect(css).toContain("construction-scan");
  expect(css).toContain("stage-detail-in");
});
