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

test("the public editorial layer inherits canonical tokens and avoids decorative effects", () => {
  assert.doesNotMatch(styles, /^\s*--ds-[\w-]+\s*:/m);
  assert.doesNotMatch(styles, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(styles, /(?:linear|radial|conic)-gradient\(/i);
  assert.doesNotMatch(styles, /text-shadow\s*:/i);
  assert.match(styles, /background:\s*var\(--ds-bg-canvas\)/);
  assert.match(styles, /border-radius:\s*14px/);
});

test("display serif remains limited to large public page headings", () => {
  assert.match(styles, /\.docsShell\s+:global\(\.docs-article-header h1\)[\s\S]*?font-family:\s*var\(--ds-font-display\)/);
  assert.match(styles, /\.searchPage\s+:global\(\.landing-hero h1\)[\s\S]*?font-family:\s*var\(--ds-font-display\)/);
  assert.doesNotMatch(styles, /h2[^{]*{[^}]*font-family:\s*var\(--ds-font-display\)/s);
});

test("the editorial layout keeps adaptive mobile gutters and single-column fallbacks", () => {
  assert.match(styles, /@media \(max-width: 820px\)/);
  assert.match(styles, /calc\(100% - 32px\)/);
  assert.match(styles, /@media \(max-width: 560px\)/);
  assert.match(styles, /calc\(100% - 24px\)/);
  assert.match(styles, /grid-template-columns:\s*1fr/);
});
