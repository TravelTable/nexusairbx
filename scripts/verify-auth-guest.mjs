import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || path.join(process.env.TEMP, "nx-pw/node_modules/playwright-core"));
const OUT = path.resolve("tmp/linear-verify");
mkdirSync(OUT, { recursive: true });
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const userDataDir = mkdtempSync(path.join(tmpdir(), "nx-edge-guest3-"));
const context = await chromium.launchPersistentContext(userDataDir, {
  executablePath: edge,
  headless: true,
  viewport: { width: 1440, height: 900 },
  args: ["--guest", "--no-first-run", "--no-default-browser-check", "--disable-sync"],
});
const page = context.pages()[0] || (await context.newPage());
await page.goto("http://127.0.0.1:3000/signup", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.getByRole("heading", { name: /Create your account/i }).waitFor({ timeout: 8000 });
await page.screenshot({ path: path.join(OUT, "auth-signup-guest.png"), fullPage: false });
await page.getByRole("button", { name: /Sign in/i }).click();
await page.getByRole("heading", { name: /Sign in|Welcome|Continue/i }).waitFor({ timeout: 5000 }).catch(() => {});
await new Promise((resolve) => setTimeout(resolve, 600));
await page.screenshot({ path: path.join(OUT, "auth-signin-guest.png"), fullPage: false });
const signin = await page.evaluate(() => ({
  href: location.href,
  heading: document.querySelector("h1")?.textContent?.trim() || null,
  headingColor: document.querySelector("h1") && getComputedStyle(document.querySelector("h1")).color,
  canvas: getComputedStyle(document.documentElement).getPropertyValue("--nx-canvas").trim(),
}));
console.log("SIGNIN", JSON.stringify(signin));
await context.close();

const browser = await chromium.launch({ channel: "msedge", headless: true });
const home = await browser.newPage({ viewport: { width: 1440, height: 1600 } });
await home.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded", timeout: 45000 });
await new Promise((resolve) => setTimeout(resolve, 1500));
await home.evaluate(() => document.querySelector("[data-pricing-layout='compact']")?.scrollIntoView({ block: "start" }));
await new Promise((resolve) => setTimeout(resolve, 400));
await home.screenshot({ path: path.join(OUT, "homepage-compact-plans.png"), fullPage: false });
const homeMetrics = await home.evaluate(() => {
  const compact = document.querySelector("[data-pricing-layout='compact']");
  const article = compact?.querySelector("article");
  const r = article?.getBoundingClientRect();
  return {
    heading: compact?.querySelector("h2")?.textContent || null,
    articleTop: r?.top,
    articleHeight: r?.height,
    radius: article && getComputedStyle(article).borderRadius,
    checkmarks: compact ? compact.innerText.includes("✓") : null,
  };
});
console.log("HOME", JSON.stringify(homeMetrics));
await browser.close();
