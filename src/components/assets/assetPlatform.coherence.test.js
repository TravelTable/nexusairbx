import fs from "fs";
import path from "path";

const css = fs.readFileSync(
  path.join(process.cwd(), "src/components/assets/assetPlatform.css"),
  "utf8",
);
const ledgerCss = fs.readFileSync(
  path.join(process.cwd(), "src/components/assets/assetLedgerOverrides.css"),
  "utf8",
);
const creatorStore = fs.readFileSync(
  path.join(process.cwd(), "src/pages/IconsMarketPage.jsx"),
  "utf8",
);
const creatorStoreCard = fs.readFileSync(
  path.join(process.cwd(), "src/components/icons/IconMarketCard.jsx"),
  "utf8",
);
const routeMatrix = fs.readFileSync(
  path.join(process.cwd(), "docs/design/revamp-route-matrix.md"),
  "utf8",
);

function ruleBody(source, selector) {
  const start = source.indexOf(`${selector} {`);
  if (start < 0) return "";
  const end = source.indexOf("}", start);
  return source.slice(start, end);
}

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

test("keeps Creator Store browse results as a rule-separated contact sheet", () => {
  const sheetRule = ruleBody(ledgerCss, ".creator-store-contact-sheet");
  const recordRule = ruleBody(ledgerCss, ".creator-store-record");
  const hoverRule = ruleBody(ledgerCss, ".creator-store-record:hover");

  expect(routeMatrix).toMatch(/`\/icons-market`, `\/icons-market\/:id`[\s\S]*Authored visual catalogue and licence record[\s\S]*No generic ecommerce tile grid/);
  expect(creatorStore).toContain('className="creator-store-contact-sheet"');
  expect(creatorStoreCard).toContain("data-contact-sheet-record");
  expect(creatorStoreCard).toContain("View licence record");
  expect(creatorStoreCard).not.toMatch(/hover:-translate|rounded-\[14px\]|motion\.article/);
  expect(sheetRule).toContain("display: grid");
  expect(sheetRule).toContain("border-top: 1px solid var(--nx-rule)");
  expect(recordRule).toContain("border-right: 1px solid var(--nx-rule)");
  expect(recordRule).toContain("border-bottom: 1px solid var(--nx-rule)");
  expect(recordRule).toContain("border-radius: 0");
  expect(recordRule).toContain("box-shadow: none");
  expect(hoverRule).toContain("transform: none");
  expect(hoverRule).not.toContain("translate");
  expect(hoverRule).not.toContain("var(--nx-shadow-card)");
});
