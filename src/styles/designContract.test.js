import fs from "fs";
import path from "path";

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
const foundation = read("src/design/nexus-foundation.css");
const primitives = read("src/design/nexus-primitives.css");
const motion = read("src/design/nexus-motion.css");
const header = read("src/components/universal/UniversalHeader.module.css");
const homepage = read("src/components/homepage/HomepageCinematic.module.css");
const workspace = read("src/components/ai/chat/ChatExperience.css");
const pricing = read("src/components/billing/FinancialPlans.module.css");
const tokenSources = `${foundation}\n${motion}`;

function token(name) {
  return tokenSources.match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;]+);`, "i"))?.[1]?.trim().toLowerCase();
}

test("keeps both runtimes on the Linear graphite palette with restrained purple", () => {
  const contract = {
    "--nx-canvas": "#08090a",
    "--nx-card": "#101113",
    "--nx-muted-surface": "#141517",
    "--nx-raised-surface": "#191a1d",
    "--nx-text": "#f5f5f6",
    "--nx-text-muted": "#8b8d91",
    "--nx-purple": "#a855f7",
    "--nx-purple-strong": "#c084fc",
    "--nx-purple-muted": "#9333ea",
    "--nx-rule": "rgb(255 255 255 / 8%)",
    "--nx-focus": "rgb(168 85 247 / 35%)",
  };
  Object.entries(contract).forEach(([name, value]) => expect(token(name)).toBe(value));
  expect(foundation).not.toMatch(/#1a1618|#131012|#211b1f|#2c232a|#d6b8d7/i);
});

test("uses the 4px spacing rhythm and Linear radius scale", () => {
  expect(token("--nx-space-1")).toBe("4px");
  expect(token("--nx-space-2")).toBe("8px");
  expect(token("--nx-space-3")).toBe("12px");
  expect(token("--nx-space-4")).toBe("16px");
  expect(token("--nx-space-6")).toBe("24px");
  expect(token("--nx-space-8")).toBe("32px");
  expect(token("--nx-radius-control")).toBe("6px");
  expect(token("--nx-radius-field")).toBe("8px");
  expect(token("--nx-radius-panel")).toBe("10px");
  expect(token("--nx-radius-card")).toBe("10px");
  expect(token("--nx-radius-overlay")).toBe("12px");
  expect(token("--nx-radius-feature")).toBe("12px");
  expect(token("--nx-radius-pill")).toBe("999px");
});

test("defines the compact semantic size and typography contract", () => {
  expect(token("--nx-header-height")).toBe("48px");
  expect(token("--nx-header-height-touch")).toBe("52px");
  expect(token("--nx-control-height")).toBe("36px");
  expect(token("--nx-touch-target")).toBe("44px");
  expect(token("--nx-content-compact")).toBe("1080px");
  expect(token("--nx-type-interface")).toBe("0.9375rem");
  expect(token("--nx-type-body")).toBe("1rem");
  expect(token("--nx-type-label")).toBe("0.75rem");
});

test("defines font roles, elevation tiers, and standardized motion", () => {
  expect(foundation).toMatch(/--nx-font-sans:[\s\S]*Geist/);
  expect(token("--nx-font-display")).toBe("var(--nx-font-sans)");
  expect(token("--nx-font-body")).toBe("var(--nx-font-sans)");
  expect(foundation).toMatch(/--nx-font-code:[\s\S]*Geist Mono/);
  expect(token("--nx-motion-color")).toBe("140ms");
  expect(token("--nx-motion-elevation")).toBe("160ms");
  expect(token("--nx-motion-spatial")).toBe("240ms");
  expect(token("--nx-shadow-card")).toContain("0 8px 24px");
  expect(token("--nx-shadow-floating")).toContain("0 8px 28px");
  expect(motion).toContain("prefers-reduced-motion: reduce");
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
  expect(homepage).toMatch(/font-size:\s*clamp\(2\.15rem,\s*5vw,\s*5\.25rem\)/);
  expect(homepage).toContain("Protected homepage compatibility boundary");
  expect(workspace).toMatch(/font-size:\s*clamp\(2rem,\s*4vw,\s*2\.75rem\)/);
  expect(pricing).toContain("100dvh");
  expect(pricing).toContain("data-pricing-layout");
  expect(pricing).toContain('data-pricing-layout="compact"] .cards');
});

test("keeps public account, settings, and auth labels off 700–900 weights", () => {
  for (const file of [
    "src/pages/AccountLedger.css",
    "src/pages/SettingsLedger.css",
    "src/components/auth/AuthLedger.css",
    "src/pages/SubscribePage.module.css",
  ]) {
    expect(read(file)).not.toMatch(/font-weight:\s*(7\d{2}|8\d{2}|9\d{2})/);
  }
});

test("does not paint public docs or search headings purple", () => {
  const editorial = read("public-frontend/components/PublicEditorial.module.css");
  expect(editorial).not.toMatch(/docs-article-header h1\)[\s\S]{0,200}color:\s*var\(--nx-purple\)/);
  expect(editorial).not.toMatch(/docs-heading-row h2\)[\s\S]{0,120}color:\s*var\(--nx-purple\)/);
  expect(editorial).not.toMatch(/landing-hero h1\)[\s\S]{0,160}color:\s*var\(--nx-purple\)/);
});

test("settings selected rail is graphite fill, not a purple dashboard", () => {
  const settings = read("src/pages/SettingsLedger.css");
  const current = settings.match(/\.settings-tab-list button\[aria-current="page"\]\s*\{[\s\S]*?\}/)?.[0] || "";
  expect(current).toContain("var(--ds-fill-hover)");
  expect(current).not.toContain("var(--nx-purple-soft)");
  expect(settings).not.toMatch(/\.settings-overview-hero\s*\{[\s\S]*?--nx-purple-soft/);
});
