import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("shared public header keeps server ownership and exposes the complete lg navigation contract", () => {
  const header = read("public-frontend/components/PublicHeader.jsx");
  const behavior = read("public-frontend/components/PublicNavBehavior.jsx");
  assert.doesNotMatch(header, /^\s*["']use client["']/m);
  assert.match(header, /lg:flex/);
  assert.match(header, /lg:hidden/);
  assert.match(header, /data-public-header/);
  assert.match(header, /PublicNavBehavior/);

  const expectedLinks = [
    ["AI Workspace", "/ai"],
    ["Icon Generator", "/tools/icon-generator"],
    ["Creator Store", "/icons-market"],
    ["Docs", "/docs"],
    ["Pricing", "/pricing"],
    ["Downloads", "/downloads"],
    ["Contact", "/contact"],
    ["Support", "/support"],
    ["Legal", "/legal"],
  ];
  for (const [label, href] of expectedLinks) {
    assert.match(header, new RegExp(`href=["']${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>${label}`));
  }
  assert.doesNotMatch(header, /href=["']\/subscribe["']/);
  assert.doesNotMatch(header, /Icon Market|Start Building/);
  assert.match(behavior, /^\s*["']use client["']/m);
  assert.match(behavior, /event\.key !== "Escape"/);
  assert.match(behavior, /restoreFocus: true/);
  assert.match(behavior, /aria-current/);
  assert.match(behavior, /pointerdown/);
});

test("isolated account control exposes signed-out and signed-in actions", () => {
  const account = read("public-frontend/components/PublicAccountState.jsx");
  assert.match(account, /^\s*["']use client["']/m);
  assert.match(account, /import\("\.\.\/\.\.\/src\/firebase"\)/);
  assert.match(account, /Sign in/);
  assert.match(account, /Start free/);
  assert.match(account, /Open workspace/);
  for (const label of ["Roblox + Studio", "Billing", "Settings", "Support", "Sign out"]) {
    assert.match(account, new RegExp(label.replace(/[+]/g, "\\+")));
  }
  assert.match(account, /signOut\(auth\)/);
});

test("public pricing reads the serializable catalog and preserves exact prices and Team limits", () => {
  const catalog = JSON.parse(read("src/data/publicPlanCatalog.json"));
  const byId = Object.fromEntries(catalog.map((plan) => [plan.id, plan]));

  assert.equal(byId.FREE.monthly, 0);
  assert.equal(byId.STARTER.monthly, 2);
  assert.equal(byId.STARTER.yearly, null);
  assert.equal(byId.PRO.monthly, 19.99);
  assert.equal(byId.PRO.yearly, 199);
  assert.equal(byId.PRO.featured, true);
  assert.equal(byId.PRO_PLUS.monthly, 39.99);
  assert.equal(byId.PRO_PLUS.yearly, 399);
  assert.equal(byId.TEAM.monthly, 29);
  assert.equal(byId.TEAM.yearly, 290);
  assert.equal(byId.TEAM.minimumSeats, 2);
  assert.equal(byId.TEAM.maximumSeats, 50);

  const pricing = read("public-frontend/components/PricingCatalog.jsx");
  assert.match(pricing, /publicPlanCatalog\.json/);
  assert.match(pricing, /plan\.yearly \/ 12/);
  assert.match(pricing, /Billed.*yearly/);
  assert.match(pricing, /Monthly billing only/);
  assert.match(pricing, /plan\.id === "STARTER"/);
  assert.match(pricing, /minimumSeats/);
  assert.match(pricing, /maximumSeats/);
  assert.match(pricing, /\/subscribe\?/);
  assert.match(pricing, /PRICING_PLAN_SELECTED/);
  assert.match(pricing, /getEntitlements/);
  assert.match(pricing, /Manage plan/);
  assert.match(pricing, /href="\/billing"/);
  assert.doesNotMatch(pricing, /gradient|testimonial|priority processing|collaboration/i);
});

test("pricing is indexable while subscribe remains the noindex application bridge", async () => {
  const { buildSitemapDocuments } = require(path.join(root, "server/sitemapBuilder.js"));
  const { classifyRoute } = require(path.join(root, "server/productionRouting.js"));

  const pricing = await classifyRoute("/pricing");
  assert.equal(pricing.status, 200);
  assert.equal(pricing.frontend, "next");
  assert.equal(pricing.indexable, true);
  assert.equal(pricing.canonical, "https://www.nexusrbx.com/pricing");

  const subscribe = await classifyRoute("/subscribe");
  assert.equal(subscribe.frontend, "spa");
  assert.equal(subscribe.indexable, false);

  const { documents } = buildSitemapDocuments();
  assert.match(documents["sitemaps/core.xml"], /https:\/\/www\.nexusrbx\.com\/pricing/);
  assert.doesNotMatch(documents["sitemaps/core.xml"], /\/subscribe/);

  const staticCore = read("public/sitemaps/core.xml");
  assert.match(staticCore, /https:\/\/www\.nexusrbx\.com\/pricing/);
  assert.doesNotMatch(staticCore, /\/subscribe/);

  const vercel = JSON.parse(read("vercel.json"));
  assert.ok(vercel.rewrites.some((entry) => entry.source === "/pricing" && entry.destination === "/api/render?path=/pricing"));
});

test("pricing page publishes canonical metadata and restrained buyer copy", () => {
  const page = read("public-frontend/app/pricing/page.jsx");
  assert.match(page, /path:\s*["']\/pricing["']/);
  assert.match(page, /PricingCatalog/);
  assert.match(page, /PublicHeader/);
  assert.match(page, /Skip to pricing/);
  assert.doesNotMatch(page, /gradient|testimonial|supercharge/i);
});
