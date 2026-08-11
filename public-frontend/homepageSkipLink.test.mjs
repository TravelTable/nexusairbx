import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("the public homepage skip link precedes every navigation target", () => {
  const page = read("public-frontend/app/page.jsx");
  const header = read("public-frontend/components/PublicHeader.jsx");
  const account = read("public-frontend/components/PublicAccountState.jsx");
  const skipLink = read("src/components/site/SkipToMainContent.jsx");

  assert.match(page, /<PublicHeader showSkipLink overlay \/>/);
  const skipIndex = header.indexOf("{showSkipLink ? <SkipToMainContent /> : null}");
  const navigationIndex = header.indexOf("data-public-header-inner");
  assert.ok(skipIndex >= 0, "PublicHeader must render the shared skip link");
  assert.ok(skipIndex < navigationIndex, "skip link must precede the public navigation in DOM order");
  assert.match(skipLink, /href={`#\${targetId}`}/);
  assert.match(skipLink, />\s*Skip to main content\s*<\/a>/);
  assert.match(skipLink, /min-h-11/);
  assert.match(header, /dropdownLinkClass\s*=\s*\r?\n\s*"flex min-h-11 items-center/);
  assert.match(header, /flex h-11 cursor-pointer list-none items-center/);
  assert.match(account, /const controlHeightClass = mobile \? "h-11" : "h-10"/);
});
