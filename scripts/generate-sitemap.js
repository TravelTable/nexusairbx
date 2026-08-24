const fs = require("fs");
const path = require("path");
const https = require("https");
const { buildSitemapDocuments } = require("../server/sitemapBuilder");

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "https://api.nexusrbx.com").replace(/\/+$/, "");
const PAGE_LIMIT = Number(process.env.SITEMAP_ICON_PAGE_LIMIT || 500);
const MAX_PAGES = Number(process.env.SITEMAP_ICON_MAX_PAGES || 200);
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
      if (page === maxPages) {
        const message = `[sitemap] icon collection reached maxPages=${maxPages} while the API still reported more records`;
        console.error(message);
        errors.push(message);
        break;
      }
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

function writeGeneratedIconData(publishedIcons) {
  writeFilesAtomically([{
    target: GENERATED_ICON_DATA,
    contents: `${JSON.stringify(publishedIcons, null, 2)}\n`,
  }]);
}

function writeFilesAtomically(files) {
  const staged = [];
  try {
    files.forEach(({ target, contents }, index) => {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const temporary = `${target}.${process.pid}.${index}.tmp`;
      fs.writeFileSync(temporary, contents);
      staged.push({ target, temporary });
    });
    staged.forEach(({ target, temporary }) => fs.renameSync(temporary, target));
  } finally {
    staged.forEach(({ temporary }) => {
      if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
    });
  }
}

function assertCompleteIconCollection({ icons, errors }) {
  if (errors.length) {
    throw new Error(`Marketplace icon collection was incomplete: ${errors.join("; ")}`);
  }
  if (!icons.length) {
    throw new Error("Marketplace icon collection returned no records; retaining the last-known-good sitemap.");
  }
}

function writeGeneratedBundle(result, {
  outputDir = OUTPUT_DIR,
  generatedIconDataPath = GENERATED_ICON_DATA,
} = {}) {
  const files = Object.entries(result.documents).map(([relativePath, contents]) => ({
    target: path.join(outputDir, relativePath),
    contents,
  }));
  files.push({
    target: generatedIconDataPath,
    contents: `${JSON.stringify(result.report.published, null, 2)}\n`,
  });
  writeFilesAtomically(files);
}

async function generate({
  fetchIcons = fetchAllMarketplaceIcons,
  writeBundle = writeGeneratedBundle,
  outputDir = OUTPUT_DIR,
  generatedIconDataPath = GENERATED_ICON_DATA,
} = {}) {
  const collection = await fetchIcons();
  const icons = Array.isArray(collection?.icons) ? collection.icons : [];
  const errors = Array.isArray(collection?.errors) ? collection.errors : ["invalid collection response"];
  assertCompleteIconCollection({ icons, errors });
  const result = buildSitemapDocuments({ icons });
  if (!result.report.published.length) {
    throw new Error("No marketplace icons passed indexability checks; retaining the last-known-good sitemap.");
  }

  writeBundle(result, { outputDir, generatedIconDataPath });

  console.log("[sitemap] generated sitemap index and child sitemaps");
  console.log(`[sitemap] included core=${result.counts.core}, docs=${result.counts.docs}, examples=${result.counts.examples}, icons=${result.counts.publishedIcons}`);
  console.log(`[sitemap] qualified icons=${result.counts.qualifiedIcons}, published icons=${result.counts.publishedIcons}, unpublished qualified icons=${result.counts.unpublishedQualifiedIcons}`);
  console.log(`[sitemap] excluded icons=${result.counts.excludedIcons}`);
  console.log(`[sitemap] exclusion reasons=${JSON.stringify(result.report.exclusionCounts)}`);
  console.log(`[sitemap] indexable categories=${result.counts.indexableCategories}, excluded categories=${result.counts.excludedCategories}`);
  if (result.report.unpublishedQualified.length) {
    console.log(
      `[sitemap] unpublished qualified samples=${JSON.stringify(
        result.report.unpublishedQualified.slice(0, 20).map((icon) => icon.id),
      )}`,
    );
  }
  if (result.report.excluded.length) {
    console.log(`[sitemap] exclusion samples=${JSON.stringify(result.report.excluded.slice(0, 20))}`);
  }
  return result;
}

if (require.main === module) {
  const bestEffort = process.argv.includes("--best-effort");
  generate().catch((err) => {
    console.error(`[sitemap] refresh failed; retained last-known-good files: ${err.message}`);
    if (!bestEffort) process.exitCode = 1;
  });
}

module.exports = {
  assertCompleteIconCollection,
  collectPaginatedMarketplaceIcons,
  fetchAllMarketplaceIcons,
  generate,
  writeFilesAtomically,
  writeGeneratedBundle,
  writeGeneratedIconData,
};
