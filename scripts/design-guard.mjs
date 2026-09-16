import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const reportOnly = process.argv.includes("--report-only");
const foundationPath = "src/design/nexus-foundation.css";
const motionPath = "src/design/nexus-motion.css";
const foundation = fs.readFileSync(path.join(root, foundationPath), "utf8");
const motion = fs.readFileSync(path.join(root, motionPath), "utf8");
const tokenSources = `${foundation}\n${motion}`;

const expectedTokens = new Map([
  ["--nx-canvas", "#08090a"],
  ["--nx-depth", "#0a0a0b"],
  ["--nx-card", "#101113"],
  ["--nx-muted-surface", "#141517"],
  ["--nx-raised-surface", "#191a1d"],
  ["--nx-text", "#f5f5f6"],
  ["--nx-text-secondary", "#c4c5c7"],
  ["--nx-text-muted", "#8b8d91"],
  ["--nx-text-disabled", "#626469"],
  ["--nx-purple", "#a855f7"],
  ["--nx-purple-strong", "#c084fc"],
  ["--nx-purple-muted", "#9333ea"],
  ["--nx-focus", "rgb(168 85 247 / 35%)"],
  ["--nx-rule", "rgb(255 255 255 / 8%)"],
  ["--nx-rule-quiet", "rgb(255 255 255 / 5%)"],
  ["--nx-rule-strong", "rgb(255 255 255 / 13%)"],
  ["--nx-space-1", "4px"],
  ["--nx-space-2", "8px"],
  ["--nx-space-3", "12px"],
  ["--nx-space-4", "16px"],
  ["--nx-radius-control", "6px"],
  ["--nx-radius-field", "8px"],
  ["--nx-radius-panel", "10px"],
  ["--nx-radius-card", "10px"],
  ["--nx-radius-overlay", "12px"],
  ["--nx-radius-feature", "12px"],
  ["--nx-radius-pill", "999px"],
  ["--nx-header-height", "48px"],
  ["--nx-header-height-touch", "52px"],
  ["--nx-control-height", "36px"],
  ["--nx-touch-target", "44px"],
  ["--nx-content-compact", "1080px"],
  ["--nx-type-interface", "0.9375rem"],
  ["--nx-motion-color", "140ms"],
  ["--nx-motion-elevation", "160ms"],
  ["--nx-motion-spatial", "240ms"],
]);

const violations = [];
const record = (file, line, rule, source) => violations.push({ file, line, rule, source: source.trim() });

function tokenValue(name) {
  return tokenSources.match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;]+);`, "i"))?.[1]?.trim().toLowerCase();
}

for (const [token, expected] of expectedTokens) {
  const actual = tokenValue(token);
  if (actual !== expected) record(foundationPath, 1, "token-contract", `${token}: ${actual || "missing"}; expected ${expected}`);
}

for (const required of ["--nx-shadow-control", "--nx-shadow-card", "--nx-shadow-floating", "prefers-reduced-motion", "prefers-contrast"]) {
  if (!foundation.includes(required) && !motion.includes(required)) {
    record(foundationPath, 1, "missing-foundation-contract", required);
  }
}

const tokenOwnerFiles = new Set([foundationPath, motionPath]);
const contractTargets = [
  "src/design/nexus-foundation.css",
  "src/design/nexus-primitives.css",
  "src/design/nexus-motion.css",
  "src/components/universal",
  "src/components/billing/FinancialPlans.module.css",
];
const extensions = new Set([".css", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);

function collect(target) {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return extensions.has(path.extname(absolute)) ? [absolute] : [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => collect(path.relative(root, path.join(absolute, entry.name))));
}

const approvedPaletteLiterals = [
  "#08090a",
  "#0a0a0b",
  "#101113",
  "#141517",
  "#191a1d",
  "#f5f5f6",
  "#c4c5c7",
  "#8b8d91",
  "#626469",
  "#a855f7",
  "#c084fc",
  "#9333ea",
];
const retiredLedgerLiterals = ["#1a1618", "#131012", "#211b1f", "#2c232a", "#d6b8d7", "#e0bfe0", "#b982b6"];
const approvedRadii = new Set(["0px", "2px", "4px", "6px", "7px", "8px", "10px", "12px", "14px", "999px"]);

for (const absolute of [...new Set(contractTargets.flatMap(collect))]) {
  const relative = path.relative(root, absolute).replaceAll("\\", "/");
  const lines = fs.readFileSync(absolute, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (
      !tokenOwnerFiles.has(relative) &&
      /--nx-[a-z0-9-]+\s*:/.test(line) &&
      !/--nx-agent-/.test(line)
    ) {
      record(relative, index + 1, "duplicate-token", line);
    }
    if (retiredLedgerLiterals.some((literal) => line.toLowerCase().includes(literal))) {
      record(relative, index + 1, "retired-ledger-token", line);
    }
    if (
      !tokenOwnerFiles.has(relative) &&
      approvedPaletteLiterals.some((literal) => line.toLowerCase().includes(literal))
    ) {
      record(relative, index + 1, "raw-theme-literal", line);
    }
    if (/Sofia Sans Condensed|Atkinson Hyperlegible Next/i.test(line)) {
      record(relative, index + 1, "retired-font-role", line);
    }
    if (relative.endsWith(".css")) {
      const radius = line.match(/border-radius\s*:\s*(\d+(?:\.\d+)?(?:px|rem))/i)?.[1]?.toLowerCase();
      if (radius && radius.endsWith("rem")) {
        const px = Math.round(parseFloat(radius) * 16);
        if (!approvedRadii.has(`${px}px`)) record(relative, index + 1, "unapproved-radius", line);
      } else if (radius && !approvedRadii.has(radius)) {
        record(relative, index + 1, "unapproved-radius", line);
      }
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
