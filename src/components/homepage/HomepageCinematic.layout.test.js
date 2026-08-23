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
  return root.nodes.find((node) => node.type === "rule" && node.selectors.includes(selector));
}

function mediaRule(params, selector) {
  const media = root.nodes.find(
    (node) => node.type === "atrule" && node.name === "media" && node.params === params,
  );
  return media?.nodes.find((node) => node.type === "rule" && node.selectors.includes(selector));
}

test("opens on one concrete request beside the project it will change", () => {
  expect(declarations(topLevelRule(".hero"))).toMatchObject({
    display: "grid",
    "grid-template-columns": "minmax(20rem, 0.78fr) minmax(32rem, 1.22fr)",
    "grid-template-areas": '"request project"',
  });
  expect(declarations(topLevelRule(".requestOpening"))).toMatchObject({
    "grid-area": "request",
    "border-right": "1px solid var(--nx-rule)",
    background: "var(--nx-depth)",
  });
  expect(declarations(topLevelRule(".projectCutaway"))).toMatchObject({
    "grid-area": "project",
    display: "grid",
    background: "var(--nx-work)",
  });
  expect(declarations(topLevelRule(".requestOpening h1"))["font-size"])
    .toBe("clamp(2.4rem, 5vw, 3.625rem)");
  expect(css).not.toMatch(/workshop|miniWorld|productDemo|nexus-cinematic/i);
});

test("reflows the request record, evidence, and selected-world atlas instead of squeezing desktop columns", () => {
  expect(declarations(mediaRule("(max-width: 1100px)", ".hero"))["grid-template-columns"])
    .toBe("minmax(19rem, 0.9fr) minmax(27rem, 1.1fr)");
  expect(declarations(mediaRule("(max-width: 834px)", ".hero"))).toMatchObject({
    "grid-template-columns": "1fr",
    "grid-template-areas": '"request" "project"',
    "min-height": "0",
  });
  expect(declarations(mediaRule("(max-width: 834px)", ".readRecord"))["grid-template-columns"]).toBe("1fr");
  expect(declarations(mediaRule("(max-width: 834px)", ".genreAtlas"))).toMatchObject({
    "grid-template-columns": "1fr",
    "grid-template-areas": '"heading" "world" "index" "brief"',
  });
  expect(declarations(mediaRule("(max-width: 600px)", ".loadedBrief"))["grid-template-columns"]).toBe("1fr");
  expect(declarations(topLevelRule(".atlasWorld img"))).toMatchObject({
    width: "100%",
    height: "auto",
    "object-fit": "cover",
  });
});

test("keeps the ledger still by default with explicit accessibility fallbacks", () => {
  expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  expect(css).toContain("@media (forced-colors: active)");
  expect(css).not.toContain("infinite");
  expect(css).not.toMatch(/(?:linear|radial|conic)-gradient\(|backdrop-filter/i);
  expect(css).not.toMatch(/animation(?:-name)?\s*:/i);
  expect(css).toMatch(/\.genreIndex button\[aria-pressed="true"\][\s\S]*?border-left:/);
  expect(css).toMatch(/@media \(forced-colors: active\)[\s\S]*?border-color:\s*CanvasText/);
});
