import fs from "fs";
import path from "path";

const projectRoot = process.cwd();
const sourceRoots = [
  "src",
  "public-frontend/app",
  "public-frontend/components",
  "public-frontend/data",
];
const standaloneSources = ["public/index.html"];
const sourceExtensions = new Set([".css", ".html", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);

// These files contain defaults/content for generated Roblox game output rather
// than NexusRBX browser chrome, so their palettes are intentionally independent.
const generatedOutputExclusions = new Set([
  "src/lib/gameProfile.js",
  "public-frontend/data/landingEvidence.js",
]);

const normalizePath = (filePath) => filePath.split(path.sep).join("/");

const isTestFixture = (relativePath) => (
  /(?:^|\/)__tests__(?:\/|$)/.test(relativePath)
  || /(?:^|\/)testMocks(?:\/|$)/.test(relativePath)
  || /\.(?:spec|test)\.[cm]?[jt]sx?$/.test(relativePath)
);

const collectSourceFiles = (relativeRoot) => {
  const absoluteRoot = path.join(projectRoot, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];

  return fs.readdirSync(absoluteRoot, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = normalizePath(path.join(relativeRoot, entry.name));
    if (entry.isDirectory()) {
      if ([".next", "generated", "node_modules", "out"].includes(entry.name)) return [];
      return collectSourceFiles(relativePath);
    }
    if (!sourceExtensions.has(path.extname(entry.name))) return [];
    if (isTestFixture(relativePath) || generatedOutputExclusions.has(relativePath)) return [];
    return [relativePath];
  });
};

const shippedBrowserSources = [
  ...sourceRoots.flatMap(collectSourceFiles),
  ...standaloneSources.filter((relativePath) => fs.existsSync(path.join(projectRoot, relativePath))),
].sort();

const parseHex = (literal) => {
  const hex = literal.slice(1);
  if (![3, 4, 6, 8].includes(hex.length)) return null;
  const expanded = hex.length <= 4
    ? hex.slice(0, 3).split("").map((character) => character + character).join("")
    : hex.slice(0, 6);
  return [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16));
};

const rgbToHsl = ([red, green, blue]) => {
  const channels = [red, green, blue].map((channel) => channel / 255);
  const max = Math.max(...channels);
  const min = Math.min(...channels);
  const delta = max - min;
  const lightness = (max + min) / 2;
  if (delta === 0) return { hue: 0, saturation: 0, lightness };

  const saturation = delta / (1 - Math.abs((2 * lightness) - 1));
  let hue;
  if (max === channels[0]) hue = ((channels[1] - channels[2]) / delta) % 6;
  else if (max === channels[1]) hue = ((channels[2] - channels[0]) / delta) + 2;
  else hue = ((channels[0] - channels[1]) / delta) + 4;
  hue = ((hue * 60) + 360) % 360;
  return { hue, saturation, lightness };
};

const classifyRetiredColor = (rgb) => {
  const { hue, saturation, lightness } = rgbToHsl(rgb);
  const chromaticEnough = saturation >= 0.25 && lightness >= 0.03 && lightness <= 0.97;
  if (chromaticEnough && hue >= 155 && hue <= 200) return "retired turquoise/cyan/teal literal";
  if (chromaticEnough && hue > 200 && hue < 250) return "retired blue literal; use a semantic information token";
  if (chromaticEnough && hue >= 250 && hue < 305) return "raw purple literal; use a semantic brand, accent, or plan token";
  if (chromaticEnough && hue >= 305 && hue <= 340) return "retired decorative pink literal";
  return null;
};

