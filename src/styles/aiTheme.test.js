import fs from "fs";
import path from "path";

const themeCss = fs.readFileSync(path.join(process.cwd(), "src/styles/aiTheme.css"), "utf8");
const indexCss = fs.readFileSync(path.join(process.cwd(), "src/index.css"), "utf8");

function readHexToken(source, token) {
  const match = source.match(new RegExp(`${token}:\\s*(#[0-9a-f]{6})`, "i"));
  if (!match) throw new Error(`Missing ${token}`);
  return match[1];
}

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((value) => parseInt(value, 16) / 255);
  const linear = channels.map((value) => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrastRatio(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

test("keeps the AI workspace at normal scale", () => {
  expect(themeCss).toMatch(/\.ai-page\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;/);
  expect(themeCss).not.toMatch(/\bzoom\s*:/);
});

test("enforces the workspace typography and muted-text contrast floors", () => {
  [7, 8, 9, 10, 11].forEach((size) => {
    expect(themeCss).toContain(`[class~="text-[${size}px]"]`);
    expect(themeCss).toContain(`.ai-page [class~="text-[${size}px]"]`);
  });
  expect(themeCss).toMatch(/font-size:\s*0\.75rem/);
  expect(themeCss).toContain('[class~="text-gray-500"]');
  expect(themeCss).toContain('[class~="text-gray-600"]');
  expect(themeCss).toMatch(/color:\s*var\(--ai-text-muted\)/);
  expect(themeCss).toContain('.ai-page [class~="text-gray-500"]');
  expect(themeCss).toContain('.ai-page [class~="text-gray-600"]');
  expect(themeCss).not.toContain(":where(");

  const muted = readHexToken(indexCss, "--ai-text-muted");
  const surface = readHexToken(indexCss, "--ai-surface");
  expect(contrastRatio(muted, surface)).toBeGreaterThanOrEqual(4.5);
});
