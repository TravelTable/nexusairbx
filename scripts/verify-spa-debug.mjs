import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (error) => console.log("PAGEERROR", error.message));
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("CONSOLE", msg.text());
});

await page.goto("http://127.0.0.1:3000/signin", { waitUntil: "domcontentloaded", timeout: 45000 });
await new Promise((resolve) => setTimeout(resolve, 5000));
const signin = await page.evaluate(() => ({
  href: location.href,
  root: document.getElementById("root")?.innerHTML?.slice(0, 500) || null,
  bodyLen: document.body.innerHTML.length,
  text: document.body.innerText.slice(0, 400),
}));
console.log("SPA_SIGNIN", JSON.stringify(signin));

await page.goto("http://127.0.0.1:3000/ai", { waitUntil: "domcontentloaded", timeout: 45000 });
await new Promise((resolve) => setTimeout(resolve, 5000));
const ai = await page.evaluate(() => ({
  href: location.href,
  hasAi: Boolean(document.querySelector(".ai-page, .nexus-studio-root")),
  canvas: getComputedStyle(document.querySelector(".ai-page, .nexus-studio-root") || document.documentElement)
    .getPropertyValue("--nx-canvas")
    .trim(),
  text: document.body.innerText.slice(0, 500),
}));
console.log("SPA_AI", JSON.stringify(ai));
await page.screenshot({ path: "tmp/linear-verify/spa-ai-wait.png" });

await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
await page.evaluate(() => document.getElementById("proof")?.scrollIntoView());
await new Promise((resolve) => setTimeout(resolve, 400));
await page.screenshot({ path: "tmp/linear-verify/homepage-videoshowcase.png" });
const freeze = await page.evaluate(() => {
  const protectedBody = document.querySelector("[data-nexus-protected-homepage-body]");
  const product = document.querySelector("[class*='product']");
  return {
    protectedCanvas: protectedBody && getComputedStyle(protectedBody).getPropertyValue("--nx-canvas").trim(),
    productCanvas: product && getComputedStyle(product).getPropertyValue("--nx-canvas").trim(),
    proofText: document.getElementById("proof")?.innerText?.slice(0, 160),
  };
});
console.log("HOME_PROOF", JSON.stringify(freeze));
await browser.close();
