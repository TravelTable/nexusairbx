const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  buildPreferredHostLocation,
  classifyRoute,
  renderAppRoute,
  shouldRedirectToPreferredHost,
} = require("./productionRouting");

const html = '<!doctype html><html><head><title>NexusRBX</title></head><body><div id="root"></div></body></html>';
const validIconId = "omFibOqM24B7fVibHfan";

function iconExists(id) {
  return Promise.resolve(id === validIconId);
}

function iconStatus(id) {
  if (id === validIconId) return Promise.resolve("indexable");
  if (id === "thin-icon-id") return Promise.resolve("noindex");
  if (id === "removed-icon-id") return Promise.resolve("gone");
  return Promise.resolve("missing");
}

test("www homepage returns 200 with absolute www canonical", async () => {
  assert.equal(shouldRedirectToPreferredHost("www.nexusrbx.com"), false);
  const rendered = await renderAppRoute({ html, pathname: "/", iconExists });
  assert.equal(rendered.status, 200);
  assert.match(rendered.body, /rel="canonical" href="https:\/\/www\.nexusrbx\.com\/"/);
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

test("valid public route returns 200 with route-specific canonical", async () => {
  const rendered = await renderAppRoute({ html, pathname: "/docs", iconExists });
  assert.equal(rendered.status, 200);
  assert.match(rendered.body, /href="https:\/\/www\.nexusrbx\.com\/docs"/);
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
  const rendered = await renderAppRoute({ html, pathname: `/icons/${validIconId}`, iconExists, iconStatus });
  assert.equal(rendered.status, 200);
  assert.match(rendered.body, new RegExp(`href="https://www\\.nexusrbx\\.com/icons/${validIconId}"`));
});

test("thin icon route returns 200 noindex instead of canonicalising to marketplace", async () => {
  const rendered = await renderAppRoute({ html, pathname: "/icons/thin-icon-id", iconExists, iconStatus });
  assert.equal(rendered.status, 200);
  assert.match(rendered.body, /name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(rendered.body, /rel="canonical"/);
});

test("reliably removed icon route returns 410 noindex", async () => {
  const rendered = await renderAppRoute({ html, pathname: "/icons/removed-icon-id", iconExists, iconStatus });
  assert.equal(rendered.status, 410);
  assert.match(rendered.body, /name="robots" content="noindex, nofollow"/);
});

test("missing icon route returns 404 noindex", async () => {
  const rendered = await renderAppRoute({ html, pathname: "/icons/not-a-real-icon-codex", iconExists, iconStatus });
  assert.equal(rendered.status, 404);
  assert.match(rendered.body, /name="robots" content="noindex, nofollow"/);
});

test("marketplace filter URLs are noindex application routes", async () => {
  const route = await classifyRoute("/icons-market?category=Inventory", { iconExists, iconStatus });
  assert.equal(route.status, 200);
  assert.equal(route.indexable, false);
  assert.equal(route.routeType, "app");
});

test("route classifier preserves valid app callback routes", async () => {
  const route = await classifyRoute("/__/auth/handler", { iconExists });
  assert.equal(route.status, 200);
  assert.equal(route.indexable, false);
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
