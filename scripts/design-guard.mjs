import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const reportOnly = process.argv.includes("--report-only");

const migratedTargets = [
  "src/design",
  "src/components/universal",
  "src/components/homepage",
  "src/components/site/SiteHeader.jsx",
  "src/components/site/SiteHeaderLedger.module.css",
  "src/components/site/editorialUi.js",
  "src/pages/ai/WorkspaceRibbon.jsx",
  "src/pages/ai/WorkspaceRibbon.css",
  "src/pages/ai/AgentWorkspaceLayout.css",
  "src/styles/aiTheme.css",
  "src/components/ai/workspace/WorkspaceShell.jsx",
  "src/components/ai/workspace/WorkspaceShell.css",
  "src/components/ai/chat/ChatEmptyState.jsx",
  "src/components/ai/chat/ChatExperience.css",
  "src/components/sidebar/ProjectTreeSidebar.css",
  "src/pages/ai/QuickScriptWorkspace.jsx",
  "src/pages/ai/QuickScriptWorkspace.css",
  "src/components/auth/NexusAuthShell.jsx",
  "src/components/auth/AuthLedger.css",
  "src/components/downloads/DownloadsContent.jsx",
  "src/components/downloads/DownloadsLedger.module.css",
  "src/components/assets/assetLedgerOverrides.css",
  "src/components/assets/assetPlatform.css",
  "src/components/assets/CreatorStoreAssetDetails.jsx",
  "src/components/assets/CreatorStoreResultCard.jsx",
  "src/components/assets/CreatorStoreSearch.jsx",
  "src/pages/IconGeneratorPage.jsx",
  "src/pages/AssetLibraryPage.jsx",
  "src/pages/AssetDetailPage.jsx",
  "src/pages/IconsMarketPage.jsx",
  "src/pages/IconDetailPage.jsx",
  "src/pages/SettingsPage.jsx",
  "src/pages/SettingsLedger.css",
  "src/pages/ScriptPage.jsx",
  "src/pages/ScriptLedger.css",
  "src/pages/ContactPage.jsx",
  "src/pages/ContactLedger.css",
  "src/pages/NotFoundPage.jsx",
  "src/pages/AccountLedger.css",
  "src/pages/BillingPage.jsx",
  "src/pages/SubscribePage.jsx",
  "src/pages/SupportPage.jsx",
  "src/pages/SupportTicketPage.jsx",
  "src/pages/AdminSupportPage.jsx",
  "src/lib/appearanceTheme.js",
  "src/content/universalNavigation.js",
  "public/index.html",
  "public-frontend/app/layout.jsx",
  "public-frontend/app/pricing/page.jsx",
  "public-frontend/components/PublicHeader.jsx",
  "public-frontend/components/PublicAccountState.jsx",
  "public-frontend/components/PricingCatalog.jsx",
  "public-frontend/components/PricingLedger.module.css",
  "public-frontend/components/PublicEditorial.module.css",
  "public-frontend/components/SearchLandingPage.jsx",
  "public-frontend/components/DocsExplorer.jsx",
];

const sourceExtensions = new Set([".css", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const rules = [
  { id: "gradient", pattern: /(?:linear|radial|conic)-gradient\s*\(|\bbg-gradient\b|\bgradient-text\b/i },
  { id: "glass-or-blur", pattern: /backdrop-filter\s*:|filter\s*:\s*blur\s*\(/i },
  { id: "pill-radius", pattern: /\brounded-full\b|9999px/i },
  { id: "ambient-loop", pattern: /animation(?:-[a-z-]+)?\s*:[^;\n]*\binfinite\b|\banimate-pulse\b/i },
  { id: "prohibited-font", pattern: /Instrument Sans|JetBrains Mono|fonts\.googleapis\.com/i },
  { id: "legacy-accent", pattern: /#a78bfa|#b8a4fc|#8f72ea/i },
  { id: "generic-card-grid", pattern: /\b(?:feature|pricing|faq|asset)CardGrid\b/i },
];

function collectFiles(target) {
  const absolute = path.join(repositoryRoot, target);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return sourceExtensions.has(path.extname(absolute)) ? [absolute] : [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || entry.name === "node_modules") return [];
    return collectFiles(path.relative(repositoryRoot, path.join(absolute, entry.name)));
  });
}

const files = [...new Set(migratedTargets.flatMap(collectFiles))];
const violations = [];

for (const file of files) {
  const relative = path.relative(repositoryRoot, file).replaceAll("\\", "/");
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes("design-guard-allow")) return;
    for (const rule of rules) {
      if (rule.pattern.test(line)) {
        violations.push({ file: relative, line: index + 1, rule: rule.id, source: line.trim() });
      }
    }
    if (relative !== "src/design/nexus-foundation.css" && /--nx-[a-z0-9-]+\s*:/.test(line)) {
      violations.push({ file: relative, line: index + 1, rule: "duplicate-token", source: line.trim() });
    }
  });
}

if (!violations.length) {
  console.log(`Design guard passed (${files.length} migrated files).`);
  process.exit(0);
}

console.error(`Design guard found ${violations.length} prohibited pattern${violations.length === 1 ? "" : "s"}:`);
for (const violation of violations) {
  console.error(`${violation.file}:${violation.line} [${violation.rule}] ${violation.source}`);
}

if (reportOnly) {
  console.error("Report-only mode: violations did not fail the command.");
  process.exit(0);
}

process.exit(1);
