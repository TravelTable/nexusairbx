import fs from "fs";
import path from "path";

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

test("keeps both public runtimes on the shared Dark Build Ledger header", () => {
  const appHeader = read("src/components/site/SiteHeader.jsx");
  const publicHeader = read("public-frontend/components/PublicHeader.jsx");
  const frame = read("src/components/universal/UniversalHeaderFrame.jsx");
  const siteIndex = read("src/components/universal/UniversalSiteIndex.jsx");
  const navigation = read("src/content/universalNavigation.js");
  const styles = read("src/components/universal/UniversalHeader.module.css");

  expect(appHeader).toContain('import UniversalHeaderFrame from "../universal/UniversalHeaderFrame"');
  expect(publicHeader).toContain('import UniversalHeaderFrame from "../../src/components/universal/UniversalHeaderFrame"');
  expect(appHeader).toContain("navigation={universalPrimaryNavigation}");
  expect(publicHeader).toContain("navigation={universalPrimaryNavigation}");
  expect(frame).toContain("data-universal-header");
  expect(frame).toContain('aria-label="Primary navigation"');
  expect(frame).toContain('aria-haspopup="dialog"');
  expect(frame).toContain("SITE INDEX");
  for (const label of ["BUILD", "TOOLS", "DOCS", "PRICING"]) {
    expect(navigation).toMatch(new RegExp(`label: ["']${label}["']`));
  }

  expect(siteIndex).toContain('role="dialog"');
  expect(siteIndex).toContain('aria-modal="true"');
  expect(siteIndex).toContain('event.key === "Escape"');
  expect(siteIndex).toContain('event.key !== "Tab"');
  expect(siteIndex).toContain("const opener = openerRef?.current");
  expect(siteIndex).toContain("opener?.focus()");
  expect(siteIndex).toContain('"aria-current": isCurrent(pathname, item.href) ? "page" : undefined');

  expect(styles).toMatch(/\.header\s*\{[\s\S]*?border-bottom:\s*1px solid var\(--nx-rule\);[\s\S]*?background:\s*var\(--nx-canvas\);/);
  expect(styles).toMatch(/\.navLink\s*\{[\s\S]*?min-height:\s*44px;/);
  expect(styles).toMatch(/\.indexButton\s*\{[\s\S]*?min-height:\s*44px;/);
  expect(styles).toMatch(/\.siteIndex\s*\{[\s\S]*?background:\s*var\(--nx-depth\);/);
  expect(styles).not.toMatch(/backdrop-(?:filter|blur)|(?:linear|radial|conic)-gradient|box-shadow\s*:/i);
});

test("keeps conversion controls flat, textual, and contrast-safe", () => {
  const prompt = read("src/components/homepage/HomepagePrompt.jsx");
  const account = read("public-frontend/components/PublicAccountState.jsx");
  const foundation = read("src/design/nexus-foundation.css");

  expect(prompt).toContain("rounded-none");
  expect(prompt).toContain("bg-transparent");
  expect(prompt).toContain("hover:text-[var(--nx-purple)]");
  expect(prompt).not.toContain("bg-[var(--nx-purple)]");

  const primaryClass = account.match(/const primaryClass = `([^`]+)`;/)?.[1] || "";
  expect(primaryClass).toContain("border-b");
  expect(primaryClass).toContain("bg-transparent");
  expect(primaryClass).toContain("text-[var(--nx-text)]");
  expect(primaryClass).toMatch(/^\$\{focusClass\}/);
  expect(primaryClass).not.toContain("bg-[var(--nx-purple)]");

  expect(foundation).toMatch(/:where\(a, button, input, textarea, select, summary, \[tabindex\]\):focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--nx-focus\);/);
});

test("prevents iOS focus zoom for global Nexus form controls on mobile", () => {
  const css = read("src/index.css");

  expect(css).toMatch(
    /@media \(max-width: 767px\)\s*\{\s*\.nexus-input,\s*\.nexus-textarea\s*\{[\s\S]*?font-size:\s*1rem\s*!important;/,
  );
});
