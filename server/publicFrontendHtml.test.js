const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { buildSitemapDocuments } = require("./sitemapBuilder");
const { marketplaceFilterIndexability } = require("./iconIndexability");
const { collectPaginatedMarketplaceIcons } = require("../scripts/generate-sitemap");
const generatedIcons = require("../public-frontend/data/generated/qualified-icons.json");

const outDir = path.join(__dirname, "..", "public-frontend", "out");

function readHtml(route) {
  const slug = route.replace(/^\//, "");
  const candidates = route === "/"
    ? [path.join(outDir, "index.html")]
    : [path.join(outDir, slug, "index.html"), path.join(outDir, `${slug}.html`)];
  const filePath = candidates.find((candidate) => fs.existsSync(candidate));
  assert.ok(filePath, `Expected exported HTML for ${route}. Run npm run public:build first.`);
  return fs.readFileSync(filePath, "utf8");
}

function countCanonical(html) {
  return (html.match(/rel="canonical"/g) || []).length;
}

function matchContent(html, pattern, label) {
  assert.match(html, pattern, `Missing ${label}`);
}

function extractMetaContent(html, nameOrProperty) {
  const escaped = nameOrProperty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta (?:name|property)="${escaped}" content="([^"]+)"`);
  return html.match(pattern)?.[1] || "";
}

function extractTitle(html) {
  return html.match(/<title>(.*?)<\/title>/)?.[1] || "";
}

function extractH1(html) {
  return html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() || "";
}

function extractCanonical(html) {
  return html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] || "";
}

function extractJsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1].replace(/&quot;/g, '"')));
}

