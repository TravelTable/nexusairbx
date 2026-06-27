const fs = require("fs");
const path = require("path");
const https = require("https");
const { buildSitemapDocuments, writeSitemapDocuments } = require("../server/sitemapBuilder");

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app").replace(/\/+$/, "");
const PAGE_LIMIT = Number(process.env.SITEMAP_ICON_PAGE_LIMIT || 500);
const MAX_PAGES = Number(process.env.SITEMAP_ICON_MAX_PAGES || 50);
const OUTPUT_DIR = path.join(__dirname, "..", "public");
const GENERATED_ICON_DATA = path.join(__dirname, "..", "public-frontend", "data", "generated", "qualified-icons.json");

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { accept: "application/json" } }, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`HTTP ${res.statusCode} from ${url}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error(`Invalid JSON from ${url}: ${err.message}`));
          }
        });
      })
      .on("error", reject)
      .setTimeout(15000, function onTimeout() {
        this.destroy(new Error(`Timed out fetching ${url}`));
      });
  });
}

async function collectPaginatedMarketplaceIcons(fetchPage, { pageLimit = PAGE_LIMIT, maxPages = MAX_PAGES } = {}) {
  const icons = [];
  const errors = [];
  let lastDocId = "";

  for (let page = 1; page <= maxPages; page += 1) {
    try {
      const json = await fetchPage({ page, pageLimit, lastDocId });
      const pageIcons = Array.isArray(json.icons) ? json.icons : [];
      icons.push(...pageIcons);
      console.log(`[sitemap] page ${page}: ${pageIcons.length} icons`);

      if (!json.hasMore || !json.lastDocId || pageIcons.length === 0) break;
      lastDocId = json.lastDocId;
    } catch (err) {
      const message = `[sitemap] icon page ${page} failed: ${err.message}`;
      console.error(message);
      errors.push(message);
      break;
    }
  }

  return { icons, errors };
}

async function fetchAllMarketplaceIcons() {
  return collectPaginatedMarketplaceIcons(async ({ page, pageLimit, lastDocId }) => {
    const params = new URLSearchParams({ limit: String(pageLimit) });
    if (lastDocId) params.set("lastDocId", lastDocId);
    const url = `${BACKEND_URL}/api/icons/market?${params.toString()}`;
    console.log(`[sitemap] fetching icon page ${page}: ${url}`);
    return fetchJson(url);
  });
}

function writeGeneratedIconData(qualifiedIcons) {
  fs.mkdirSync(path.dirname(GENERATED_ICON_DATA), { recursive: true });
  fs.writeFileSync(GENERATED_ICON_DATA, `${JSON.stringify(qualifiedIcons, null, 2)}\n`);
}

async function generate() {
  const { icons, errors } = await fetchAllMarketplaceIcons();
  const result = buildSitemapDocuments({ icons });

  writeSitemapDocuments({
    outputDir: OUTPUT_DIR,
    documents: result.documents,
  });
  writeGeneratedIconData(result.report.qualified);

  console.log("[sitemap] generated sitemap index and child sitemaps");
  console.log(`[sitemap] included core=${result.counts.core}, docs=${result.counts.docs}, examples=${result.counts.examples}, icons=${result.counts.icons}`);
  console.log(`[sitemap] excluded icons=${result.counts.excludedIcons}`);
  console.log(`[sitemap] exclusion reasons=${JSON.stringify(result.report.exclusionCounts)}`);
  console.log(`[sitemap] indexable categories=${result.counts.indexableCategories}, excluded categories=${result.counts.excludedCategories}`);
  if (result.report.excluded.length) {
    console.log(`[sitemap] exclusion samples=${JSON.stringify(result.report.excluded.slice(0, 20))}`);
  }
  if (errors.length) {
    console.error(`[sitemap] generation completed with recoverable errors=${JSON.stringify(errors)}`);
  }
}

if (require.main === module) {
  generate().catch((err) => {
    console.error("[sitemap] unexpected failure", err);
    const fallback = buildSitemapDocuments({ icons: [] });
    writeSitemapDocuments({ outputDir: OUTPUT_DIR, documents: fallback.documents });
    writeGeneratedIconData([]);
  });
}

module.exports = {
  collectPaginatedMarketplaceIcons,
  fetchAllMarketplaceIcons,
  generate,
  writeGeneratedIconData,
};
