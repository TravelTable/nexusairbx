import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const styles = read("./components/PublicEditorial.module.css");
const docs = read("./components/DocsExplorer.jsx");
const searchLanding = read("./components/SearchLandingPage.jsx");
const iconPage = read("./app/icons/[id]/page.jsx");
const notFoundPage = read("./app/not-found.jsx");
const downloadsPage = read("./app/downloads/page.jsx");
const globals = read("./app/globals.css");

test("active public knowledge surfaces opt into the scoped editorial module", () => {
  for (const source of [docs, searchLanding, iconPage, notFoundPage, downloadsPage]) {
    assert.match(source, /PublicEditorial\.module\.css/);
  }

  assert.match(docs, /styles\.docsShell/);
  assert.match(searchLanding, /styles\.searchPage/);
  assert.match(iconPage, /styles\.iconPage/);
  assert.match(notFoundPage, /styles\.notFoundPage/);
  assert.match(downloadsPage, /styles\.downloadPage/);
});

test("the public editorial layer inherits the ledger foundation and avoids decorative effects", () => {
  assert.doesNotMatch(styles, /^\s*--ds-[\w-]+\s*:/m);
  assert.doesNotMatch(styles, /^\s*--nx-[\w-]+\s*:/m);
  assert.doesNotMatch(styles, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(styles, /(?:linear|radial|conic)-gradient\(/i);
  assert.doesNotMatch(styles, /backdrop-filter\s*:/i);
  assert.doesNotMatch(styles, /text-shadow\s*:/i);
  assert.match(styles, /background:\s*var\(--nx-canvas\)/);
  assert.match(styles, /background:\s*var\(--nx-depth\)/);
  assert.match(styles, /border-radius:\s*var\(--nx-radius-field\)/);
  assert.doesNotMatch(styles, /border-radius:\s*(?:999px|[1-9]\d+px)/);
});

test("uses the ledger type roles for route headings, records, and code", () => {
  assert.match(styles, /font-family:\s*var\(--nx-font-body\)/);
  assert.match(styles, /\.docsShell\s+:global\(\.docs-article-header h1\)[\s\S]*?font-family:\s*var\(--nx-font-display\)/);
  assert.match(styles, /\.docsShell\s+:global\(\.docs-heading-row h2\)[\s\S]*?font-family:\s*var\(--nx-font-display\)/);
  assert.match(styles, /\.searchPage\s+:global\(\.landing-hero h1\)[\s\S]*?font-family:\s*var\(--nx-font-display\)/);
  assert.match(styles, /font-family:\s*var\(--nx-font-code\)/);
});

test("the editorial layout keeps adaptive mobile gutters and single-column fallbacks", () => {
  assert.match(styles, /@media \(max-width: 820px\)/);
  assert.match(styles, /min\(100% - 24px, var\(--nx-content-compact\)\)/);
  assert.match(styles, /@media \(max-width: 560px\)/);
  assert.match(styles, /grid-template-columns:\s*1fr/);
});

test("desktop documentation controls keep 44px interaction targets", () => {
  assert.match(
    globals,
    /\.docs-skip-link\s*\{[\s\S]*?min-height:\s*44px/,
  );
  assert.match(
    styles,
    /\.docsShell\s+:global\(\.docs-category-button\),[\s\S]*?min-height:\s*44px/,
  );
  assert.match(
    styles,
    /\.docsShell\s+:global\(\.docs-icon-button\)\s*\{[\s\S]*?min-height:\s*44px/,
  );
});
