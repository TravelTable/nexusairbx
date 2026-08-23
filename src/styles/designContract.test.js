import fs from "fs";
import path from "path";

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
const foundation = read("src/design/nexus-foundation.css");
const primitives = read("src/design/nexus-primitives.css");
const motion = read("src/design/nexus-motion.css");
const header = read("src/components/universal/UniversalHeader.module.css");
const homepage = read("src/components/homepage/HomepageCinematic.module.css");
const workspace = read("src/components/ai/chat/ChatExperience.css");
const pricing = read("public-frontend/components/PricingLedger.module.css");

function token(name) {
  return foundation.match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;]+);`, "i"))?.[1]?.trim().toLowerCase();
}

test("keeps both runtimes on the exact purple soft-depth palette", () => {
  const contract = {
    "--nx-canvas": "#0a0a0a",
    "--nx-card": "#171717",
    "--nx-muted-surface": "#262626",
    "--nx-raised-surface": "#303030",
    "--nx-text": "#fafafa",
    "--nx-text-muted": "#a1a1a1",
    "--nx-purple": "#b45cff",
    "--nx-purple-strong": "#c77dff",
    "--nx-purple-muted": "#9333ea",
    "--nx-rule": "rgb(255 255 255 / 10%)",
    "--nx-focus": "rgb(180 92 255 / 45%)",
  };
  Object.entries(contract).forEach(([name, value]) => expect(token(name)).toBe(value));
  expect(foundation).not.toMatch(/#1a1618|#131012|#211b1f|#2c232a|#d6b8d7/i);
});

test("uses the 4px spacing rhythm and approved radius scale", () => {
  expect(token("--nx-space-1")).toBe("4px");
  expect(token("--nx-space-2")).toBe("8px");
  expect(token("--nx-space-3")).toBe("12px");
  expect(token("--nx-space-4")).toBe("16px");
  expect(token("--nx-space-6")).toBe("24px");
  expect(token("--nx-space-8")).toBe("32px");
  expect(token("--nx-radius-control")).toBe("10px");
  expect(token("--nx-radius-field")).toBe("10px");
  expect(token("--nx-radius-panel")).toBe("14px");
  expect(token("--nx-radius-card")).toBe("18px");
  expect(token("--nx-radius-overlay")).toBe("20px");
  expect(token("--nx-radius-feature")).toBe("24px");
  expect(token("--nx-radius-pill")).toBe("999px");
});

test("defines the compact semantic size and typography contract", () => {
  expect(token("--nx-header-height")).toBe("48px");
  expect(token("--nx-header-height-touch")).toBe("52px");
  expect(token("--nx-control-height")).toBe("36px");
  expect(token("--nx-touch-target")).toBe("44px");
  expect(token("--nx-content-compact")).toBe("1160px");
  expect(token("--nx-type-interface")).toBe("0.9375rem");
  expect(token("--nx-type-body")).toBe("1rem");
  expect(token("--nx-type-label")).toBe("0.75rem");
});

test("defines font roles, elevation tiers, and standardized motion", () => {
  expect(token("--nx-font-display")).toBe('"dm sans variable", "dm sans", system-ui, sans-serif');
  expect(token("--nx-font-body")).toBe('system-ui, -apple-system, blinkmacsystemfont, "segoe ui", sans-serif');
  expect(token("--nx-font-code")).toBe('"atkinson hyperlegible mono variable", "sfmono-regular", consolas, monospace');
  expect(token("--nx-motion-color")).toBe("150ms");
  expect(token("--nx-motion-elevation")).toBe("200ms");
  expect(token("--nx-motion-spatial")).toBe("280ms");
  expect(token("--nx-shadow-control")).toContain("0 3px 9px");
  expect(token("--nx-shadow-card")).toContain("0 9px 26px");
  expect(token("--nx-shadow-floating")).toContain("0 18px 54px");
  expect(motion).toContain("nx-composer-shine");
  expect(motion).toContain("7s var(--nx-ease-spatial) infinite");
});

test("loads the canonical foundation after legacy entry styles in both runtimes", () => {
  const entries = [
    ["src/index.js", 'import "./index.css";', 'import "./design/nexus-foundation.css";'],
    ["public-frontend/app/layout.jsx", 'import "./globals.css";', 'import "../../src/design/nexus-foundation.css";'],
  ];
  entries.forEach(([file, legacy, canonical]) => {
    const source = read(file);
    expect(source).toContain(legacy);
    expect(source).toContain(canonical);
    expect(source.indexOf(canonical)).toBeGreaterThan(source.indexOf(legacy));
  });
});

test("provides focus, reduced-motion, reduced-transparency, contrast, and forced-color fallbacks", () => {
  expect(foundation).toMatch(/focus-visible[\s\S]*?outline:\s*2px solid var\(--nx-purple\)/);
  expect(foundation).toContain("prefers-contrast: more");
  expect(motion).toContain("prefers-reduced-motion: reduce");
  expect(primitives).toContain("prefers-reduced-transparency: reduce");
  expect(primitives).toContain("forced-colors: active");
});

test("applies the compact scale to the shared shell and major customer flows", () => {
  expect(header).toContain("height: var(--nx-header-height)");
  expect(header).toContain("height: var(--nx-header-height-touch)");
  expect(homepage).toMatch(/font-size:\s*clamp\(1\.75rem,\s*5vw,\s*5\.5rem\)/);
  expect(homepage).toContain("min-height: 440px");
  expect(homepage).toContain("min-height: 500px");
  expect(homepage).toContain("min-height: 480px");
  expect(homepage).toMatch(/padding:\s*72px max/);
  expect(homepage).toMatch(/padding:\s*52px 16px/);
  expect(workspace).toMatch(/font-size:\s*clamp\(2\.25rem,\s*5vw,\s*3\.25rem\)/);
  expect(workspace).toContain("min-height: 108px");
  expect(pricing).toContain("var(--nx-content-compact)");
  expect(pricing).toMatch(/grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/);
  expect(pricing).toContain("font-size: 1.75rem");
});
