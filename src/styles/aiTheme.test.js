import fs from "fs";
import path from "path";

const themeCss = fs.readFileSync(path.join(process.cwd(), "src/styles/aiTheme.css"), "utf8");

test("keeps the AI workspace at normal scale", () => {
  expect(themeCss).toMatch(/\.ai-page\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;/);
  expect(themeCss).not.toMatch(/\bzoom\s*:/);
});

test("enforces the workspace typography floor", () => {
  [7, 8, 9, 10, 11].forEach((size) => {
    expect(themeCss).toContain(`[class~="text-[${size}px]"]`);
    expect(themeCss).toContain(`.ai-page [class~="text-[${size}px]"]`);
  });
  expect(themeCss).toMatch(/font-size:\s*0\.75rem/);
  expect(themeCss).not.toContain(":where(");

});

test("maps the dense AI workspace to canonical semantic tokens", () => {
  expect(themeCss).toContain("--ai-bg: var(--nx-depth)");
  expect(themeCss).toContain("--ai-surface: var(--nx-work)");
  expect(themeCss).toContain("--ai-border: var(--nx-rule-quiet)");
  expect(themeCss).toContain("--ai-accent: var(--nx-purple)");
  expect(themeCss).not.toMatch(/#00f5d4|#00bbf9|cyan-|teal-/i);
});

test("inherits the canonical product palette rather than forking design tokens", () => {
  expect(themeCss).not.toMatch(/^\s*--ds-[\w-]+\s*:/m);
  expect(themeCss).toContain("background-color: var(--nx-depth)");
  expect(themeCss).toContain("color: var(--nx-text)");
  expect(themeCss).toContain("--ai-accent: var(--nx-purple)");
});

test("keeps editorial type opt-in and scales workspace gutters", () => {
  expect(themeCss).toContain("--pc-font-display: var(--nx-font-display)");
  expect(themeCss).toMatch(/\.ai-page \.font-display\s*\{\s*font-family:\s*var\(--pc-font-ui\)/);
  expect(themeCss).toMatch(/\.ai-page \.pc-display-heading\s*\{\s*font-family:\s*var\(--pc-font-display\)/);
  expect(themeCss).toMatch(/@media \(min-width: 768px\)[\s\S]*?--pc-gutter:\s*24px/);
  expect(themeCss).toMatch(/@media \(min-width: 1200px\)[\s\S]*?--pc-gutter:\s*32px/);
});

test("flattens legacy workspace decoration without remapping status semantics", () => {
  expect(themeCss).toMatch(/\[class\*="bg-gradient-to-"\][\s\S]*?background-image:\s*none/);
  expect(themeCss).toMatch(/\[class~="shadow-2xl"\][\s\S]*?box-shadow:\s*none/);
  expect(themeCss).toMatch(/\[class\*="shadow-\[0_0"\][\s\S]*?box-shadow:\s*none/);
  expect(themeCss).toContain("--ai-info: var(--nx-info)");
  expect(themeCss).toContain("--ai-danger: var(--nx-danger)");
});

test("uses the compact ledger geometry without forcing every control", () => {
  expect(themeCss).toContain("--pc-radius-panel: var(--nx-radius-field)");
  expect(themeCss).toContain("--pc-radius-control: var(--nx-radius-field)");
  expect(themeCss).not.toMatch(/\.ai-page button:not\([\s\S]*?border-radius:\s*var\(--pc-radius-control\)/);
  expect(themeCss).not.toMatch(/\.ai-page textarea\s*\{[\s\S]*?border-radius:\s*var\(--pc-radius-panel\)/);
});

test("provides non-motion, opaque, and high-contrast fallbacks", () => {
  expect(themeCss).toContain("@media (prefers-reduced-motion: reduce)");
  expect(themeCss).toContain("@media (prefers-reduced-transparency: reduce)");
  expect(themeCss).toContain("@media (prefers-contrast: more)");
  expect(themeCss).toMatch(/prefers-reduced-transparency[\s\S]*?backdrop-filter:\s*none/);
});
