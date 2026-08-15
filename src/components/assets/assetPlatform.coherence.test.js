import fs from "fs";
import path from "path";

const css = fs.readFileSync(
  path.join(process.cwd(), "src/components/assets/assetPlatform.css"),
  "utf8",
);
const creatorStore = fs.readFileSync(
  path.join(process.cwd(), "src/pages/IconsMarketPage.jsx"),
  "utf8",
);

test("uses canonical product fonts and explicit asset readability floors", () => {
  expect(css).not.toContain("var(--font-ui");
  expect(css).not.toContain("var(--font-display");
  expect(css).toContain("font-family: var(--ds-font-sans");
  expect(css).toContain("font-family: var(--ds-font-display");
  expect(css).toMatch(/Persistent metadata[\s\S]*?font-size:\s*0\.75rem/);
  expect(css).toMatch(/Explanations, values, notices[\s\S]*?font-size:\s*0\.875rem/);
});

test("keeps asset actions touch-safe and preview treatments local", () => {
  expect(css).toMatch(/\.asset-platform-page \.asset-copy-button\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px/);
  const previewCss = css.slice(css.indexOf(".creator-store-preview {"));
  expect(previewCss).toContain(".creator-store-preview--transparent");
  expect(previewCss).toContain(".creator-store-preview--scene");
  expect(previewCss).not.toMatch(/url\(|#[0-9a-f]{3,8}/i);
});

test("uses the canonical Creator Store detail route instead of a duplicate detail modal", () => {
  expect(creatorStore).toContain("<IconMarketCard");
  expect(creatorStore).not.toMatch(/selectedIcon|handlePostToRoblox|handleGenerateVariation/);
});
