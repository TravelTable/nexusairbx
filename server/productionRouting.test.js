const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  NEXT_PUBLIC_ROUTES,
  SPA_ROUTES,
  buildPreferredHostLocation,
  classifyRoute,
  isNextPublicRoute,
  isSpaRoute,
  renderAppRoute,
  shouldRedirectToPreferredHost,
} = require("./productionRouting");

const html = '<!doctype html><html><head><title>NexusRBX</title></head><body><div id="root"></div></body></html>';
const validIconId = "omFibOqM24B7fVibHfan";
const docsRouteSources = [
  "/docs",
  "/docs/getting-started",
  "/docs/studio-plugin",
  "/docs/script-generation",
  "/docs/ui-generation",
  "/docs/assets",
  "/docs/projects",
  "/docs/account",
  "/docs/api",
  "/docs/troubleshooting",
  "/docs/faq",
];
const legalRouteSources = [
  "/legal",
  "/legal/terms",
  "/legal/privacy",
  "/legal/acceptable-use",
  "/legal/refunds",
  "/legal/cookies",
];

function iconExists(id) {
  return Promise.resolve(id === validIconId);
}

function iconStatus(id) {
  if (id === validIconId) return Promise.resolve("indexable");
  if (id === "thin-icon-id") return Promise.resolve("noindex");
  if (id === "removed-icon-id") return Promise.resolve("gone");
  return Promise.resolve("missing");
}

test("www homepage is a Next-owned public route with absolute www canonical", async () => {
  assert.equal(shouldRedirectToPreferredHost("www.nexusrbx.com"), false);
  const route = await classifyRoute("/", { iconExists, iconStatus });
  assert.equal(route.status, 200);
  assert.equal(route.frontend, "next");
  assert.equal(route.indexable, true);
  assert.equal(route.canonicalPath, "/");
});

test("non-www homepage uses a permanent preferred-host redirect target", () => {
  assert.equal(shouldRedirectToPreferredHost("nexusrbx.com"), true);
  assert.equal(buildPreferredHostLocation("/", "nexusrbx.com"), "https://www.nexusrbx.com/");
});

test("vercel redirect config uses a permanent non-www to www redirect", () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "vercel.json"), "utf8"));
  const redirect = config.redirects.find((entry) => entry.destination === "https://www.nexusrbx.com/:path*");
  assert.ok(redirect);
  assert.equal(redirect.permanent, true);
  assert.deepEqual(redirect.has, [{ type: "host", value: "nexusrbx.com" }]);
});

test("non-www nested path preserves path and query in redirect target", () => {
  assert.equal(buildPreferredHostLocation("/docs?x=1", "nexusrbx.com"), "https://www.nexusrbx.com/docs?x=1");
});

test("route classifier assigns explicit Next public and SPA owners", async () => {
  for (const pathname of NEXT_PUBLIC_ROUTES) {
    const route = await classifyRoute(pathname, { iconExists, iconStatus });
    assert.equal(route.status, 200, pathname);
    assert.equal(route.frontend, "next", pathname);
    assert.equal(route.indexable, true, pathname);
    assert.equal(route.routeType, "public", pathname);
    assert.equal(isNextPublicRoute(pathname), true, pathname);
  }

  for (const pathname of SPA_ROUTES) {
    const route = await classifyRoute(pathname, { iconExists, iconStatus });
    assert.equal(route.status, 200, pathname);
    assert.equal(route.frontend, "spa", pathname);
    assert.equal(route.indexable, false, pathname);
    assert.equal(route.routeType, "app", pathname);
    assert.equal(isSpaRoute(pathname), true, pathname);
  }

  assert.equal(isSpaRoute("/script/example-share"), true);
  assert.equal(isSpaRoute("/auth/callback"), true);
  assert.equal(isSpaRoute("/__/auth/handler"), true);
  assert.equal(isNextPublicRoute("/ai"), false);

  const unknown = await classifyRoute("/definitely-missing-route-codex", { iconExists, iconStatus });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.frontend, "none");
  assert.equal(unknown.indexable, false);
});

test("valid public route returns 200 with route-specific canonical ownership", async () => {
  const route = await classifyRoute("/docs/studio-plugin", { iconExists, iconStatus });
  assert.equal(route.status, 200);
  assert.equal(route.frontend, "next");
  assert.equal(route.canonicalPath, "/docs/studio-plugin");

  const legalRoute = await classifyRoute("/legal/privacy", { iconExists, iconStatus });
  assert.equal(legalRoute.status, 200);
  assert.equal(legalRoute.frontend, "next");
  assert.equal(legalRoute.canonicalPath, "/legal/privacy");
});

