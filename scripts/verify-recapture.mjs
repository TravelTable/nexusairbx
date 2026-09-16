import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH);
const browser = await chromium.launch({ channel: "msedge", headless: true });

async function shot(page, url, file, waitMs = 800, after) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  if (after) await after(page);
  await page.screenshot({ path: `tmp/linear-verify/${file}`, fullPage: false });
}

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await shot(page, "http://127.0.0.1:4173/docs", "docs-after-heading-fix.png", 1200);
const docsColor = await page.evaluate(() => {
  const h1 = document.querySelector(".docs-article-header h1");
  const h2 = document.querySelector(".docs-heading-row h2");
  return {
    h1: h1 && getComputedStyle(h1).color,
    h2: h2 && getComputedStyle(h2).color,
    h1Text: h1?.textContent,
  };
});
console.log("DOCS_COLORS", JSON.stringify(docsColor));

await shot(page, "http://127.0.0.1:4173/", "homepage-compact-pricing.png", 800, async (p) => {
  await p.evaluate(() => document.querySelector("[data-pricing-layout='compact']")?.scrollIntoView());
  await new Promise((resolve) => setTimeout(resolve, 300));
});

const compact = await page.evaluate(() => {
  const section = document.querySelector("[data-pricing-layout='compact']");
  const cards = section?.querySelector(".cards, [class*='cards']");
  const firstCard = section?.querySelector("article");
  return {
    sectionBorder: cards && getComputedStyle(cards).borderTopWidth,
    cardRadius: firstCard && getComputedStyle(firstCard).borderRadius,
    checkmarks: section?.innerText.includes("✓") || false,
    kickers: /START BUILDING|BUILD SERIOUSLY/.test(section?.innerText || ""),
  };
});
console.log("COMPACT", JSON.stringify(compact));

const aiPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await shot(aiPage, "http://127.0.0.1:3000/ai", "spa-ai-workspace.png", 5000);
const ai = await aiPage.evaluate(() => {
  const root = document.querySelector(".ai-page");
  return {
    href: location.href,
    canvas: root && getComputedStyle(root).getPropertyValue("--nx-canvas").trim(),
    radius: root && getComputedStyle(root).getPropertyValue("--nx-radius-control").trim(),
    motion: root && getComputedStyle(root).getPropertyValue("--nx-motion-spatial").trim(),
    tabs: Array.from(document.querySelectorAll("button, a, [role='tab']"))
      .map((el) => el.textContent.trim())
      .filter((text) => ["Agent", "UI", "Assets"].includes(text)),
  };
});
console.log("AI_FREEZE", JSON.stringify(ai));
for (const label of ["UI", "Assets"]) {
  await aiPage.getByRole("tab", { name: label }).click().catch(async () => {
    await aiPage.getByText(label, { exact: true }).first().click();
  });
  await new Promise((resolve) => setTimeout(resolve, 800));
  await aiPage.screenshot({ path: `tmp/linear-verify/spa-ai-${label.toLowerCase()}.png`, fullPage: false });
}

const settingsPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await shot(settingsPage, "http://127.0.0.1:3000/settings", "spa-settings.png", 5000);
const settings = await settingsPage.evaluate(() => ({
  href: location.href,
  text: document.body.innerText.slice(0, 240),
}));
console.log("SETTINGS", JSON.stringify(settings));

await browser.close();
