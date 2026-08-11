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
  expect(themeCss).toContain("--ai-bg: var(--ds-bg-workspace)");
  expect(themeCss).toContain("--ai-surface: var(--ds-surface-1)");
  expect(themeCss).toContain("--ai-border: var(--ds-border-subtle)");
  expect(themeCss).toContain("--ai-accent: var(--ds-accent)");
  expect(themeCss).not.toMatch(/#00f5d4|#00bbf9|cyan-|teal-/i);
});

test("provides non-motion, opaque, and high-contrast fallbacks", () => {
  expect(themeCss).toContain("@media (prefers-reduced-motion: reduce)");
  expect(themeCss).toContain("@media (prefers-reduced-transparency: reduce)");
  expect(themeCss).toContain("@media (prefers-contrast: more)");
  expect(themeCss).toMatch(/prefers-reduced-transparency[\s\S]*?backdrop-filter:\s*none/);
});
