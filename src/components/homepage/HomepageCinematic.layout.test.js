const fs = require("fs");
const path = require("path");
const postcss = require("postcss");

const css = fs.readFileSync(path.join(__dirname, "HomepageCinematic.module.css"), "utf8");
const root = postcss.parse(css);

function declarations(rule) {
  return Object.fromEntries(
    rule.nodes
      .filter((node) => node.type === "decl")
      .map((node) => [node.prop, node.value])
  );
}

function topLevelRule(selector) {
  return root.nodes.find((node) => node.type === "rule" && node.selector === selector);
}

function mediaRule(params, selector) {
  const media = root.nodes.find(
    (node) => node.type === "atrule" && node.name === "media" && node.params === params
  );
  return media.nodes.find((node) => node.type === "rule" && node.selector === selector);
}

test("locks the desktop homepage to the reference proportions", () => {
  expect(declarations(topLevelRule(".hero"))).toMatchObject({
    height: "100vh",
    "min-height": "100vh",
  });
  expect(declarations(topLevelRule(".heroContent h1"))).toMatchObject({
    "font-size": "76px",
    "line-height": "1",
  });
  expect(declarations(topLevelRule(".heroPrompt"))["width"]).toContain("744px");
  expect(declarations(topLevelRule(".storyList"))).toMatchObject({ gap: "64px", padding: "0 80px" });
  expect(declarations(topLevelRule(".storyCard"))).toMatchObject({
    width: "min(1250px, 100%)",
    height: "630px",
  });
});

test("locks the 390px composition to its mobile type and card rhythm", () => {
  const mobile = "(max-width: 640px)";
  expect(declarations(mediaRule(mobile, ".heroContent h1"))).toMatchObject({
    "font-size": "48px",
    "line-height": "48px",
  });
  expect(declarations(mediaRule(mobile, ".heroPrompt"))["width"]).toContain("343px");
  expect(declarations(mediaRule(mobile, ".storyList"))).toMatchObject({
    gap: "54px",
    padding: "0",
  });
  expect(declarations(mediaRule(mobile, ".storyCard"))).toMatchObject({
    width: "min(343px, calc(100vw - 32px))",
    height: "431px",
  });
  expect(declarations(mediaRule(mobile, ".storyCopy"))).toMatchObject({
    left: "32px",
    right: "32px",
  });
});
