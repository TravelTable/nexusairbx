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
  const isCanonicalTheme = relativePath === "src/index.css"
    || relativePath === "public-frontend/app/globals.css";
  if (isCanonicalTheme && /--ds-[a-z0-9-]+\s*:/.test(line)) return true;

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

const darkThemeContract = {
  "--ds-bg-canvas": "#0b0b0c",
  "--ds-bg-workspace": "#0d0e10",
  "--ds-bg-sidebar": "#101113",
  "--ds-surface-1": "#111214",
  "--ds-text": "#f5f5f3",
  "--ds-text-subtle": "#878a91",
  "--ds-accent": "#a78bfa",
  "--ds-accent-hover": "#b8a4fc",
  "--ds-accent-pressed": "#8f72ea",
  "--ds-focus-ring": "#a78bfa",
  "--ds-info": "#91b7d1",
  "--ds-info-foreground": "#0b0b0c",
  "--ds-success": "#8bc59a",
  "--ds-success-foreground": "#0b0b0c",
  "--ds-warning": "#d8ad65",
  "--ds-warning-foreground": "#0b0b0c",
  "--ds-danger": "#ef8a84",
  "--ds-danger-foreground": "#0b0b0c",
  "--ds-plan": "var(--ds-accent)",
  "--ds-plan-foreground": "var(--ds-accent-foreground)",
};

const lightThemeContract = {
  "--ds-bg-canvas": "#f7f7f4",
  "--ds-bg-workspace": "#fbfbf8",
  "--ds-bg-sidebar": "#f0f0ec",
  "--ds-surface-1": "#fdfdfa",
  "--ds-text": "#171719",
  "--ds-text-subtle": "#64666d",
  "--ds-accent": "#6d28d9",
  "--ds-accent-hover": "#5b21b6",
  "--ds-accent-pressed": "#4c1d95",
  "--ds-focus-ring": "#6d28d9",
  "--ds-info": "#315f7e",
  "--ds-info-foreground": "#ffffff",
  "--ds-success": "#2f7045",
  "--ds-success-foreground": "#ffffff",
  "--ds-warning": "#80530f",
  "--ds-warning-foreground": "#ffffff",
  "--ds-danger": "#b8322b",
  "--ds-danger-foreground": "#ffffff",
  "--ds-plan": "var(--ds-accent)",
  "--ds-plan-foreground": "var(--ds-accent-foreground)",
};

test("keeps shipped browser UI on the monochrome conversational-studio design contract", () => {
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

test("keeps both browser entry points on the canonical dark and light tokens", () => {
  ["src/index.css", "public-frontend/app/globals.css"].forEach((relativePath) => {
    const css = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
    const darkBlock = readThemeBlock(css, ":root");
    const lightBlock = readThemeBlock(css, ':root\\[data-theme=["\\\']light["\\\']\\]');

    Object.entries(darkThemeContract).forEach(([token, expected]) => {
      expect({ file: relativePath, theme: "dark", token, value: readToken(darkBlock, token) })
        .toEqual({ file: relativePath, theme: "dark", token, value: expected });
    });
    Object.entries(lightThemeContract).forEach(([token, expected]) => {
      expect({ file: relativePath, theme: "light", token, value: readToken(lightBlock, token) })
        .toEqual({ file: relativePath, theme: "light", token, value: expected });
    });

    expect(readToken(darkBlock, "--ds-font-sans")).toBe('"instrument sans", -apple-system, blinkmacsystemfont, "segoe ui", system-ui, sans-serif');
    expect(readToken(darkBlock, "--ds-font-display")).toBe('"instrument sans", -apple-system, blinkmacsystemfont, "segoe ui", system-ui, sans-serif');
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
