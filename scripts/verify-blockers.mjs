import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || path.join(process.env.TEMP, "nx-pw/node_modules/playwright-core"));
const OUT = path.resolve("tmp/linear-verify");
mkdirSync(OUT, { recursive: true });

const userDataDir = mkdtempSync(path.join(tmpdir(), "nx-edge-guest-"));
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: "msedge",
  headless: true,
  viewport: { width: 1440, height: 900 },
  args: ["--no-first-run", "--no-default-browser-check"],
});
const page = context.pages()[0] || (await context.newPage());

async function capture(url, file, waitMs = 2500) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  await page.screenshot({ path: path.join(OUT, file), fullPage: false });
  return page.evaluate(() => {
    const root = document.documentElement;
    const heading = document.querySelector("h1, h2");
    const current = document.querySelector('[aria-current="page"]');
    const hero = document.querySelector(".settings-overview-hero");
    const compact = document.querySelector("[data-pricing-layout='compact']");
    const ai = document.querySelector(".ai-page");
    const protectedBody = document.querySelector("[data-nexus-protected-homepage-body]");
    return {
      href: location.href,
      title: document.title,
      text: document.body.innerText.slice(0, 280),
      canvas: getComputedStyle(root).getPropertyValue("--nx-canvas").trim(),
      headingColor: heading && getComputedStyle(heading).color,
      headingText: heading?.textContent?.trim().slice(0, 80) || null,
      currentBg: current && getComputedStyle(current).backgroundColor,
      currentColor: current && getComputedStyle(current).color,
      heroBg: hero && getComputedStyle(hero).backgroundColor,
      heroBorder: hero && getComputedStyle(hero).borderTopColor + "/" + getComputedStyle(hero).borderRadius,
      compactRadius: compact?.querySelector("article") && getComputedStyle(compact.querySelector("article")).borderRadius,
      compactChecks: compact ? compact.innerText.includes("✓") : null,
      aiCanvas: ai && getComputedStyle(ai).getPropertyValue("--nx-canvas").trim(),
      protectedCanvas: protectedBody && getComputedStyle(protectedBody).getPropertyValue("--nx-canvas").trim(),
    };
  });
}

const report = {};
try {
  report.signin = await capture("http://127.0.0.1:3000/signin", "auth-signin-guest.png", 4000);
  report.signup = await capture("http://127.0.0.1:3000/signup", "auth-signup-guest.png", 2500);
  report.forgot = await capture("http://127.0.0.1:3000/forgot-password", "auth-forgot-guest.png", 2500);
} finally {
  await context.close();
}

const authed = await chromium.launch({ channel: "msedge", headless: true });
const authedPage = await authed.newPage({ viewport: { width: 1440, height: 900 } });
async function captureAuthed(url, file, waitMs = 4000) {
  await authedPage.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  await authedPage.screenshot({ path: path.join(OUT, file), fullPage: false });
  return authedPage.evaluate(() => {
    const current = document.querySelector('[aria-current="page"]');
    const hero = document.querySelector(".settings-overview-hero");
    const ai = document.querySelector(".ai-page");
    return {
      href: location.href,
      text: document.body.innerText.slice(0, 280),
      currentBg: current && getComputedStyle(current).backgroundColor,
      currentColor: current && getComputedStyle(current).color,
      heroBg: hero && getComputedStyle(hero).backgroundColor,
      heroRadius: hero && getComputedStyle(hero).borderRadius,
      aiCanvas: ai && getComputedStyle(ai).getPropertyValue("--nx-canvas").trim(),
    };
  });
}
try {
  report.settings = await captureAuthed("http://127.0.0.1:3000/settings", "settings-after.png");
  await authedPage.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await authedPage.evaluate(() => {
    document.querySelector("[data-pricing-layout='compact']")?.scrollIntoView({ block: "center" });
  });
  await new Promise((resolve) => setTimeout(resolve, 400));
  await authedPage.screenshot({ path: path.join(OUT, "homepage-compact-plans.png"), fullPage: false });
  report.home = await authedPage.evaluate(() => {
    const compact = document.querySelector("[data-pricing-layout='compact']");
    const protectedBody = document.querySelector("[data-nexus-protected-homepage-body]");
    const article = compact?.querySelector("article");
    const cards = compact?.querySelector("[class*='cards']");
    return {
      protectedCanvas: protectedBody && getComputedStyle(protectedBody).getPropertyValue("--nx-canvas").trim(),
      productCanvas: getComputedStyle(document.documentElement).getPropertyValue("--nx-canvas").trim(),
      compactRadius: article && getComputedStyle(article).borderRadius,
      compactBorder: cards && getComputedStyle(cards).borderTopWidth,
      checkmarks: compact ? compact.innerText.includes("✓") : null,
      heading: compact?.querySelector("h2")?.textContent || null,
    };
  });
  report.ai = await captureAuthed("http://127.0.0.1:3000/ai", "ai-still-frozen.png");
} finally {
  await authed.close();
}

console.log(JSON.stringify(report, null, 2));
