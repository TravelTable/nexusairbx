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

test("public header keeps server ownership while delegating presentation to the universal frame", () => {
  const header = read("public-frontend/components/PublicHeader.jsx");
  const frame = read("src/components/universal/UniversalHeaderFrame.jsx");
  const siteIndex = read("src/components/universal/UniversalSiteIndex.jsx");
  const navigation = read("src/content/universalNavigation.js");
  assert.doesNotMatch(header, /^\s*["']use client["']/m);
  assert.match(header, /UniversalHeaderFrame/);
  assert.match(header, /universalPrimaryNavigation/);
  assert.match(header, /universalSiteIndexSections/);
  assert.match(header, /accountSlot=\{<PublicAccountState \/>\}/);
  assert.match(header, /mobileAccountSlot=\{<PublicAccountState mobile \/>\}/);
  assert.match(frame, /^\s*["']use client["']/m);
  assert.match(frame, /data-universal-header/);
  assert.match(frame, /aria-label="Primary navigation"/);
  assert.match(frame, /aria-haspopup="dialog"/);

  const expectedDestinations = [
    "/ai",
    "/tools/icon-generator",
    "/icons-market",
    "/docs",
    "/pricing",
    "/downloads",
    "/contact",
    "/support",
    "/legal",
  ];
  for (const href of expectedDestinations) {
    assert.match(
      navigation,
      new RegExp(
        `href: ["']${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
      ),
    );
  }
  for (const label of [
    "Build",
    "Assets",
    "Icons",
    "Studio",
    "Docs",
    "Pricing",
    "CREATE",
    "ASSETS",
    "LEARN",
    "ACCOUNT",
  ]) {
    assert.match(navigation, new RegExp(`label: ["']${label}["']`));
  }
  assert.doesNotMatch(navigation, /href: ["']\/subscribe["']/);
  assert.match(siteIndex, /event\.key === "Escape"/);
  assert.match(siteIndex, /event\.key !== "Tab"/);
  assert.match(siteIndex, /const opener = openerRef\?\.current/);
  assert.match(siteIndex, /opener\?\.focus\(\)/);
  assert.match(siteIndex, /aria-current/);
  assert.match(siteIndex, /aria-modal="true"/);
});

test("isolated account control exposes signed-out and signed-in actions", () => {
  const account = read("public-frontend/components/PublicAccountState.jsx");
  assert.match(account, /^\s*["']use client["']/m);
  assert.match(account, /import\("\.\.\/\.\.\/src\/firebase"\)/);
  assert.match(account, /Sign in/);
  assert.match(account, /Start free/);
  assert.match(account, /Open workspace/);
  for (const label of [
    "Roblox + Studio",
    "Billing",
    "Settings",
    "Support",
    "Sign out",
  ]) {
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
  assert.match(pricing, /billed annually/i);
  assert.match(pricing, /Monthly billing only/);
  assert.match(pricing, /annualUnavailable/);
  assert.match(pricing, /plan\.yearly == null/);
  assert.match(pricing, /minimumSeats/);
  assert.match(pricing, /maximumSeats/);
  assert.match(pricing, /\/subscribe\?/);
  assert.match(pricing, /PRICING_PLAN_SELECTED/);
  assert.match(pricing, /getEntitlements/);
  assert.match(pricing, /Manage plan/);
  assert.match(pricing, /href="\/billing"/);
  assert.match(pricing, /NexusRBX plans/);
  assert.match(pricing, /Choose the plan that fits your build/);
  assert.match(pricing, /PricingCard/);
  assert.match(pricing, /Most popular/);
  assert.match(pricing, /data-featured/);
  assert.match(pricing, /aria-label="NexusRBX access plans"/);
  assert.match(pricing, /data-plan=\{plan\.id\}/);
  assert.match(pricing, /Detailed feature comparison/);
  assert.match(pricing, /aria-label="Detailed feature comparison"/);
  assert.doesNotMatch(
    pricing,
    /gradient|testimonial|priority processing|collaboration/i,
  );
});

test("pricing follows the selected reference-card design authority", () => {
  const routeMatrix = read("docs/design/revamp-route-matrix.md");
  const pricing = read("public-frontend/components/PricingCatalog.jsx");
  const styles = read("public-frontend/components/PricingWorkspace.module.css");

  assert.match(routeMatrix, /`\/pricing`[\s\S]*Reference-inspired pricing cards/);
  assert.match(
    pricing,
    /className=\{styles\.cycleToggle\}[\s\S]*role="group"[\s\S]*aria-label="Billing period"/,
  );
  assert.match(
    styles,
    /\.cycleToggle\s*\{[^}]*border:\s*1px solid var\(--nx-rule-strong\)[^}]*border-radius:\s*var\(--nx-radius-panel\)/,
  );
  assert.match(
    styles,
    /\.cycleToggle button\s*\{[^}]*min-height:\s*var\(--nx-touch-target\)[^}]*border-radius:\s*var\(--nx-radius-control\)/,
  );
  assert.match(
    styles,
    /\.cycleToggle button\[aria-pressed="true"\]\s*\{[^}]*background:\s*var\(--nx-raised-surface\)/,
  );
  assert.match(
    styles,
    /\.planCard\[data-featured="true"\]\s*\{[^}]*border:\s*2px solid var\(--nx-purple\)/,
  );
});

test("pricing is indexable while subscribe remains the noindex application bridge", async () => {
  const { buildSitemapDocuments } = require(
    path.join(root, "server/sitemapBuilder.js"),
  );
  const { classifyRoute } = require(
    path.join(root, "server/productionRouting.js"),
  );

  const pricing = await classifyRoute("/pricing");
  assert.equal(pricing.status, 200);
  assert.equal(pricing.frontend, "next");
  assert.equal(pricing.indexable, true);
  assert.equal(pricing.canonical, "https://www.nexusrbx.com/pricing");

  const subscribe = await classifyRoute("/subscribe");
  assert.equal(subscribe.frontend, "spa");
  assert.equal(subscribe.indexable, false);

  const { documents } = buildSitemapDocuments();
  assert.match(
    documents["sitemaps/core.xml"],
    /https:\/\/www\.nexusrbx\.com\/pricing/,
  );
  assert.doesNotMatch(documents["sitemaps/core.xml"], /\/subscribe/);

  const staticCore = read("public/sitemaps/core.xml");
  assert.match(staticCore, /https:\/\/www\.nexusrbx\.com\/pricing/);
  assert.doesNotMatch(staticCore, /\/subscribe/);

  const vercel = JSON.parse(read("vercel.json"));
  assert.ok(
    vercel.rewrites.some(
      (entry) =>
        entry.source === "/pricing" &&
        entry.destination === "/api/render?path=/pricing",
    ),
  );
});

test("pricing page publishes canonical metadata and restrained buyer copy", () => {
  const page = read("public-frontend/app/pricing/page.jsx");
  assert.match(page, /path:\s*["']\/pricing["']/);
  assert.match(page, /PricingCatalog/);
  assert.match(page, /PublicHeader/);
  assert.match(page, /Skip to pricing/);
  assert.match(page, /Build Your Roblox Game/);
  assert.match(page, /min-h-11/);
  assert.match(page, /var\(--nx-canvas\)/);
  assert.doesNotMatch(page, /gradient|testimonial|supercharge/i);
});
