const fs = require("fs");
const path = require("path");
const {
  buildIconQualityReport,
  buildMarketplaceCategoryReport,
  PREFERRED_ORIGIN,
} = require("./iconIndexability");

const CORE_ROUTES = [
  { path: "/", lastmod: null },
  { path: "/contact", lastmod: null },
  { path: "/downloads", lastmod: null },
  { path: "/pricing", lastmod: null },
  { path: "/privacy", lastmod: null },
  { path: "/terms", lastmod: null },
  { path: "/tools/icon-generator", lastmod: null },
];

const DOC_ROUTES = [
  { path: "/docs", lastmod: null },
  { path: "/docs/installation", lastmod: null },
  { path: "/docs/getting-started", lastmod: null },
  { path: "/docs/studio-plugin", lastmod: null },
  { path: "/docs/basic-workflow", lastmod: null },
  { path: "/docs/reviewing-and-inserting-generated-code", lastmod: null },
  { path: "/docs/generating-your-first-script", lastmod: null },
  { path: "/docs/prompting-guide", lastmod: null },
  { path: "/docs/understanding-script-types", lastmod: null },
  { path: "/docs/common-use-cases", lastmod: null },
  { path: "/docs/debugging-guide", lastmod: null },
  { path: "/docs/troubleshooting", lastmod: null },
  { path: "/docs/safety-permissions-privacy", lastmod: null },
  { path: "/docs/faq", lastmod: null },
  { path: "/docs/changelog", lastmod: null },
  { path: "/docs/support-and-bug-reports", lastmod: null },
  { path: "/docs/account", lastmod: null },
  { path: "/docs/api", lastmod: null },
  { path: "/docs/assets", lastmod: null },
  { path: "/docs/projects", lastmod: null },
  { path: "/docs/script-generation", lastmod: null },
  { path: "/docs/ui-generation", lastmod: null },
];

const LEGAL_ROUTES = [
  { path: "/legal", lastmod: null },
  { path: "/legal/acceptable-use", lastmod: null },
  { path: "/legal/cookies", lastmod: null },
  { path: "/legal/privacy", lastmod: null },
  { path: "/legal/refunds", lastmod: null },
  { path: "/legal/terms", lastmod: null },
];

const EXAMPLE_ROUTES = [
  { path: "/roblox-script-generator", lastmod: null },
  { path: "/roblox-ai-scripter", lastmod: null },
  { path: "/roblox-lua-script-generator", lastmod: null },
  { path: "/roblox-studio-script-generator", lastmod: null },
  { path: "/roblox-gui-maker", lastmod: null },
];

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function absoluteUrl(routePath) {
  const normalized = routePath === "/" ? "/" : `/${String(routePath).replace(/^\/+/, "").replace(/\/+$/, "")}`;
  return normalized === "/" ? `${PREFERRED_ORIGIN}/` : `${PREFERRED_ORIGIN}${normalized}`;
}

function maxLastmod(routes = []) {
  const values = routes.map((route) => route.lastmod).filter(Boolean).sort();
  return values[values.length - 1] || null;
}

function sortRoutes(routes = []) {
  return [...routes].sort((a, b) => {
    const aPath = String(a.path || "");
    const bPath = String(b.path || "");
    return aPath.localeCompare(bPath) || String(a.image?.loc || "").localeCompare(String(b.image?.loc || ""));
  });
}

function dedupeRoutes(routes = []) {
  const seen = new Set();
  const deduped = [];
  for (const route of sortRoutes(routes)) {
    if (!route.path || route.path.includes("?")) continue;
    const loc = absoluteUrl(route.path);
    if (seen.has(loc)) continue;
    seen.add(loc);
    deduped.push(route);
  }
  return deduped;
}

function urlSet(routes = [], { image = false } = {}) {
  const imageNs = image ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : "";
  const normalizedRoutes = dedupeRoutes(routes);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${imageNs}>
${normalizedRoutes.map((route) => {
  const lastmod = route.lastmod ? `\n    <lastmod>${escapeXml(route.lastmod)}</lastmod>` : "";
  const imageEntry = route.image
    ? `
    <image:image>
      <image:loc>${escapeXml(route.image.loc)}</image:loc>
      <image:title>${escapeXml(route.image.title)}</image:title>
      <image:caption>${escapeXml(route.image.caption)}</image:caption>
    </image:image>`
    : "";
  return `  <url>
    <loc>${escapeXml(absoluteUrl(route.path))}</loc>${lastmod}${imageEntry}
  </url>`;
}).join("\n")}
</urlset>
`;
}

function sitemapIndex(entries = []) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((entry) => {
  const lastmod = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : "";
  return `  <sitemap>
    <loc>${escapeXml(absoluteUrl(entry.path))}</loc>${lastmod}
  </sitemap>`;
}).join("\n")}
</sitemapindex>
`;
}

function iconRoutesFromQualifiedIcons(icons = []) {
  return dedupeRoutes(icons.map((icon) => ({
    path: icon.path,
    lastmod: icon.lastmod,
    image: {
      loc: icon.imageUrl,
      title: icon.name,
      caption: icon.description,
    },
  })));
}

function buildSitemapDocuments({ icons = [] } = {}) {
  const report = buildIconQualityReport(icons);
  const iconRoutes = iconRoutesFromQualifiedIcons(report.qualified);
  const categoryReport = buildMarketplaceCategoryReport(report.qualified);
  const docs = {
    "sitemaps/core.xml": urlSet(sortRoutes(CORE_ROUTES)),
    "sitemaps/docs.xml": urlSet(sortRoutes(DOC_ROUTES)),
    "sitemaps/examples.xml": urlSet(sortRoutes(EXAMPLE_ROUTES)),
    "sitemaps/icons.xml": urlSet(iconRoutes, { image: true }),
    "sitemaps/legal.xml": urlSet(sortRoutes(LEGAL_ROUTES)),
  };

  docs["sitemap.xml"] = sitemapIndex([
    { path: "/sitemaps/core.xml", lastmod: maxLastmod(CORE_ROUTES) },
    { path: "/sitemaps/docs.xml", lastmod: maxLastmod(DOC_ROUTES) },
    { path: "/sitemaps/examples.xml", lastmod: maxLastmod(EXAMPLE_ROUTES) },
    { path: "/sitemaps/icons.xml", lastmod: maxLastmod(iconRoutes) },
    { path: "/sitemaps/legal.xml", lastmod: maxLastmod(LEGAL_ROUTES) },
  ]);

  return {
    documents: docs,
    report: {
      ...report,
      categoryReport,
    },
    counts: {
      core: CORE_ROUTES.length,
      docs: DOC_ROUTES.length,
      examples: EXAMPLE_ROUTES.length,
      icons: iconRoutes.length,
      legal: LEGAL_ROUTES.length,
      excludedIcons: report.excluded.length,
      indexableCategories: categoryReport.indexable.length,
      excludedCategories: categoryReport.excluded.length,
    },
  };
}

function writeSitemapDocuments({ outputDir, documents }) {
  for (const [relativePath, contents] of Object.entries(documents)) {
    const target = path.join(outputDir, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }
}

module.exports = {
  CORE_ROUTES,
  DOC_ROUTES,
  EXAMPLE_ROUTES,
  LEGAL_ROUTES,
  absoluteUrl,
  buildSitemapDocuments,
  dedupeRoutes,
  escapeXml,
  iconRoutesFromQualifiedIcons,
  sortRoutes,
  sitemapIndex,
  urlSet,
  writeSitemapDocuments,
};
