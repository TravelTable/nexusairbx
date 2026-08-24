const fs = require("fs");
const path = require("path");

const css = fs.readFileSync(path.join(__dirname, "HomepageCinematic.module.css"), "utf8");

test("uses the shared near-black and electric purple soft-depth theme", () => {
  expect(css).toMatch(/background:\s*var\(--nx-canvas\)/);
  expect(css).toMatch(/color:\s*var\(--nx-purple-strong\)/);
  expect(css).toMatch(/font-family:\s*var\(--nx-font-body\)/);
  expect(css).toMatch(/border-radius:\s*var\(--nx-radius-pill\)/);
  expect(css).toMatch(/box-shadow:\s*var\(--nx-shadow-card\)/);
});

test("keeps the exact animated hero typography", () => {
  expect(css).toMatch(/font-family:\s*[\r\n\s]*"Instrument Sans Variable"/);
  expect(css).toMatch(/font-size:\s*clamp\(1\.75rem,\s*5vw,\s*5\.5rem\)/);
  expect(css).toMatch(/letter-spacing:\s*-0?\.025em/);
  expect(css).toMatch(/line-height:\s*0?\.92/);
  expect(css).toMatch(/animation:\s*hero-letter-out/);
  expect(css).toMatch(/animation:\s*hero-letter-in/);
});

test("provides responsive section layouts and motion fallbacks", () => {
  expect(css).toMatch(/@media\s*\(max-width:\s*900px\)/);
  expect(css).toMatch(/@media\s*\(max-width:\s*640px\)/);
  expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  expect(css).toMatch(/animation:\s*none\s*!important/);
  expect(css).toMatch(/@media\s*\(forced-colors:\s*active\)/);
});

test("scopes the ambient dot pattern to the hero with accessibility fallbacks", () => {
  expect(css).toMatch(/\.hero::after/);
  expect(css).toMatch(/background-size:\s*8px\s+8px/);
  expect(css).toMatch(/animation:\s*nexus-pattern-drift\s+14s\s+linear\s+infinite/);
  expect(css).toMatch(/transform:\s*translate3d\(0,\s*-64px,\s*0\)/);
  expect(css).toMatch(/@media\s*\(prefers-reduced-transparency:\s*reduce\)/);
  expect(css).toMatch(/\.hero\s*>\s*\*/);
});

test("keeps hero controls above the lead image", () => {
  expect(css).toMatch(/\.heroCopy\s*\{[^}]*z-index:\s*3/s);
  expect(css).toMatch(/\.heroMedia\s*\{[^}]*z-index:\s*2/s);
});

test("constrains intrinsic hero content to the mobile grid track", () => {
  expect(css).toMatch(/\.hero\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  expect(css).toMatch(/\.heroCopy\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0[^}]*max-width:\s*960px/s);
  expect(css).toMatch(/\.heroPrompt\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0[^}]*max-width:\s*900px/s);
  expect(css).toMatch(/\.heroMedia\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0[^}]*max-width:\s*800px/s);
});