function fixtureIcon(overrides = {}) {
  const name = overrides.name || `Inventory ${overrides.id || "alpha0001"} Badge`;
  return {
    id: "alpha0001",
    name,
    description: `${name} for Roblox inventory and HUD interfaces with a clear visual purpose and reusable Studio guidance.`,
    category: "Inventory",
    style: "Flat",
    imageUrl: `https://cdn.nexusrbx.com/icons/${overrides.id || "alpha0001"}.png`,
    visibility: "public",
    isPublic: true,
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

const landingPages = [
  {
    route: "/roblox-script-generator",
    title: "Roblox Script Generator | Focused Luau Code with NexusRBX",
    h1: "Roblox script generator for focused Luau code.",
    description: "Generate focused Roblox Luau scripts with placement notes, setup steps, test guidance, warnings, and copy-ready output.",
    mode: "quick_script",
    required: [/Round Timer/, /ServerScriptService Script/, /Common mistakes/, /Safety and responsible use/],
  },
  {
    route: "/roblox-ai-scripter",
    title: "Roblox AI Scripter | Conversational Script Help",
    h1: "Roblox AI scripter for iterative building and debugging.",
    description: "Use NexusRBX as a Roblox AI scripter for iterative debugging, script edits, explanations, and multi-step Studio workflows.",
    mode: "agent",
    required: [/Debug After Respawn/, /conversational scripting/i, /Agent Build/, /Error explanation/],
  },
  {
    route: "/roblox-lua-script-generator",
    title: "Roblox Lua Script Generator | Luau Syntax and Studio Placement",
    h1: "Roblox Lua script generator that speaks Luau.",
    description: "Generate Roblox Luau scripts with syntax notes, Script vs LocalScript placement, setup guidance, and common Lua-to-Luau differences.",
    mode: "quick_script",
    required: [/Typed Module/, /Luau/, /CollectionService/, /ModuleScript/],
  },
  {
    route: "/roblox-studio-script-generator",
    title: "Roblox Studio Script Generator | Script Placement and Workflow",
    h1: "Roblox Studio script generator for correct placement and workflow.",
    description: "Plan Roblox Studio scripts with clear Script, LocalScript, and ModuleScript placement plus plugin-aware workflow guidance.",
    mode: "agent",
    required: [/Script placement maps/, /LocalScript/, /ModuleScript/, /Studio connection guide/],
  },
  {
    route: "/roblox-gui-maker",
    title: "Roblox GUI Maker | UI Behaviour and GUI Scripting",
    h1: "Roblox GUI maker for interactive UI behavior.",
    description: "Create Roblox GUI behavior scripts with responsive layout guidance, LocalScript placement, examples, and a path to Agent Build for larger interfaces.",
    mode: "quick_script",
    required: [/Shop GUI/, /responsive layout/i, /StarterGui LocalScript/, /Icon marketplace/],
  },
];

const docsRoutes = [
  "/docs",
  "/docs/getting-started",
  "/docs/studio-plugin",
  "/docs/script-generation",
  "/docs/ui-generation",
  "/docs/assets",
  "/docs/projects",
  "/docs/account",
  "/docs/api",
  "/docs/troubleshooting",
  "/docs/faq",
];

const legalRoutes = [
  "/legal",
  "/legal/terms",
  "/legal/privacy",
  "/legal/acceptable-use",
  "/legal/refunds",
  "/legal/cookies",
];

test("homepage raw HTML is meaningful before client JavaScript", () => {
  const html = readHtml("/");
  assert.match(html, /<title>NexusRBX: Intelligent Roblox Studio Code Agent<\/title>/);
  assert.match(html, /<meta name="description" content="Boost productivity, generate scripts, and debug faster with AI integrated directly into your Roblox Studio workflow\./);
  assert.match(html, /<h1[^>]*>NexusRBX: Your Intelligent Roblox Studio Code Agent<\/h1>/);
  assert.match(html, /href="\/ai"[^>]*>Get Started for Free/);
  assert.match(html, /href="#workflow"[^>]*>Watch Demo/);
  assert.match(html, /AI-Powered Code Generation/);
  assert.match(html, /Real-time Debugging &amp; Optimization/);
  assert.match(html, /Roblox API Integration/);
  assert.match(html, /Snippet Library &amp; Collaboration/);
  assert.match(html, /Install Plugin/);
  assert.match(html, /Describe Your Need/);
  assert.match(html, /Review &amp; Insert/);
  assert.match(html, /Trusted by Top Roblox Developers/);
  assert.match(html, /NexusRBX is a game-changer! It saves me hours of coding every day\./);
  assert.match(html, /src="\/logo\.png"/);
  assert.match(html, /src="\/imageeeeAI\.png"/);
  assert.match(html, /data-generation-intent-form="homepage"/);
  assert.match(html, /placeholder="Make a round timer script with intermission and victory rewards\.\.\."/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:card"/);
  assert.match(html, /application\/ld\+json/);
  assert.equal(countCanonical(html), 1);
  assert.match(html, /href="https:\/\/www\.nexusrbx\.com\/"/);
  assert.doesNotMatch(html, /\/ai-preview\.png/);
  assert.doesNotMatch(html, /Monaco|AgentWorkspaceLayout|CodeEditorTabs/);
});

test("docs raw HTML has route-specific metadata and content", () => {
  const html = readHtml("/docs");
  assert.match(html, /<title>NexusRBX Documentation \| Studio Bridge and AI Workspace<\/title>/);
  assert.match(html, /<h1[^>]*>NexusRBX documentation<\/h1>/);
  assert.match(html, /Quick Script/);
  assert.match(html, /Agent Build/);
  assert.match(html, /Studio bridge/);
  assert.match(html, /Open AI workspace/);
  assert.equal(countCanonical(html), 1);
  assert.match(html, /href="https:\/\/www\.nexusrbx\.com\/docs"/);
  assert.doesNotMatch(html, /Monaco|AgentWorkspaceLayout|CodeEditorTabs/);
});

test("legal raw HTML has route-specific metadata and content", () => {
  const html = readHtml("/legal/privacy");
  assert.match(html, /<title>NexusRBX Privacy Notice \| Privacy and Data Use<\/title>/);
  assert.match(html, /<h1[^>]*>Privacy notice<\/h1>/);
  assert.match(html, /without sending us your private prompt text/);
  assert.match(html, /Information we collect/);
  assert.equal(countCanonical(html), 1);
  assert.equal(extractCanonical(html), "https://www.nexusrbx.com/legal/privacy");
  assert.doesNotMatch(html, /Monaco|AgentWorkspaceLayout|CodeEditorTabs/);
});

test("search landing pages have unique raw metadata and meaningful server HTML", () => {
  const seenTitles = new Set();
  const seenH1s = new Set();
  const seenDescriptions = new Set();
  const seenCanonicals = new Set();

  for (const page of landingPages) {
    const html = readHtml(page.route);
    assert.equal(extractTitle(html), page.title);
    assert.equal(extractH1(html), page.h1);
    assert.equal(extractMetaContent(html, "description"), page.description);
    assert.equal(extractCanonical(html), `https://www.nexusrbx.com${page.route}`);
    assert.equal(countCanonical(html), 1);
    assert.match(html, new RegExp(`data-generation-intent-form="${page.route.slice(1)}"`));
    assert.match(html, new RegExp(`data-generation-mode="${page.mode}"`));
    assert.match(html, /Example prompts and outputs/);
    assert.match(html, /Supported request types/);
    assert.match(html, /Roblox Studio installation guidance/);
    assert.match(html, /Debugging guidance/);
    assert.match(html, /Limitations/);
    assert.match(html, /Safety and responsible use/);
    assert.match(html, /FAQs/);
    assert.match(html, /property="og:title"/);
    assert.match(html, /name="twitter:card"/);
    page.required.forEach((pattern) => matchContent(html, pattern, `${page.route} content ${pattern}`));
    assert.doesNotMatch(html, /Monaco|AgentWorkspaceLayout|CodeEditorTabs/);

    assert.equal(seenTitles.has(page.title), false, `${page.route} has duplicate title`);
    assert.equal(seenH1s.has(page.h1), false, `${page.route} has duplicate H1`);
    assert.equal(seenDescriptions.has(page.description), false, `${page.route} has duplicate description`);
    assert.equal(seenCanonicals.has(extractCanonical(html)), false, `${page.route} has duplicate canonical`);
    seenTitles.add(page.title);
    seenH1s.add(page.h1);
    seenDescriptions.add(page.description);
    seenCanonicals.add(extractCanonical(html));
  }
});

test("search landing pages include valid structured data", () => {
  for (const page of landingPages) {
    const jsonLd = extractJsonLd(readHtml(page.route));
    assert.ok(jsonLd.some((entry) => entry["@type"] === "SoftwareApplication"), `${page.route} missing SoftwareApplication JSON-LD`);
    assert.ok(jsonLd.some((entry) => entry["@type"] === "FAQPage"), `${page.route} missing FAQPage JSON-LD`);
    jsonLd.forEach((entry) => assert.equal(entry["@context"], "https://schema.org"));
  }
});

test("search landing page internal links resolve to known public or app routes", () => {
  const knownRoutes = new Set([
    "/",
    "/ai",
    "/contact",
    "/icons-market",
    "/legal/privacy",
    "/legal/terms",
    "/settings",
    "/signin",
    "/subscribe",
    "/tools/icon-generator",
    ...docsRoutes,
    ...legalRoutes,
    ...landingPages.map((page) => page.route),
  ]);

  for (const page of landingPages) {
    const html = readHtml(page.route);
    const hrefs = [...html.matchAll(/href="(\/[^"#?]*)(?:#[^"]*)?"/g)]
      .map((match) => match[1])
      .filter((href) => !href.startsWith("/_next/") && !/\.[a-z0-9]+$/i.test(href));
    hrefs.forEach((href) => {
      assert.ok(knownRoutes.has(href), `${page.route} links to unknown route ${href}`);
    });
  }
});

test("search landing pages are present in sitemap", () => {
  const sitemapIndex = fs.readFileSync(path.join(__dirname, "..", "public", "sitemap.xml"), "utf8");
  const sitemap = fs.readFileSync(path.join(__dirname, "..", "public", "sitemaps", "examples.xml"), "utf8");
  assert.match(sitemapIndex, /<loc>https:\/\/www\.nexusrbx\.com\/sitemaps\/examples\.xml<\/loc>/);
  for (const page of landingPages) {
    assert.match(sitemap, new RegExp(`<loc>https://www\\.nexusrbx\\.com${page.route}</loc>`));
  }
});

test("docs and legal pages are present in public sitemaps", () => {
  const sitemapIndex = fs.readFileSync(path.join(__dirname, "..", "public", "sitemap.xml"), "utf8");
  const docsSitemap = fs.readFileSync(path.join(__dirname, "..", "public", "sitemaps", "docs.xml"), "utf8");
  const legalSitemap = fs.readFileSync(path.join(__dirname, "..", "public", "sitemaps", "legal.xml"), "utf8");

  assert.match(sitemapIndex, /<loc>https:\/\/www\.nexusrbx\.com\/sitemaps\/docs\.xml<\/loc>/);
  assert.match(sitemapIndex, /<loc>https:\/\/www\.nexusrbx\.com\/sitemaps\/legal\.xml<\/loc>/);
  docsRoutes.forEach((route) => {
    assert.match(docsSitemap, new RegExp(`<loc>https://www\\.nexusrbx\\.com${route}</loc>`));
  });
  legalRoutes.forEach((route) => {
    assert.match(legalSitemap, new RegExp(`<loc>https://www\\.nexusrbx\\.com${route}</loc>`));
  });
});

test("public frontend CSS includes mobile landing layout rules", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "public-frontend", "app", "globals.css"), "utf8");
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /\.landing-grid,\s*\.example-grid,\s*\.faq-grid,\s*\.related-grid/);
  assert.match(css, /html \{[\s\S]*overflow-x: clip;/);
  assert.match(css, /body \{[\s\S]*overflow-x: clip;/);
  assert.match(css, /\.prompt-panel input \{[\s\S]*font-size: 16px;/);
  assert.match(css, /@media \(max-width: 420px\) \{[\s\S]*\.account-link \{[\s\S]*display: none;/);
});

test("exported public CSS includes Tailwind utilities used by the homepage", () => {
  const cssDir = path.join(outDir, "_next", "static", "chunks");
  const cssPath = fs.readdirSync(cssDir).find((file) => file.endsWith(".css"));
  assert.ok(cssPath, "Expected exported CSS chunk. Run npm run public:build first.");
  const css = fs.readFileSync(path.join(cssDir, cssPath), "utf8");
  assert.match(css, /box-sizing:border-box;border:0 solid #e5e7eb/);
  assert.match(css, /\.flex\{/);
  assert.match(css, /max-w-6xl/);
});

test("public header keeps Firebase auth in a small lazy client island", () => {
  const header = fs.readFileSync(path.join(__dirname, "..", "public-frontend", "components", "PublicHeader.jsx"), "utf8");
  const accountState = fs.readFileSync(path.join(__dirname, "..", "public-frontend", "components", "PublicAccountState.jsx"), "utf8");

  assert.doesNotMatch(header, /"use client"|src\/firebase|firebase\/auth/);
  assert.match(header, /<PublicAccountState \/>/);
  assert.match(accountState, /"use client"/);
  assert.match(accountState, /import\("\.\.\/\.\.\/src\/firebase"\)/);
  assert.match(accountState, /import\("firebase\/auth"\)/);
});

test("icon sitemap includes qualified icons and excludes thin private and deleted icons", () => {
  const qualifiedA = fixtureIcon({ id: "alpha0001", name: "Inventory Alpha Badge" });
  const qualifiedB = fixtureIcon({ id: "bravo0002", name: "Inventory Bravo Badge" });
  const qualifiedC = fixtureIcon({ id: "charlie003", name: "Inventory Charlie Badge" });
  const thin = fixtureIcon({ id: "thin00004", name: "Icon" });
  const privateIcon = fixtureIcon({ id: "private05", name: "Private Inventory Badge", isPublic: false });
  const deletedIcon = fixtureIcon({ id: "deleted06", name: "Deleted Inventory Badge", deletedAt: "2026-06-15T00:00:00.000Z" });

  const result = buildSitemapDocuments({ icons: [thin, privateIcon, deletedIcon, qualifiedC, qualifiedA, qualifiedB] });
  const iconsXml = result.documents["sitemaps/icons.xml"];

  assert.match(iconsXml, /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/);
  assert.match(iconsXml, /<loc>https:\/\/www\.nexusrbx\.com\/icons\/alpha0001<\/loc>/);
  assert.match(iconsXml, /<image:loc>https:\/\/cdn\.nexusrbx\.com\/icons\/alpha0001\.png<\/image:loc>/);
  assert.doesNotMatch(iconsXml, /thin00004|private05|deleted06/);
  assert.doesNotMatch(iconsXml, /<priority>/);
  assert.equal(result.counts.icons, 3);
  assert.equal(result.counts.excludedIcons, 3);
  assert.equal(result.report.exclusionCounts.thin_or_duplicate_name, 1);
  assert.equal(result.report.exclusionCounts.not_public, 1);
  assert.equal(result.report.exclusionCounts.deleted_or_restricted, 1);
});

test("sitemap output uses preferred host and does not generate filter crawl traps", () => {
  const icons = [
    fixtureIcon({ id: "alpha0001", name: "Inventory Alpha Badge" }),
    fixtureIcon({ id: "bravo0002", name: "Inventory Bravo Badge" }),
    fixtureIcon({ id: "charlie003", name: "Inventory Charlie Badge" }),
  ];
  const result = buildSitemapDocuments({ icons });
  const allXml = Object.values(result.documents).join("\n");
  const locs = [...allXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);

  assert.ok(locs.length > 0);
  locs.forEach((loc) => {
    assert.ok(loc.startsWith("https://www.nexusrbx.com") || loc.startsWith("https://cdn.nexusrbx.com"), loc);
    assert.equal(loc.includes("?"), false, loc);
  });
  assert.equal(marketplaceFilterIndexability({ category: "Inventory", style: "Flat" }, icons).indexable, false);
  assert.equal(marketplaceFilterIndexability({ search: "sword" }, icons).reason, "filter_permutation");
});

test("icon raw HTML contains server-rendered metadata structured data and visible fields", () => {
  assert.ok(generatedIcons.length > 0, "Expected generated qualified icon data. Run npm run sitemap first.");
  const icon = generatedIcons[0];
  const html = readHtml(`/icons/${icon.id}`);
  const jsonLd = extractJsonLd(html);

  assert.equal(countCanonical(html), 1);
  assert.equal(extractCanonical(html), `https://www.nexusrbx.com/icons/${icon.id}`);
  assert.match(extractTitle(html), new RegExp(icon.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(extractH1(html), new RegExp(icon.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(html, new RegExp(icon.category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(html, new RegExp(icon.style.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(html, /property="og:image"/);
  assert.ok(jsonLd.some((entry) => entry["@type"] === "BreadcrumbList"));
  assert.ok(jsonLd.some((entry) => entry["@type"] === "ImageObject"));
  assert.equal(jsonLd.some((entry) => entry["@type"] === "Product"), false);
});

test("icon pagination collector retrieves records beyond one thousand icons and keeps page errors recoverable", async () => {
  const pages = [
    { icons: Array.from({ length: 500 }, (_, index) => ({ id: `page1-${index}` })), hasMore: true, lastDocId: "cursor-1" },
    { icons: Array.from({ length: 500 }, (_, index) => ({ id: `page2-${index}` })), hasMore: true, lastDocId: "cursor-2" },
    { icons: Array.from({ length: 205 }, (_, index) => ({ id: `page3-${index}` })), hasMore: false, lastDocId: "" },
  ];
  const calls = [];
  const result = await collectPaginatedMarketplaceIcons(async (args) => {
    calls.push(args);
    return pages[args.page - 1];
  }, { pageLimit: 500, maxPages: 10 });

  assert.equal(result.icons.length, 1205);
  assert.deepEqual(calls.map((call) => call.lastDocId), ["", "cursor-1", "cursor-2"]);
  assert.deepEqual(result.errors, []);

  const failed = await collectPaginatedMarketplaceIcons(async ({ page }) => {
    if (page === 2) throw new Error("temporary API failure");
    return { icons: [{ id: "first-page" }], hasMore: true, lastDocId: "cursor" };
  }, { pageLimit: 500, maxPages: 10 });

  assert.deepEqual(failed.icons, [{ id: "first-page" }]);
  assert.equal(failed.errors.length, 1);
});
