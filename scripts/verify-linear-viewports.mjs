/**
 * Runtime evidence for the Linear public redesign.
 * Uses system Edge via playwright-core (not committed as a dependency).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const OUT_DIR = path.resolve("tmp/linear-verify");

const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "laptop-1024x768", width: 1024, height: 768 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
];

const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN || "http://127.0.0.1:4173";
const SPA_ORIGIN = process.env.SPA_ORIGIN || "http://127.0.0.1:3000";

function resolvePlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_CORE_PATH,
    path.resolve("node_modules/playwright-core"),
    path.resolve("../node_modules/playwright-core"),
    path.join(process.env.TEMP || "/tmp", "nx-pw", "node_modules", "playwright-core"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return require(path.join(candidate, "index.js"));
    } catch {
      try {
        return require(candidate);
      } catch {
        /* try next */
      }
    }
  }
  throw new Error("playwright-core not found. Install it in %TEMP%\\nx-pw first.");
}

async function probe(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return { ok: response.status >= 200 && response.status < 500, status: response.status };
  } catch (error) {
    return { ok: false, status: 0, error: String(error) };
  }
}

async function measurePage(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForFunction(() => document.readyState === "complete", { timeout: 20000 }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 500));
  return page.evaluate(() => {
    const root = document.documentElement;
    const catalog = document.querySelector('[data-pricing-layout="catalog"]');
    const compact = document.querySelector('[data-pricing-layout="compact"]');
    const protectedBody = document.querySelector("[data-nexus-protected-homepage-body]");
    const product = document.querySelector("[class*='product']");
    const ai = document.querySelector(".ai-page, .nexus-studio-root");
    const header = document.querySelector("header");
    const active = document.activeElement;
    const link = document.querySelector("a, button");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return {
      title: document.title,
      href: location.href,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: root.scrollWidth,
      scrollHeight: root.scrollHeight,
      clientHeight: root.clientHeight,
      bodyOverflow: getComputedStyle(document.body).overflow,
      htmlOverflow: getComputedStyle(root).overflow,
      pageScrollDelta: Math.max(0, root.scrollHeight - window.innerHeight),
      canvas: getComputedStyle(root).getPropertyValue("--nx-canvas").trim(),
      purple: getComputedStyle(root).getPropertyValue("--nx-purple").trim(),
      radiusCard: getComputedStyle(root).getPropertyValue("--nx-radius-card").trim(),
      headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
      catalog: catalog
        ? {
            height: Math.round(catalog.getBoundingClientRect().height),
            overflow: getComputedStyle(catalog).overflow,
            cssHeight: getComputedStyle(catalog).height,
          }
        : null,
      compact: compact
        ? {
            cards: compact.querySelectorAll("[class*='planCard'], article").length,
            checkmarks: Array.from(compact.querySelectorAll("li")).some((el) =>
              el.textContent.includes("✓")
            ),
          }
        : null,
      protected: protectedBody
        ? {
            canvas: getComputedStyle(protectedBody).getPropertyValue("--nx-canvas").trim(),
            purple: getComputedStyle(protectedBody).getPropertyValue("--nx-purple").trim(),
            radiusFeature: getComputedStyle(protectedBody).getPropertyValue("--nx-radius-feature").trim(),
            text: (protectedBody.innerText || "").slice(0, 180),
          }
        : null,
      productText: product ? (product.innerText || "").slice(0, 120) : null,
      ai: ai
        ? {
            canvas: getComputedStyle(ai).getPropertyValue("--nx-canvas").trim(),
            radiusControl: getComputedStyle(ai).getPropertyValue("--nx-radius-control").trim(),
            motion: getComputedStyle(ai).getPropertyValue("--nx-motion-spatial").trim(),
          }
        : null,
      activeTag: active?.tagName || null,
      linkTransition: link ? getComputedStyle(link).transitionDuration : null,
      reducedMotion: reduced,
    };
  });
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const report = { generatedAt: new Date().toISOString(), public: PUBLIC_ORIGIN, spa: SPA_ORIGIN, pages: [] };

  const publicOk = await probe(PUBLIC_ORIGIN);
  const spaOk = await probe(SPA_ORIGIN);
  report.probes = { public: publicOk, spa: spaOk };
  if (!publicOk.ok) {
    writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    throw new Error(`Public origin ${PUBLIC_ORIGIN} not reachable`);
  }

  const { chromium } = resolvePlaywright();
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const publicRoutes = [
    ["public", PUBLIC_ORIGIN, "/"],
    ["public", PUBLIC_ORIGIN, "/pricing"],
    ["public", PUBLIC_ORIGIN, "/downloads"],
    ["public", PUBLIC_ORIGIN, "/docs"],
    ["spa", SPA_ORIGIN, "/signin"],
    ["spa", SPA_ORIGIN, "/settings"],
  ];
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    for (const [runtime, origin, route] of publicRoutes) {
      if (runtime === "spa" && !spaOk.ok) continue;
      const url = `${origin}${route}`;
      try {
        const metrics = await measurePage(page, url);
        const shot = path.join(OUT_DIR, `${viewport.name}${route.replaceAll("/", "_") || "_home"}.png`);
        await page.screenshot({ path: shot, fullPage: false });
        report.pages.push({ viewport: viewport.name, runtime, route, shot, ...metrics });
      } catch (error) {
        report.pages.push({ viewport: viewport.name, runtime, route, error: String(error) });
      }
    }
    await context.close();
  }

  const reducedContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const reducedPage = await reducedContext.newPage();
  const reduced = await measurePage(reducedPage, `${PUBLIC_ORIGIN}/pricing`);
  await reducedPage.keyboard.press("Tab");
  await reducedPage.keyboard.press("Tab");
  const focused = await reducedPage.evaluate(() => ({
    tag: document.activeElement?.tagName,
    text: (document.activeElement?.textContent || "").trim().slice(0, 80),
    outline: getComputedStyle(document.activeElement).outline,
  }));
  report.reducedMotion = reduced;
  report.keyboard = focused;
  await reducedPage.screenshot({ path: path.join(OUT_DIR, "pricing-reduced-motion.png"), fullPage: false });
  await reducedContext.close();

  if (spaOk.ok) {
    const spaContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const spaPage = await spaContext.newPage();
    try {
      const ai = await measurePage(spaPage, `${SPA_ORIGIN}/ai`);
      await spaPage.screenshot({ path: path.join(OUT_DIR, "spa-ai.png"), fullPage: false });
      report.spaAi = ai;
    } catch (error) {
      report.spaAi = { error: String(error) };
    }
    await spaContext.close();
  }

  await browser.close();
  writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

void pathToFileURL;
