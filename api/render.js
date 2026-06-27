const fs = require("fs");
const path = require("path");
const {
  normalizePathname,
  renderAppRoute,
} = require("../server/productionRouting");
const {
  evaluateIconIndexability,
  isDeletedOrRestricted,
} = require("../server/iconIndexability");

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app").replace(/\/+$/, "");
const ICON_CACHE_TTL_MS = 5 * 60 * 1000;
const iconCache = new Map();
let generatedIconIds = new Set();

try {
  const generatedIcons = require("../public-frontend/data/generated/qualified-icons.json");
  generatedIconIds = new Set(
    (Array.isArray(generatedIcons) ? generatedIcons : [])
      .map((icon) => String(icon?.id || "").trim())
      .filter(Boolean),
  );
} catch {
  generatedIconIds = new Set();
}

const SPA_SHELL_CANDIDATES = [
  path.join(process.cwd(), "build", "__spa-shell.html"),
  path.join(process.cwd(), "build", "index.html"),
  path.join(process.cwd(), "public", "index.html"),
];

function readSpaShell() {
  const filePath = SPA_SHELL_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!filePath) return null;
  return fs.readFileSync(filePath, "utf8");
}

function getRequestPath(req) {
  const requestedPath = Array.isArray(req.query?.path) ? req.query.path[0] : req.query?.path;
  if (requestedPath && requestedPath !== "/:path*") {
    return requestedPath.startsWith("/") ? requestedPath : `/${requestedPath}`;
  }

  const url = new URL(req.url || "/", "https://www.nexusrbx.com");
  return url.pathname;
}

async function iconExists(id) {
  const cached = iconCache.get(id);
  if (cached && Date.now() - cached.checkedAt < ICON_CACHE_TTL_MS) {
    return cached.exists;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`${BACKEND_URL}/api/icons/${encodeURIComponent(id)}`, {
      method: "GET",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    const exists = response.status === 200;
    iconCache.set(id, { exists, checkedAt: Date.now() });
    return exists;
  } catch {
    iconCache.set(id, { exists: false, checkedAt: Date.now() });
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchIcon(id) {
  const cached = iconCache.get(id);
  if (cached && cached.icon && Date.now() - cached.checkedAt < ICON_CACHE_TTL_MS) {
    return cached.icon;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`${BACKEND_URL}/api/icons/${encodeURIComponent(id)}`, {
      method: "GET",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (response.status === 404) return null;
    if (!response.ok) return undefined;
    const icon = await response.json();
    iconCache.set(id, { exists: true, icon, checkedAt: Date.now() });
    return icon;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

async function iconStatus(id) {
  if (generatedIconIds.has(id)) return "indexable";
  const icon = await fetchIcon(id);
  if (icon === null) return "missing";
  if (icon === undefined) return "missing";
  if (isDeletedOrRestricted(icon)) return "gone";
  const evaluation = evaluateIconIndexability(icon, [icon]);
  return evaluation.indexable ? "indexable" : "noindex";
}

module.exports = async function render(req, res) {
  const pathname = normalizePathname(getRequestPath(req));
  const html = readSpaShell();

  if (!html) {
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("NexusRBX production shell is unavailable.");
    return;
  }

  const rendered = await renderAppRoute({ html, pathname, iconExists, iconStatus });
  res.statusCode = rendered.status;
  Object.entries(rendered.headers).forEach(([key, value]) => res.setHeader(key, value));
  res.end(rendered.body);
};
