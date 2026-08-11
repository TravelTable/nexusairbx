import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const docsContentSource = readFileSync(new URL("./data/docsContent.js", import.meta.url), "utf8");
const docsExplorerSource = readFileSync(new URL("./components/DocsExplorer.jsx", import.meta.url), "utf8");
const docsIndexSource = readFileSync(new URL("./app/docs/page.jsx", import.meta.url), "utf8");
const docsSlugSource = readFileSync(new URL("./app/docs/[slug]/page.jsx", import.meta.url), "utf8");
const legalIndexSource = readFileSync(new URL("./app/legal/page.jsx", import.meta.url), "utf8");
const legalSlugSource = readFileSync(new URL("./app/legal/[slug]/page.jsx", import.meta.url), "utf8");

// docsContent.js is self-contained ESM, but the repository root is CommonJS.
// Loading it from a data URL lets this test inspect the exported data without
// depending on source formatting or adding a package-level module override.
const docsContentModule = await import(
  `data:text/javascript;base64,${Buffer.from(docsContentSource).toString("base64")}`
);

const { DOC_CATEGORIES, DOC_PAGES, LEGAL_PAGES } = docsContentModule;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("Docs navigation uses the canonical category structure", () => {
  assert.deepEqual(
    DOC_CATEGORIES.map((category) => category.title),
    [
      "Start with an Idea",
      "Plan, Apply & Test",
      "Systems, UI & Assets",
      "Troubleshooting",
      "Account & Safety",
      "Reference & Limits",
    ],
  );
});

test("the Docs overview follows the complete creator loop", () => {
  const overview = DOC_PAGES.find((page) => page.slug === "overview");
  const creatorLoop = overview?.sections.find((section) => section.id === "creator-loop");
  const steps = creatorLoop?.blocks.find((block) => block.type === "steps");

  assert.ok(overview);
  assert.deepEqual(
    steps?.items.map((item) => item.title),
    [
      "Describe the idea",
      "Approve a plan",
      "Build systems, UI, and assets",
      "Review and apply in Studio",
      "Verify in Play mode",
    ],
  );
  assert.match(overview.description, /idea.*plan.*systems, UI, and assets.*Studio.*Play mode/i);
});

