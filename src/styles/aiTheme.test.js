import fs from "fs";
import path from "path";

const themeCss = fs.readFileSync(path.join(process.cwd(), "src/styles/aiTheme.css"), "utf8");
const workspaceCss = fs.readFileSync(path.join(process.cwd(), "src/pages/ai/AgentWorkspaceLayout.css"), "utf8");

test("keeps the AI workspace at normal scale with a readable typography floor", () => {
  expect(themeCss).toMatch(/\.ai-page\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;/);
  expect(themeCss).not.toMatch(/\bzoom\s*:/);
  [7, 8, 9, 10, 11].forEach((size) => expect(themeCss).toContain(`[class~="text-[${size}px]"]`));
  expect(themeCss).toMatch(/font-size:\s*0\.75rem/);
});

test("maps the dense workspace to the shared soft-depth contract", () => {
  expect(themeCss).toContain("--ai-bg: var(--nx-depth)");
  expect(themeCss).toContain("--ai-surface: var(--nx-work)");
  expect(themeCss).toContain("--ai-accent: var(--nx-purple)");
  expect(themeCss).toContain("--pc-radius-panel: var(--nx-radius-panel)");
  expect(themeCss).toContain("--pc-radius-control: var(--nx-radius-control)");
  expect(themeCss).toContain("box-shadow: var(--nx-shadow-card)");
  expect(workspaceCss).toContain("border-radius: var(--nx-radius-panel)");
  expect(workspaceCss).toContain("box-shadow: var(--nx-shadow-card)");
});

test("keeps Monaco-adjacent dense controls tighter while allowing soft outer panels", () => {
  expect(workspaceCss).toMatch(/\.rounded-lg[\s\S]*?border-radius: var\(--nx-radius-control\)/);
  expect(workspaceCss).toMatch(/\.rounded-xl[\s\S]*?border-radius: var\(--nx-radius-panel\)/);
  expect(workspaceCss).toContain(".rounded-full");
  expect(workspaceCss).toContain("var(--nx-radius-pill)");
});

test("provides reduced motion, transparency, contrast, and forced-color fallbacks", () => {
  expect(themeCss).toContain("@media (prefers-reduced-motion: reduce)");
  expect(themeCss).toContain("@media (prefers-reduced-transparency: reduce)");
  expect(themeCss).toContain("@media (prefers-contrast: more)");
  expect(themeCss).toMatch(/prefers-reduced-transparency[\s\S]*?backdrop-filter:\s*none/);
  expect(workspaceCss).toContain("forced-colors: active");
});
