import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const reportOnly = process.argv.includes("--report-only");
const foundationPath = "src/design/nexus-foundation.css";
const foundation = fs.readFileSync(path.join(root, foundationPath), "utf8");

const expectedTokens = new Map([
  ["--nx-canvas", "#0a0a0a"],
  ["--nx-card", "#171717"],
  ["--nx-muted-surface", "#262626"],
  ["--nx-raised-surface", "#303030"],
  ["--nx-text", "#fafafa"],
  ["--nx-text-muted", "#a1a1a1"],
  ["--nx-purple", "#b45cff"],
  ["--nx-purple-strong", "#c77dff"],
  ["--nx-purple-muted", "#9333ea"],
  ["--nx-focus", "rgb(180 92 255 / 45%)"],
  ["--nx-space-1", "4px"],
  ["--nx-space-2", "8px"],
  ["--nx-space-3", "12px"],
  ["--nx-space-4", "16px"],
  ["--nx-radius-control", "10px"],
  ["--nx-radius-field", "10px"],
  ["--nx-radius-panel", "14px"],
  ["--nx-radius-card", "18px"],
  ["--nx-radius-overlay", "20px"],
  ["--nx-radius-feature", "24px"],
  ["--nx-radius-pill", "999px"],
  ["--nx-header-height", "48px"],
  ["--nx-header-height-touch", "52px"],
  ["--nx-control-height", "36px"],
  ["--nx-touch-target", "44px"],
  ["--nx-content-compact", "1160px"],
  ["--nx-type-interface", "0.9375rem"],
  ["--nx-motion-color", "150ms"],
  ["--nx-motion-elevation", "200ms"],
  ["--nx-motion-spatial", "280ms"],
]);

const violations = [];
const record = (file, line, rule, source) => violations.push({ file, line, rule, source: source.trim() });

for (const [token, expected] of expectedTokens) {
  const match = foundation.match(new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;]+);`, "i"));
  const actual = match?.[1]?.trim().toLowerCase();
  if (actual !== expected) record(foundationPath, 1, "token-contract", `${token}: ${actual || "missing"}; expected ${expected}`);
}

for (const required of ["--nx-shadow-control", "--nx-shadow-card", "--nx-shadow-floating", "prefers-reduced-motion", "prefers-contrast"]) {
  if (!foundation.includes(required) && !fs.readFileSync(path.join(root, "src/design/nexus-motion.css"), "utf8").includes(required)) {
    record(foundationPath, 1, "missing-foundation-contract", required);
  }
}

const contractTargets = [
  "src/design",
  "src/components/universal",
  "src/pages/ai/WorkspaceRibbon.css",
  "src/pages/ai/AgentWorkspaceLayout.css",
  "public-frontend/components/PricingLedger.module.css",
];
const extensions = new Set([".css", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);

function collect(target) {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return extensions.has(path.extname(absolute)) ? [absolute] : [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => collect(path.relative(root, path.join(absolute, entry.name))));
}

const approvedPaletteLiterals = ["#0a0a0a", "#171717", "#262626", "#303030", "#fafafa", "#a1a1a1", "#b45cff", "#c77dff", "#9333ea"];
const retiredLedgerLiterals = ["#1a1618", "#131012", "#211b1f", "#2c232a", "#d6b8d7", "#e0bfe0", "#b982b6"];

for (const absolute of [...new Set(contractTargets.flatMap(collect))]) {
  const relative = path.relative(root, absolute).replaceAll("\\", "/");
  const lines = fs.readFileSync(absolute, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (relative !== foundationPath && /--nx-[a-z0-9-]+\s*:/.test(line)) record(relative, index + 1, "duplicate-token", line);
    if (retiredLedgerLiterals.some((literal) => line.toLowerCase().includes(literal))) record(relative, index + 1, "retired-ledger-token", line);
    if (relative !== foundationPath && approvedPaletteLiterals.some((literal) => line.toLowerCase().includes(literal))) record(relative, index + 1, "raw-theme-literal", line);
    if (/Sofia Sans Condensed|Atkinson Hyperlegible Next/i.test(line)) record(relative, index + 1, "retired-font-role", line);
    if (relative.endsWith(".css")) {
      const radius = line.match(/border-radius\s*:\s*(\d+(?:\.\d+)?(?:px|rem))/i)?.[1]?.toLowerCase();
      const approved = new Set(["0px", "10px", "14px", "18px", "20px", "24px"]);
      if (radius && !approved.has(radius)) record(relative, index + 1, "unapproved-radius", line);
    }
  });
}

const primitiveCss = fs.readFileSync(path.join(root, "src/design/nexus-primitives.css"), "utf8");
if (!primitiveCss.includes("prefers-reduced-transparency")) record("src/design/nexus-primitives.css", 1, "missing-transparency-fallback", "prefers-reduced-transparency");
if (!primitiveCss.includes("forced-colors")) record("src/design/nexus-primitives.css", 1, "missing-forced-colors-fallback", "forced-colors");

if (!violations.length) {
  console.log(`Design guard passed (${expectedTokens.size} tokens, ${contractTargets.length} contract groups).`);
  process.exit(0);
}

console.error(`Design guard found ${violations.length} violation${violations.length === 1 ? "" : "s"}:`);
for (const violation of violations) console.error(`${violation.file}:${violation.line} [${violation.rule}] ${violation.source}`);
process.exit(reportOnly ? 0 : 1);