test("FAQ and changelog content contain no provisional public placeholders", () => {
  const faq = DOC_PAGES.find((page) => page.slug === "faq");
  const changelog = DOC_PAGES.find((page) => page.slug === "changelog");
  const faqText = JSON.stringify(faq);
  const changelogText = JSON.stringify(changelog);

  assert.match(faqText, /Free plan/);
  assert.match(faqText, /full creation loop/i);
  assert.doesNotMatch(faqText, /if there is a free beta|when billing is available/i);
  assert.match(changelogText, /verified product changes/i);
  assert.doesNotMatch(
    changelogText,
    /\[(?:new feature|updated behavior|bug fix|known issue|feature name|workflow or UI area|bug description)/i,
  );
});

test("draft legal surfaces stay accessible but publish noindex metadata", () => {
  assert.deepEqual(
    LEGAL_PAGES.filter((page) => page.status === "Policy draft").map((page) => page.slug),
    ["acceptable-use", "refunds", "cookies"],
  );
  assert.match(legalIndexSource, /noindex:\s*true/);
  assert.match(legalSlugSource, /noindex:\s*page\.status\s*===\s*["']Policy draft["']/);
  assert.match(legalSlugSource, /generateStaticParams[\s\S]*LEGAL_PAGES/);
});

test("every Docs page appears in exactly one navigation category", () => {
  const pageSlugs = DOC_PAGES.map((page) => page.slug);
  const categorizedSlugs = DOC_CATEGORIES.flatMap((category) => category.pages);
  const counts = categorizedSlugs.reduce((result, slug) => {
    result.set(slug, (result.get(slug) || 0) + 1);
    return result;
  }, new Map());

  assert.equal(new Set(pageSlugs).size, pageSlugs.length, "DOC_PAGES contains a duplicate slug");
  for (const slug of pageSlugs) {
    assert.equal(counts.get(slug), 1, `${slug} must appear in exactly one Docs category`);
  }

  const unknownSlugs = categorizedSlugs.filter((slug) => !pageSlugs.includes(slug));
  assert.deepEqual(unknownSlugs, [], "DOC_CATEGORIES must not refer to unknown pages");
});

test("DocsExplorer uses the shared public header", () => {
  assert.match(
    docsExplorerSource,
    /import\s+PublicHeader\s+from\s+["']\.\/PublicHeader(?:\.jsx)?["']/,
  );
  assert.match(docsExplorerSource, /<PublicHeader(?:\s|\/>|>)/);
});

test("DocsExplorer exposes a collapsible, independently scrollable sidebar", () => {
  assert.match(docsExplorerSource, /docs-sidebar-collapsed/);
  assert.match(docsExplorerSource, /aria-label=\{isCollapsed \? ["']Expand navigation/);
  assert.match(docsExplorerSource, /aria-controls=["']docs-sidebar-navigation["']/);
  assert.match(docsExplorerSource, /id=["']docs-sidebar-navigation["']/);
  assert.match(docsExplorerSource, /docs-main-grid-sidebar-collapsed/);

  assert.match(
    readFileSync(new URL("./app/globals.css", import.meta.url), "utf8"),
    /\.docs-sidebar-panel\s*\{[^}]*height:\s*100%;[^}]*overflow-y:\s*auto/s,
  );
});

test("Docs search exposes an accessible combobox and curated common tasks", () => {
  assert.match(docsExplorerSource, /role\s*=\s*(?:["']combobox["']|\{\s*["']combobox["']\s*\})/);
  assert.match(docsExplorerSource, /role\s*=\s*(?:["']listbox["']|\{\s*["']listbox["']\s*\})/);
  assert.match(docsExplorerSource, /aria-controls\s*=/);
  assert.match(docsExplorerSource, /aria-activedescendant\s*=/);
  assert.match(docsExplorerSource, /common\s+tasks/i);
  assert.match(
    docsExplorerSource,
    /\b(?:CURATED_[A-Z_]*|COMMON_TASK[A-Z_]*)\s*=\s*\[/,
    "common tasks should come from an explicit curated list",
  );
});

test("Docs search restores focus after the dialog has unmounted", () => {
  assert.match(docsExplorerSource, /restoreSearchFocusRef\.current\s*=\s*true/);
  assert.match(
    docsExplorerSource,
    /useEffect\(\(\)\s*=>\s*\{[\s\S]*?if \(isSearchOpen \|\| !restoreSearchFocusRef\.current\)[\s\S]*?requestAnimationFrame\(\(\)\s*=>\s*\{[\s\S]*?trigger\?\.isConnected[\s\S]*?trigger\.focus\(\)[\s\S]*?cancelAnimationFrame\(frame\)/,
  );
});

test("installation docs link directly to the official Creator Store listing", () => {
  const installation = DOC_PAGES.find((page) => page.slug === "installation");
  assert.ok(installation);
  assert.match(
    JSON.stringify(installation),
    /https:\/\/create\.roblox\.com\/store\/asset\/83865885181263\/NexusRBX-Ai/,
  );
  assert.doesNotMatch(JSON.stringify(installation), /listing when available/i);
});

test("article feedback routes to support with article context", () => {
  assert.doesNotMatch(docsExplorerSource, /saved\s+for\s+this\s+session/i);
  assert.match(docsExplorerSource, /\/contact\?/);
  assert.match(docsExplorerSource, /(?:\?|&)source=docs/);
  assert.match(docsExplorerSource, /(?:\?|&)article=/);
});

test("support docs use a real product screenshot and the in-site support desk", () => {
  assert.match(docsExplorerSource, /case\s+["']image["']/);
  assert.match(docsContentSource, /\/docs\/support-request-form\.png/);
  assert.match(docsContentSource, /Request history and replies: \/support/);
  assert.doesNotMatch(docsContentSource, /support@nexusrbx\.com/i);
});

const orderedAdjacencyHelper = Object.entries(docsContentModule).find(
  ([name, value]) =>
    typeof value === "function" &&
    /order/i.test(name) &&
    /(?:categor|doc|page)/i.test(name),
);

test(
  "Docs routes use the category-ordered adjacency helper when one is exported",
  {
    skip: orderedAdjacencyHelper
      ? false
      : "docsContent does not expose a category-order helper",
  },
  () => {
    const [helperName] = orderedAdjacencyHelper;
    const helperCall = new RegExp(`\\b${escapeRegex(helperName)}\\s*\\(`);

    for (const [file, source] of [
      ["app/docs/page.jsx", docsIndexSource],
      ["app/docs/[slug]/page.jsx", docsSlugSource],
    ]) {
      assert.match(source, helperCall, `${file} must use ${helperName}`);
      assert.match(source, /getAdjacentPage\s*\(/, `${file} must calculate adjacent pages`);
    }
  },
);