const allowedSemanticLiteral = (relativePath, line) => {
  if (/Color3\.fromRGB\s*\(/.test(line)) return true; // Shipped Roblox code example/output.
  if (
    relativePath === "src/lib/appearanceTheme.js"
    && /(?:DARK|LIGHT)_THEME_COLOR\s*=/.test(line)
  ) return true;
  if (
    relativePath === "public-frontend/app/layout.jsx"
    && /<meta\s+name=["']theme-color["']/.test(line)
  ) return true;
  if (
    relativePath === "public/index.html"
    && /(?:theme-color|setAttribute\(["']content["'])/.test(line)
  ) return true;
  const isLegacyThemeBridge = relativePath === "src/index.css"
    || relativePath === "public-frontend/app/globals.css";
  if (isLegacyThemeBridge && /--ds-[a-z0-9-]+\s*:/.test(line)) return true;
  if (
    relativePath === "src/design/nexus-foundation.css"
    && /--(?:nx|ds)-[a-z0-9-]+\s*:/.test(line)
  ) return true;

  // Monaco theme data cannot resolve CSS custom properties. Keep its two
  // adaptive palettes and the AI token bridge as explicit, audited owners.
  if (relativePath === "src/components/ai/workspace/CodeWorkspace.jsx") return true;
  if (
    relativePath === "src/components/ai/AiComponents.jsx"
    && /initialData\?\.color\s*\|\|\s*["']#7c3aed["']/i.test(line)
  ) return true; // Native color inputs require a concrete sRGB value.
  return relativePath === "src/styles/aiTheme.css" && /--ai-[a-z0-9-]+\s*:/.test(line);
};

const utilityPatterns = [
  {
    label: "retired cyan/teal utility",
    pattern: /\b(?:(?:[a-z-]+):)*(?:accent|bg|border|caret|decoration|divide|fill|from|outline|placeholder|ring|shadow|stroke|text|to|via)-(?:cyan|teal)-\d{2,3}(?:\/\d{1,3})?\b/gi,
  },
  {
    label: "retired blue utility; use the semantic accent or information token",
    pattern: /\b(?:(?:[a-z-]+):)*(?:accent|bg|border|caret|decoration|divide|fill|from|outline|placeholder|ring|shadow|stroke|text|to|via)-(?:blue|sky|indigo)-\d{2,3}(?:\/\d{1,3})?\b/gi,
  },
  {
    label: "retired decorative pink utility",
    pattern: /\b(?:(?:[a-z-]+):)*(?:accent|bg|border|caret|decoration|divide|fill|from|outline|placeholder|ring|shadow|stroke|text|to|via)-pink-\d{2,3}(?:\/\d{1,3})?\b/gi,
  },
  {
    label: "raw purple utility; use the semantic Plan/AI token",
    pattern: /\b(?:(?:[a-z-]+):)*(?:accent|bg|border|caret|decoration|divide|fill|from|outline|placeholder|ring|shadow|stroke|text|to|via)-(?:purple|violet)-\d{2,3}(?:\/\d{1,3})?\b/gi,
  },
  {
    label: "retired Nexus compatibility utility",
    pattern: /\b(?:(?:[a-z-]+):)*(?:bg|border|fill|from|outline|ring|shadow|stroke|text|to|via)-nexus-(?:cyan|pink)\b/gi,
  },
  {
    label: "retired named CSS color",
    pattern: /:\s*(?:cyan|pink|teal|turquoise)\b/gi,
  },
];

const findLineViolations = (relativePath, line, lineNumber) => {
  const violations = [];
  const record = (label, match, column) => {
    violations.push(`${relativePath}:${lineNumber}:${column + 1} ${label}: ${match}`);
  };

  utilityPatterns.forEach(({ label, pattern }) => {
    pattern.lastIndex = 0;
    for (const match of line.matchAll(pattern)) record(label, match[0], match.index);
  });

  if (allowedSemanticLiteral(relativePath, line)) return violations;

  const hexPattern = /#[0-9a-f]{3,8}\b/gi;
  for (const match of line.matchAll(hexPattern)) {
    const rgb = parseHex(match[0]);
    const label = rgb && classifyRetiredColor(rgb);
    if (label) record(label, match[0], match.index);
  }

  const rgbPattern = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,[^)]*)?\)/gi;
  for (const match of line.matchAll(rgbPattern)) {
    const rgb = match.slice(1, 4).map(Number);
    if (rgb.some((channel) => channel > 255)) continue;
    const label = classifyRetiredColor(rgb);
    if (label) record(label, match[0], match.index);
  }

  return violations;
};

const readThemeBlock = (css, selectorPattern) => {
  const match = css.match(new RegExp(`${selectorPattern}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, "i"));
  if (!match) throw new Error(`Missing theme block matching ${selectorPattern}`);
  return match[1];
};

const readToken = (block, token) => {
  const match = block.match(new RegExp(`(?:^|\\n)\\s*${token.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s*:\\s*([^;]+);`, "i"));
  return match?.[1].trim().toLowerCase();
};

const darkBuildLedgerContract = {
  "--nx-canvas": "#1a1618",
  "--nx-depth": "#131012",
  "--nx-work": "#211b1f",
  "--nx-field": "#2c232a",
  "--nx-text": "#e8ded4",
  "--nx-text-secondary": "#c2b4ae",
  "--nx-text-muted": "#958985",
  "--nx-purple": "#d6b8d7",
  "--nx-purple-strong": "#e0bfe0",
  "--nx-purple-muted": "#b982b6",
  "--nx-rule": "#52434d",
  "--nx-rule-quiet": "#3a3036",
  "--nx-info": "#94a9b0",
  "--nx-success": "#a4b487",
  "--nx-warning": "#d0a26d",
  "--nx-danger": "#d7837c",
  "--nx-focus": "#e0bfe0",
  "--nx-space-1": "5px",
  "--nx-space-2": "9px",
  "--nx-space-3": "15px",
  "--nx-space-4": "23px",
  "--nx-space-5": "37px",
  "--nx-space-6": "59px",
  "--nx-space-7": "95px",
  "--nx-radius-field": "3px",
  "--nx-radius-overlay": "5px",
};

test("keeps shipped browser UI on the Dark Build Ledger color contract", () => {
  const violations = shippedBrowserSources.flatMap((relativePath) => {
    const source = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
    return source.split(/\r?\n/).flatMap((line, index) => findLineViolations(relativePath, line, index + 1));
  });

  expect(violations).toEqual([]);

  const flatSurfaceContracts = {
    "src/components/Modal.jsx": ["backdrop-blur"],
    "src/components/shadcn/tooltip.jsx": ["backdrop-blur", "shadow-[var(--ds-shadow-overlay)]", "zoom-in", "zoom-out"],
    "src/pages/ScriptPage.jsx": ["backdrop-blur-md"],
  };
  Object.entries(flatSurfaceContracts).forEach(([relativePath, forbiddenTokens]) => {
    const source = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
    forbiddenTokens.forEach((token) => expect(source).not.toContain(token));
  });
  expect(fs.readFileSync(path.join(projectRoot, "src/components/Modal.jsx"), "utf8"))
    .toContain("nexus-page-card relative w-full shadow-none");
});

test("loads one canonical dark ledger foundation after both legacy entry stylesheets", () => {
  const relativePath = "src/design/nexus-foundation.css";
  const css = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  const foundationBlock = readThemeBlock(css, ':root,\\s*:root\\[data-theme="light"\\]');

  Object.entries(darkBuildLedgerContract).forEach(([token, expected]) => {
    expect({ file: relativePath, token, value: readToken(foundationBlock, token) })
      .toEqual({ file: relativePath, token, value: expected });
  });

  expect(readToken(foundationBlock, "--nx-font-display"))
    .toBe('"sofia sans condensed variable", "arial narrow", sans-serif');
  expect(readToken(foundationBlock, "--nx-font-body"))
    .toBe('"atkinson hyperlegible next variable", "segoe ui", sans-serif');
  expect(readToken(foundationBlock, "--nx-font-code"))
    .toBe('"atkinson hyperlegible mono variable", "sfmono-regular", consolas, monospace');
  expect(readToken(foundationBlock, "--ds-bg-canvas")).toBe("var(--nx-canvas)");
  expect(readToken(foundationBlock, "--ds-accent")).toBe("var(--nx-purple)");
  expect(readToken(foundationBlock, "--ds-font-sans")).toBe("var(--nx-font-body)");
  expect(css.match(/--nx-canvas\s*:/g)).toHaveLength(1);
  expect(css).toMatch(/^:root,\s*\n:root\[data-theme="light"\]\s*\{\s*\n\s*color-scheme:\s*dark;/);

  const browserEntries = [
    ["src/index.js", 'import "./index.css";', 'import "./design/nexus-foundation.css";'],
    ["public-frontend/app/layout.jsx", 'import "./globals.css";', 'import "../../src/design/nexus-foundation.css";'],
  ];
  browserEntries.forEach(([entryPath, legacyImport, foundationImport]) => {
    const entry = fs.readFileSync(path.join(projectRoot, entryPath), "utf8");
    expect(entry).toContain(legacyImport);
    expect(entry).toContain(foundationImport);
    expect(entry.indexOf(foundationImport)).toBeGreaterThan(entry.indexOf(legacyImport));
  });
});

test("does not import or restore decorative display families", () => {
  const violations = shippedBrowserSources.flatMap((relativePath) => {
    const source = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
    return source.split(/\r?\n/).flatMap((line, index) => (
      /\b(?:Bricolage Grotesque|Manrope|Sora)\b/i.test(line) ? [`${relativePath}:${index + 1} ${line.trim()}`] : []
    ));
  });
  expect(violations).toEqual([]);
});
