const fs = require("fs");
const path = require("path");

const css = fs.readFileSync(path.join(__dirname, "HomepageCinematic.module.css"), "utf8");

test("uses the shared near-black and electric purple product theme", () => {
  expect(css).toMatch(/background:\s*var\(--nx-canvas\)/);
  expect(css).toMatch(/color:\s*var\(--nx-purple-strong\)/);
  expect(css).toMatch(/font-family:\s*var\(--nx-font-body\)/);
  expect(css).toMatch(/border-radius:\s*var\(--nx-radius-panel\)/);
  expect(css).toMatch(/box-shadow:\s*var\(--nx-shadow-card\)/);
});

test("keeps the search-focused hero static, legible, and evidence-led", () => {
  expect(css).toMatch(/font-family:\s*var\(--nx-font-display\)/);
  expect(css).toMatch(/font-size:\s*clamp\(3rem,\s*5\.8vw,\s*5\.3rem\)/);
  expect(css).toMatch(/grid-template-columns:\s*minmax\(0,\s*0\.9fr\) minmax\(480px,\s*1\.1fr\)/);
  expect(css).toMatch(/\.heroMedia\s*\{[^}]*min-height:\s*440px/s);
  expect(css).not.toMatch(/hero-letter-(?:in|out)/);
  expect(css).not.toMatch(/nexus-pattern-drift/);
});

test("provides responsive section layouts and accessibility fallbacks", () => {
  expect(css).toMatch(/@media\s*\(max-width:\s*1020px\)/);
  expect(css).toMatch(/@media\s*\(max-width:\s*760px\)/);
  expect(css).toMatch(/@media\s*\(max-width:\s*480px\)/);
  expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  expect(css).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
  expect(css).toMatch(/@media\s*\(forced-colors:\s*active\)/);
});

test("uses semantic build-state colors and minimum touch targets", () => {
  expect(css).toMatch(/data-state="review"[^}]*border-top-color:\s*var\(--nx-warning\)/s);
  expect(css).toMatch(/data-state="verified"[^}]*border-top-color:\s*var\(--nx-success\)/s);
  expect(css).toMatch(/\.toolTabs button\s*\{[^}]*min-height:\s*44px/s);
  expect(css).toMatch(/\.heroLinks a\s*\{[^}]*min-height:\s*44px/s);
});

test("constrains intrinsic hero content to the mobile grid track", () => {
  expect(css).toMatch(/\.hero\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  expect(css).toMatch(/\.heroCopy\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0[^}]*max-width:\s*960px/s);
  expect(css).toMatch(/\.heroPrompt\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0[^}]*max-width:\s*620px/s);
  expect(css).toMatch(/\.heroMedia\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0[^}]*max-width:\s*800px/s);
});