test("valid authenticated route returns 200 noindex without canonical", async () => {
  const rendered = await renderAppRoute({ html, pathname: "/ai", iconExists });
  assert.equal(rendered.status, 200);
  assert.match(rendered.body, /name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(rendered.body, /rel="canonical"/);
});

test("unknown route returns 404 noindex without canonical", async () => {
  const rendered = await renderAppRoute({ html, pathname: "/definitely-missing-route-codex", iconExists });
  assert.equal(rendered.status, 404);
  assert.match(rendered.body, /name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(rendered.body, /rel="canonical"/);
});

test("valid icon route returns 200 with icon canonical", async () => {
  const route = await classifyRoute(`/icons/${validIconId}`, { iconExists, iconStatus });
  assert.equal(route.status, 200);
  assert.equal(route.frontend, "next");
  assert.equal(route.canonicalPath, `/icons/${validIconId}`);
  assert.equal(route.indexable, true);
});

test("thin icon route returns 200 noindex instead of canonicalising to marketplace", async () => {
  const route = await classifyRoute("/icons/thin-icon-id", { iconExists, iconStatus });
  assert.equal(route.status, 200);
  assert.equal(route.frontend, "next");
  assert.equal(route.indexable, false);
  assert.equal(route.canonicalPath, null);
});

test("reliably removed icon route returns 410 noindex", async () => {
  const route = await classifyRoute("/icons/removed-icon-id", { iconExists, iconStatus });
  assert.equal(route.status, 410);
  assert.equal(route.frontend, "none");
  assert.equal(route.indexable, false);
});

test("missing icon route returns 404 noindex", async () => {
  const route = await classifyRoute("/icons/not-a-real-icon-codex", { iconExists, iconStatus });
  assert.equal(route.status, 404);
  assert.equal(route.frontend, "none");
  assert.equal(route.indexable, false);
});

test("marketplace filter URLs are noindex application routes", async () => {
  const route = await classifyRoute("/icons-market?category=Inventory", { iconExists, iconStatus });
  assert.equal(route.status, 200);
  assert.equal(route.indexable, false);
  assert.equal(route.routeType, "app");
  assert.equal(route.frontend, "spa");
});

test("route classifier preserves valid app callback routes", async () => {
  const route = await classifyRoute("/__/auth/handler", { iconExists });
  assert.equal(route.status, 200);
  assert.equal(route.indexable, false);
  assert.equal(route.frontend, "spa");
});

test("vercel rewrites enumerate route owners without a broad fallback", () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "vercel.json"), "utf8"));
  const renderRewrites = config.rewrites.filter((entry) => entry.destination.startsWith("/api/render"));
  const sources = renderRewrites.map((entry) => entry.source);
  const expectedSources = [
    "/",
    "/downloads",
    ...docsRouteSources,
    ...legalRouteSources,
    "/roblox-script-generator",
    "/roblox-ai-scripter",
    "/roblox-lua-script-generator",
    "/roblox-studio-script-generator",
    "/roblox-gui-maker",
    "/icons/:id",
    "/ai",
    "/settings",
    "/billing",
    "/signin",
    "/signup",
    "/subscribe",
    "/contact",
    "/privacy",
    "/terms",
    "/tools/icon-generator",
    "/icons-market",
    "/script/:id",
    "/debug/entitlements",
    "/__/auth/:path*",
    "/auth/:path*",
  ];

  expectedSources.forEach((source) => assert.ok(sources.includes(source), `missing rewrite for ${source}`));
  sources.forEach((source) => {
    assert.doesNotMatch(source, /\(\?!|\.\*/);
    assert.notEqual(source, "/:path*");
  });
});

test("render function package includes split public export and SPA shell", () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "vercel.json"), "utf8"));
  const rawIncludeFiles = config.functions["api/render.js"].includeFiles;
  const includeFiles = Array.isArray(rawIncludeFiles) ? rawIncludeFiles.join("\n") : String(rawIncludeFiles);
  assert.match(includeFiles, /build\/__spa-shell\.html/);
  assert.match(includeFiles, /build\/__public\/\*\*/);
  assert.doesNotMatch(includeFiles, /build\/index\.html/);
});

test("sitemap uses only the preferred www host", () => {
  const sitemap = fs.readFileSync(path.join(__dirname, "..", "public", "sitemap.xml"), "utf8");
  assert.doesNotMatch(sitemap, /https:\/\/nexusrbx\.com/);
  const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  assert.ok(locs.length > 0);
  locs.forEach((loc) => assert.ok(loc.startsWith("https://www.nexusrbx.com"), loc));
});

test("robots.txt points at the preferred sitemap host", () => {
  const robots = fs.readFileSync(path.join(__dirname, "..", "public", "robots.txt"), "utf8");
  assert.match(robots, /Sitemap:\s+https:\/\/www\.nexusrbx\.com\/sitemap\.xml/);
  assert.doesNotMatch(robots, /Sitemap:\s+https:\/\/nexusrbx\.com\/sitemap\.xml/);
});
