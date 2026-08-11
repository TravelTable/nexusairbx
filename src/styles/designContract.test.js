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
  "--ds-bg-canvas": "#160b24",
  "--ds-bg-workspace": "#12081f",
  "--ds-bg-sidebar": "#1c0f2b",
  "--ds-surface-1": "#241536",
  "--ds-text": "#fff8e7",
  "--ds-text-subtle": "#8f7e9d",
  "--ds-accent": "#a78bfa",
  "--ds-accent-hover": "#b9a4ff",
  "--ds-accent-pressed": "#9676f0",
  "--ds-focus-ring": "#d9ff57",
  "--ds-info": "#c4b5fd",
  "--ds-info-foreground": "#17121b",
  "--ds-success": "#d9ff57",
  "--ds-success-foreground": "#17121b",
  "--ds-warning": "#ffc857",
  "--ds-warning-foreground": "#17121b",
  "--ds-danger": "#ff7a70",
  "--ds-danger-foreground": "#17121b",
  "--ds-plan": "#ff8a7a",
  "--ds-plan-foreground": "#17121b",
};

const lightThemeContract = {
  "--ds-bg-canvas": "#fff8e7",
  "--ds-bg-workspace": "#fffcf5",
  "--ds-bg-sidebar": "#f5edff",
  "--ds-surface-1": "#fffcf5",
  "--ds-text": "#17121b",
  "--ds-text-subtle": "#786a7e",
  "--ds-accent": "#7c3aed",
  "--ds-accent-hover": "#6d28d9",
  "--ds-accent-pressed": "#5b21b6",
  "--ds-focus-ring": "#7c3aed",
  "--ds-info": "#6d28d9",
  "--ds-info-foreground": "#ffffff",
  "--ds-success": "#3f7f32",
  "--ds-success-foreground": "#ffffff",
  "--ds-warning": "#8a5700",
  "--ds-warning-foreground": "#ffffff",
  "--ds-danger": "#d92d20",
  "--ds-danger-foreground": "#ffffff",
  "--ds-plan": "#b43b4b",
  "--ds-plan-foreground": "#ffffff",
};

test("keeps shipped browser UI on the purple creator-workshop design contract", () => {
  const violations = shippedBrowserSources.flatMap((relativePath) => {
    const source = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
    return source.split(/\r?\n/).flatMap((line, index) => findLineViolations(relativePath, line, index + 1));
  });

  expect(violations).toEqual([]);
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
    expect(readToken(darkBlock, "--ds-font-display")).toBe('"bricolage grotesque", "instrument sans", system-ui, sans-serif');
  });
});

test("does not import or restore Manrope or Sora", () => {
  const violations = shippedBrowserSources.flatMap((relativePath) => {
    const source = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
    return source.split(/\r?\n/).flatMap((line, index) => (
      /\b(?:Manrope|Sora)\b/i.test(line) ? [`${relativePath}:${index + 1} ${line.trim()}`] : []
    ));
  });
  expect(violations).toEqual([]);
});
