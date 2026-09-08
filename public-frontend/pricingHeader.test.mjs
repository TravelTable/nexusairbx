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
    "/assets",
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
  assert.match(account, /Get started/);
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

test("public pricing quotes only plans a visitor can actually buy", () => {
  const catalog = JSON.parse(read("src/data/billingCatalog.v2.json"));
  const byId = Object.fromEntries(catalog.plans.map((plan) => [plan.id, plan]));

  assert.deepEqual(catalog.plans.map((plan) => plan.id), ["FREE", "STARTER", "PRO", "TEAM"]);
  assert.equal(byId.FREE.monthly, 0);
  assert.equal(byId.FREE.credits, 0);
  assert.equal(byId.FREE.selectable, false);
  assert.equal(byId.STARTER.monthly, 2);
  assert.equal(byId.STARTER.yearly, null);
  assert.equal(byId.STARTER.credits, 1.5);
  assert.equal(byId.PRO.monthly, 14.99);
  assert.equal(byId.PRO.yearly, 152.9);
  assert.equal(byId.PRO.featured, true);
  assert.equal(byId.TEAM.monthly, 24.99);
  assert.equal(byId.TEAM.yearly, 254.9);
  assert.equal(byId.TEAM.minimumSeats, 2);
  assert.equal(byId.TEAM.maximumSeats, 50);

  // FREE is an account shell only; paid plans are the purchasable set.
  const plans = read("src/components/billing/FinancialPlans.jsx");
  assert.match(plans, /SUBSCRIPTION_PLANS/);
  assert.doesNotMatch(plans, /plan\.id === "FREE"/);
  assert.match(plans, /No free trial/);

  // Retired tiers may still be honoured for existing subscribers, but they
  // must never be presented as a choice.
  assert.deepEqual(
    catalog.legacyPlans.map((plan) => plan.id).sort(),
    ["PRO_PLUS"],
  );
  for (const legacy of catalog.legacyPlans) {
    assert.equal(legacy.selectable, false, `${legacy.id} must not be selectable`);
  }
});

test("the pricing page renders the canonical catalog rather than a hardcoded copy", () => {
  const pricing = read("public-frontend/components/PricingCatalog.jsx");

  assert.match(pricing, /billingCatalog\.v2\.json/, "prices must come from the canonical catalog");
  assert.match(pricing, /FinancialPlans/, "the plan cards are the shared billing component");
  assert.doesNotMatch(pricing, /publicPlanCatalog/, "the retired duplicate catalog is gone");
  assert.doesNotMatch(
    pricing,
    /\$\d/,
    "prices must not be hardcoded into the page",
  );
  // Grandfathering is a promise to existing subscribers; keep it stated.
  assert.match(pricing, /grandfathered/i);
  assert.match(pricing, /href="\/billing"/);
  assert.doesNotMatch(pricing, /scope="col">Free</);
  assert.match(pricing, /scope="col">Starter</);
  assert.doesNotMatch(pricing, /gradient|testimonial|priority processing/i);
});

test("no shipped source quotes a retired plan as a purchase option", () => {
  for (const file of [
    "src/lib/planInfo.js",
    "src/lib/billingErrors.js",
    "src/components/NexusRBXHeader.jsx",
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /highlight=starter/, `${file} uses a retired highlight query`);
    assert.doesNotMatch(source, /Get Pro\+|Unlock Pro\+|Choose Pro\+|requires Pro\+/i,
      `${file} still sells the retired Pro+ plan`);
  }
});

test("pricing follows the selected reference-card design authority", () => {
  const routeMatrix = read("docs/design/revamp-route-matrix.md");
  const pricing = read("src/components/billing/FinancialPlans.jsx");
  const styles = read("src/components/billing/FinancialPlans.module.css");

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
