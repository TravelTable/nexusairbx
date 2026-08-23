import fs from "fs";
import path from "path";

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

test("keeps both runtimes on the shared compact purple soft-depth header", () => {
  const appHeader = read("src/components/site/SiteHeader.jsx");
  const publicHeader = read("public-frontend/components/PublicHeader.jsx");
  const frame = read("src/components/universal/UniversalHeaderFrame.jsx");
  const navigation = read("src/content/universalNavigation.js");
  const styles = read("src/components/universal/UniversalHeader.module.css");

  expect(appHeader).toContain('import UniversalHeaderFrame from "../universal/UniversalHeaderFrame"');
  expect(publicHeader).toContain('import UniversalHeaderFrame from "../../src/components/universal/UniversalHeaderFrame"');
  for (const [label, href] of [["Build", "/ai"], ["Assets", "/assets"], ["Icons", "/icons-market"], ["Studio", "/downloads"], ["Docs", "/docs"], ["Pricing", "/pricing"]]) {
    expect(navigation).toContain(`{ href: "${href}", label: "${label}" }`);
  }
  expect(frame).toContain('aria-label="Primary navigation"');
  expect(frame).toContain("UniversalCommandMenu");
  expect(frame).toContain('event.key.toLowerCase() === "k"');
  expect(styles).toMatch(/\.header\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?height:\s*var\(--nx-header-height\);/);
  expect(styles).toMatch(/@media \(max-width: 720px\)[\s\S]*?height:\s*var\(--nx-header-height-touch\)/);
  expect(styles).toContain("backdrop-filter: blur(18px)");
  expect(styles).toContain("prefers-reduced-transparency: reduce");
});

test("keeps Tools and command search focus-trapped with Escape restoration", () => {
  for (const file of ["src/components/universal/UniversalSiteIndex.jsx", "src/components/universal/UniversalCommandMenu.jsx"]) {
    const source = read(file);
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain('event.key !== "Tab"');
    expect(source).toContain("opener?.focus()");
  }
});

test("keeps mobile and touch controls at least 44px", () => {
  const styles = read("src/components/universal/UniversalHeader.module.css");
  expect(styles).toMatch(/@media \(max-width: 720px\)[\s\S]*?min-height:\s*var\(--nx-touch-target\)/);
  expect(read("src/index.css")).toMatch(/@media \(max-width: 767px\)[\s\S]*?font-size:\s*1rem\s*!important/);
});
