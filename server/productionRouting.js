const PREFERRED_HOST = "www.nexusrbx.com";
const PREFERRED_ORIGIN = `https://${PREFERRED_HOST}`;
const NON_WWW_PRODUCTION_HOST = "nexusrbx.com";

const PUBLIC_INDEXABLE_ROUTES = new Set([
  "/",
  "/docs",
  "/contact",
  "/privacy",
  "/subscribe",
  "/terms",
  "/tools/icon-generator",
  "/roblox-ai-scripter",
  "/roblox-gui-maker",
  "/roblox-lua-script-generator",
  "/roblox-script-generator",
  "/roblox-studio-script-generator",
]);

const VALID_NON_INDEXABLE_ROUTES = new Set([
  "/ai",
  "/billing",
  "/debug/entitlements",
  "/icons-market",
  "/settings",
  "/signin",
  "/signup",
]);

const VALID_NON_INDEXABLE_PREFIXES = [
  "/__/auth/",
  "/auth/",
];

function normalizeHost(host = "") {
  return String(host).toLowerCase().split(":")[0];
}

function shouldRedirectToPreferredHost(host) {
  return normalizeHost(host) === NON_WWW_PRODUCTION_HOST;
}

function buildPreferredHostLocation(rawUrl = "/", host = NON_WWW_PRODUCTION_HOST) {
  const url = new URL(rawUrl || "/", `https://${host || NON_WWW_PRODUCTION_HOST}`);
  return `${PREFERRED_ORIGIN}${url.pathname}${url.search}`;
}

function normalizePathname(rawPath = "/") {
  let pathname = rawPath;
  try {
    pathname = new URL(rawPath, PREFERRED_ORIGIN).pathname;
  } catch {
    pathname = String(rawPath || "/");
  }

  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  pathname = pathname.replace(/\/{2,}/g, "/");
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "");
  return pathname || "/";
}

function canonicalUrl(pathname) {
  const normalized = normalizePathname(pathname);
  return normalized === "/" ? `${PREFERRED_ORIGIN}/` : `${PREFERRED_ORIGIN}${normalized}`;
}

function isScriptRoute(pathname) {
  return /^\/script\/[^/]+$/.test(pathname);
}

function isValidNonIndexableRoute(pathname) {
  if (VALID_NON_INDEXABLE_ROUTES.has(pathname)) return true;
  if (isScriptRoute(pathname)) return true;
  return VALID_NON_INDEXABLE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function classifyRoute(pathname, { iconExists, iconStatus } = {}) {
  const normalized = normalizePathname(pathname);

  if (PUBLIC_INDEXABLE_ROUTES.has(normalized)) {
    return {
      status: 200,
      indexable: true,
      canonical: canonicalUrl(normalized),
      routeType: "public",
    };
  }

  const iconMatch = normalized.match(/^\/icons\/([^/]+)$/);
  if (iconMatch) {
    const id = decodeURIComponent(iconMatch[1]);
    if (typeof iconStatus === "function") {
      const status = await iconStatus(id);
      if (status === "indexable") {
        return {
          status: 200,
          indexable: true,
          canonical: canonicalUrl(`/icons/${encodeURIComponent(id)}`),
          routeType: "icon",
        };
      }
      if (status === "noindex") {
        return {
          status: 200,
          indexable: false,
          routeType: "thin-icon",
        };
      }
      if (status === "gone") {
        return {
          status: 410,
          indexable: false,
          routeType: "removed-icon",
        };
      }
      return {
        status: 404,
        indexable: false,
        routeType: "missing-icon",
      };
    }

    const exists = typeof iconExists === "function" ? await iconExists(id) : false;
    if (exists) {
      return {
        status: 200,
        indexable: true,
        canonical: canonicalUrl(`/icons/${encodeURIComponent(id)}`),
        routeType: "icon",
      };
    }

    return {
      status: 404,
      indexable: false,
      routeType: "missing-icon",
    };
  }

  if (isValidNonIndexableRoute(normalized)) {
    return {
      status: 200,
      indexable: false,
      routeType: "app",
    };
  }

  return {
    status: 404,
    indexable: false,
    routeType: "unknown",
  };
}

function stripManagedSeo(html) {
  return html
    .replace(/\s*<link\s+rel=["']canonical["'][^>]*data-nexusrbx-managed=["']true["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<meta\s+name=["']robots["'][^>]*data-nexusrbx-managed=["']true["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<meta\s+name=["']prerender-status-code["'][^>]*data-nexusrbx-managed=["']true["'][^>]*>\s*/gi, "\n");
}

function injectIntoHead(html, tags) {
  if (!tags) return html;
  const cleanHtml = stripManagedSeo(html);
  if (cleanHtml.includes("</head>")) {
    return cleanHtml.replace("</head>", `${tags}\n  </head>`);
  }
  return `${tags}\n${cleanHtml}`;
}

async function renderAppRoute({ html, pathname, iconExists, iconStatus }) {
  const route = await classifyRoute(pathname, { iconExists, iconStatus });
  const seoTags = route.indexable
    ? `    <link rel="canonical" href="${route.canonical}" data-nexusrbx-managed="true" />`
    : [
        '    <meta name="robots" content="noindex, nofollow" data-nexusrbx-managed="true" />',
        `    <meta name="prerender-status-code" content="${route.status}" data-nexusrbx-managed="true" />`,
      ].join("\n");

  return {
    ...route,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...(route.indexable ? {} : { "x-robots-tag": "noindex, nofollow" }),
    },
    body: injectIntoHead(html, seoTags),
  };
}

module.exports = {
  PREFERRED_HOST,
  PREFERRED_ORIGIN,
  PUBLIC_INDEXABLE_ROUTES,
  VALID_NON_INDEXABLE_ROUTES,
  buildPreferredHostLocation,
  canonicalUrl,
  classifyRoute,
  normalizePathname,
  renderAppRoute,
  shouldRedirectToPreferredHost,
};
