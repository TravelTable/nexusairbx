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

const NEXT_PUBLIC_ROUTES = new Map([
  ["/", ["public-frontend/out/index.html"]],
  ["/docs", ["public-frontend/out/docs/index.html", "public-frontend/out/docs.html"]],
  ["/roblox-ai-scripter", ["public-frontend/out/roblox-ai-scripter/index.html", "public-frontend/out/roblox-ai-scripter.html"]],
  ["/roblox-gui-maker", ["public-frontend/out/roblox-gui-maker/index.html", "public-frontend/out/roblox-gui-maker.html"]],
  ["/roblox-lua-script-generator", ["public-frontend/out/roblox-lua-script-generator/index.html", "public-frontend/out/roblox-lua-script-generator.html"]],
  ["/roblox-script-generator", ["public-frontend/out/roblox-script-generator/index.html", "public-frontend/out/roblox-script-generator.html"]],
  ["/roblox-studio-script-generator", ["public-frontend/out/roblox-studio-script-generator/index.html", "public-frontend/out/roblox-studio-script-generator.html"]],
]);

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

function firstExistingPath(candidates) {
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function readTextFile(candidates) {
  const filePath = firstExistingPath(candidates);
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

function serveStaticText(res, pathname) {
  const body = readTextFile([
    path.join(process.cwd(), "build", pathname.slice(1)),
    path.join(process.cwd(), "public", pathname.slice(1)),
  ]);
  if (body == null) return false;

  res.statusCode = 200;
  res.setHeader("content-type", pathname.endsWith(".xml") ? "application/xml; charset=utf-8" : "text/plain; charset=utf-8");
  res.end(body);
  return true;
}

function setStaticHeaders(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.setHeader("content-type", CONTENT_TYPES[ext] || "application/octet-stream");
  if (filePath.includes(`${path.sep}_next${path.sep}static${path.sep}`)) {
    res.setHeader("cache-control", "public, max-age=31536000, immutable");
  }
}

function serveStaticFile(res, candidates, statusCode = 200) {
  const filePath = firstExistingPath(candidates.map((candidate) => path.join(process.cwd(), candidate)));
  if (!filePath) return false;

  res.statusCode = statusCode;
  setStaticHeaders(res, filePath);
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function serveNextPublicRoute(res, pathname) {
  const candidates = NEXT_PUBLIC_ROUTES.get(pathname);
  if (!candidates) return false;
  return serveStaticFile(res, candidates, 200);
}

function serveGeneratedIconRoute(res, pathname) {
  const iconMatch = pathname.match(/^\/icons\/([^/]+)$/);
  if (!iconMatch) return false;

  const id = decodeURIComponent(iconMatch[1]);
  if (!generatedIconIds.has(id)) return false;

  return serveStaticFile(res, [
    `public-frontend/out/icons/${encodeURIComponent(id)}/index.html`,
    `public-frontend/out/icons/${encodeURIComponent(id)}.html`,
  ], 200);
}

function serveNextStaticAsset(res, pathname) {
  if (!pathname.startsWith("/_next/")) return false;
  return serveStaticFile(res, [`public-frontend/out${pathname}`], 200);
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
  if (serveNextStaticAsset(res, pathname)) return;
  if (serveGeneratedIconRoute(res, pathname)) return;
  if (serveNextPublicRoute(res, pathname)) return;

  if (pathname === "/sitemap.xml" || pathname === "/robots.txt") {
    if (serveStaticText(res, pathname)) return;
  }
  if (pathname.startsWith("/sitemaps/") && pathname.endsWith(".xml")) {
    if (serveStaticText(res, pathname)) return;
  }

  const html = readTextFile([
    path.join(process.cwd(), "build", "index.html"),
    path.join(process.cwd(), "public", "index.html"),
  ]);

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
