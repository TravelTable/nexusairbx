import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";

const SOURCE_ROOTS = ["src", "public-frontend", "desktop-connector/src"];
const SKIP_DIRECTORIES = new Set(["node_modules", ".next", ".git", "dist", "build", "out", "coverage", "testMocks", "__tests__", "__snapshots__"]);
const SYMBOLS = /[\u2728\u2726\u2727\u2733\u2734\u2747\u{1f31f}\u{1f4ab}]/u;
const ENCODED_SYMBOLS = /(?:\\(?:2728|2726|2727|2733|2734|2747|1f31f|1f4ab)\b|&#(?:x(?:2728|2726|2727|2733|2734|2747|1f31f|1f4ab)|10024|10022|10023|10035|10036|10055|127775|128171);)/i;
const ICON_NAME = /sparkle/i;

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const location = path.join(directory, entry.name);
    if (entry.isDirectory()) return SKIP_DIRECTORIES.has(entry.name) ? [] : sourceFiles(location);
    return /\.(?:[cm]?[jt]sx?|css|json|html|svg)$/.test(entry.name) &&
      !/\.(?:test|spec|d)\./.test(entry.name) && !/^(?:package|.*lock)\.json$/.test(entry.name) ? [location] : [];
  });
}

function violationsInSource(source, filename) {
  const violations = [];
  const report = (reason, node) => violations.push(`${filename}:${node?.loc?.start?.line || 1} ${reason}`);
  if (!/\.[cm]?[jt]sx?$/.test(filename)) {
    const renderedSource = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "");
    if (SYMBOLS.test(renderedSource) || ENCODED_SYMBOLS.test(renderedSource)) report("rendered sparkle symbol");
    return violations;
  }
  let ast;
  try {
    ast = parse(source, {
      sourceType: "unambiguous",
      plugins: ["jsx", "typescript", "importAttributes"],
    });
  } catch (error) {
    report(`unparseable source (${error.message.split("\n")[0]})`);
    return violations;
  }
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "ImportDeclaration" && (ICON_NAME.test(node.source.value) ||
      node.specifiers.some((specifier) => ICON_NAME.test(specifier.imported?.name || specifier.imported?.value || "") || ICON_NAME.test(specifier.local?.name || "")))) {
      report("sparkle icon import (including aliases)", node);
    }
    if (node.type === "JSXIdentifier" && ICON_NAME.test(node.name)) report("sparkle JSX icon", node);
    if (node.type === "VariableDeclarator" && ICON_NAME.test(node.id?.name || "")) {
      const safeLegacyExport = filename === "src/lib/icons.js" && ["Sparkles", "WandSparkles"].includes(node.id.name) &&
        node.init?.type === "CallExpression" && node.init.callee?.name === "createIcon" && node.init.arguments?.length === 1 &&
        node.init.arguments[0]?.name === "TerminalIcon";
      if (!safeLegacyExport) report("sparkle icon definition", node);
    }
    if ((node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") && ICON_NAME.test(node.id?.name || "")) report("sparkle icon definition", node);
    const text = node.type === "StringLiteral" || node.type === "JSXText" ? node.value : node.type === "TemplateElement" ? node.value.cooked : null;
    if (typeof text === "string" && (SYMBOLS.test(text) || ENCODED_SYMBOLS.test(text))) report("rendered sparkle symbol", node);
    for (const [key, value] of Object.entries(node)) {
      if (["comments", "leadingComments", "trailingComments", "innerComments", "loc", "extra", "tokens"].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  };
  visit(ast.program);
  return violations;
}

test("app, public site, and desktop UI never render sparkle glyphs or import sparkle icons", () => {
  const files = SOURCE_ROOTS.flatMap((root) => sourceFiles(path.join(process.cwd(), root)));
  expect(files.length).toBeGreaterThan(100);
  const violations = files.flatMap((file) => violationsInSource(fs.readFileSync(file, "utf8"), path.relative(process.cwd(), file).replace(/\\/g, "/")));
  expect(violations).toEqual([]);
});

test("the contract detects aliases, JSX icons, Unicode escapes and CSS-generated symbols", () => {
  const examples = [
    ['import { Sparkles as Decoration } from "lucide-react";', "src/Example.jsx"],
    ['const Row = () => <SparkleIcon />;', "src/Example.jsx"],
    ['const Row = () => <span>{"\\u2728"}</span>;', "src/Example.jsx"],
    ['const badge = `NEW \u2728`;', "src/Example.jsx"],
    ['.badge::before { content: "\\2728"; }', "src/Example.css"],
    ['<p>NEW &#10024;</p>', "public-frontend/example.html"],
  ];
  examples.forEach(([source, file]) => expect(violationsInSource(source, file).length).toBeGreaterThan(0));
});

test("only tooling-backed compatibility exports and semantic alias mappings are permitted", () => {
  expect(violationsInSource('export const Sparkles = createIcon(TerminalIcon); // Never draw sparkle glyphs', "src/lib/icons.js")).toEqual([]);
  expect(violationsInSource('export const Sparkles = createIcon(StarIcon);', "src/lib/icons.js")).not.toEqual([]);
  expect(violationsInSource('const aliases = { sparkles: "ai", "wand-sparkles": "ai" };', "src/components/ui/nexusIconMap.js")).toEqual([]);
  expect(violationsInSource('export const Sparkles = createIcon(TerminalIcon);', "src/OtherIcons.js")).not.toEqual([]);
});
