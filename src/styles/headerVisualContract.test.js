import fs from "fs";
import path from "path";

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

test("keeps header conversion controls flat, monochrome, and contrast-safe", () => {
  const prompt = read("src/components/homepage/HomepagePrompt.jsx");
  const header = read("src/components/site/SiteHeader.jsx");
  const account = read("public-frontend/components/PublicAccountState.jsx");

  expect(prompt).not.toContain("hover:bg-white");
  expect(prompt).toContain("hover:bg-[var(--ds-text-secondary)]");

  expect(header).not.toMatch(/backdrop-blur|backdrop-filter/);
  expect(header).not.toContain("bg-[color-mix(in_srgb,var(--ds-surface-overlay)_94%,transparent)]");
  expect(header).toContain(
    'className="min-h-11 rounded-[8px] bg-[var(--ds-text)] text-[var(--ds-bg-canvas)] hover:bg-[var(--ds-text-secondary)] active:scale-[0.985]"',
  );
  expect(header).toMatch(
    /!homepage && <SheetClose asChild><Button asChild className="min-h-11 bg-\[var\(--ds-text\)\] text-\[var\(--ds-bg-canvas\)\] hover:bg-\[var\(--ds-text-secondary\)\]"/,
  );

  const primaryClass = account.match(/const primaryClass = `([^`]+)`;/)?.[1] || "";
  expect(primaryClass).toContain("bg-[var(--ds-text)]");
  expect(primaryClass).toContain("text-[var(--ds-bg-canvas)]");
  expect(primaryClass).toMatch(/^\$\{focusClass\}/);
  expect(account).toContain("focus-visible:ring-[var(--ds-focus-ring)]");
  expect(primaryClass).not.toContain("bg-[var(--ds-accent)]");
});

test("prevents iOS focus zoom for global Nexus form controls on mobile", () => {
  const css = read("src/index.css");

  expect(css).toMatch(
    /@media \(max-width: 767px\)\s*\{\s*\.nexus-input,\s*\.nexus-textarea\s*\{[\s\S]*?font-size:\s*1rem\s*!important;/,
  );
});
