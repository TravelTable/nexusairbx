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

const ROOT_DIR = path.join(__dirname, "..");
const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app").replace(/\/+$/, "");
const ICON_CACHE_TTL_MS = 5 * 60 * 1000;
const iconCache = new Map();
let generatedIconIds = null;

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

function loadGeneratedIconIds() {
  if (generatedIconIds) return generatedIconIds;
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
  return generatedIconIds;
}

function resolveProjectPath(...segments) {
  return path.join(ROOT_DIR, ...segments);
}

function firstExistingPath(candidates) {
  return candidates.find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  });
}

const SPA_SHELL_CANDIDATES = [
  resolveProjectPath("build", "__spa-shell.html"),
  resolveProjectPath("build", "index.html"),
  resolveProjectPath("public", "index.html"),
  path.join(process.cwd(), "build", "__spa-shell.html"),
  path.join(process.cwd(), "build", "index.html"),
];

function readSpaShell() {
  try {
    const filePath = firstExistingPath(SPA_SHELL_CANDIDATES);
    if (!filePath) return null;
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function getRequestPath(req) {
  try {
    const requestedPath = Array.isArray(req.query?.path) ? req.query.path[0] : req.query?.path;
    if (requestedPath && requestedPath !== "/:path*") {
      return requestedPath.startsWith("/") ? requestedPath : `/${requestedPath}`;
    }

    const url = new URL(req.url || "/", "https://www.nexusrbx.com");
    return url.pathname;
  } catch {
    return "/";
  }
}

function setStaticHeaders(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.setHeader("content-type", CONTENT_TYPES[ext] || "application/octet-stream");
  if (filePath.includes(`${path.sep}_next${path.sep}static${path.sep}`) || filePath.includes(`${path.sep}static${path.sep}`)) {
    res.setHeader("cache-control", "public, max-age=31536000, immutable");
  }
}

function serveStaticFile(res, candidates, statusCode = 200) {
  const filePath = firstExistingPath(candidates);
  if (!filePath) return false;

  try {
    res.statusCode = statusCode;
    setStaticHeaders(res, filePath);
    fs.createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

function serveBuildAsset(res, pathname) {
  if (!pathname || pathname === "/") return false;
  const relativePath = pathname.replace(/^\/+/, "");
  if (!relativePath || relativePath.includes("..")) return false;

  return serveStaticFile(res, [
    resolveProjectPath("build", relativePath),
    path.join(process.cwd(), "build", relativePath),
    resolveProjectPath("public", relativePath),
  ]);
}

function isStaticAssetPath(pathname) {
  return /^\/(static|_next|assets)\//.test(pathname)
    || /\.(js|css|map|png|jpe?g|gif|webp|svg|ico|woff2?|txt|xml|json)$/i.test(pathname);
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
  if (loadGeneratedIconIds().has(id)) return "indexable";
  const icon = await fetchIcon(id);
  if (icon === null) return "missing";
  if (icon === undefined) return "missing";
  if (isDeletedOrRestricted(icon)) return "gone";
  const evaluation = evaluateIconIndexability(icon, [icon]);
  return evaluation.indexable ? "indexable" : "noindex";
}

function sendUnavailableShell(res) {
  res.statusCode = 500;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.end("NexusRBX production shell is unavailable.");
}

module.exports = async function render(req, res) {
  try {
    const pathname = normalizePathname(getRequestPath(req));

    if (isStaticAssetPath(pathname) && serveBuildAsset(res, pathname)) {
      return;
    }

    if (pathname === "/sitemap.xml" || pathname === "/robots.txt" || (pathname.startsWith("/sitemaps/") && pathname.endsWith(".xml"))) {
      if (serveBuildAsset(res, pathname)) return;
    }

    const iconMatch = pathname.match(/^\/icons\/([^/]+)$/);
    if (iconMatch) {
      const id = decodeURIComponent(iconMatch[1]);
      if (loadGeneratedIconIds().has(id)) {
        const served = serveStaticFile(res, [
          resolveProjectPath("build", "icons", id, "index.html"),
          resolveProjectPath("build", `icons/${encodeURIComponent(id)}.html`),
          resolveProjectPath("public-frontend", "out", "icons", id, "index.html"),
          resolveProjectPath("public-frontend", "out", `icons/${encodeURIComponent(id)}.html`),
        ]);
        if (served) return;
      }
    }

    const html = readSpaShell();
    if (!html) {
      sendUnavailableShell(res);
      return;
    }

    const rendered = await renderAppRoute({ html, pathname, iconExists, iconStatus });
    res.statusCode = rendered.status;
    Object.entries(rendered.headers || {}).forEach(([key, value]) => {
      if (value != null) res.setHeader(key, value);
    });
    res.end(rendered.body);
  } catch (error) {
    console.error("api/render failed:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("NexusRBX render failed.");
    }
  }
};
