import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("the public homepage skip link precedes every navigation target", () => {
  const page = read("public-frontend/app/page.jsx");
  const header = read("public-frontend/components/PublicHeader.jsx");
  const skipLink = read("src/components/site/SkipToMainContent.jsx");

  assert.match(page, /<PublicHeader showSkipLink \/>/);
  const skipIndex = header.indexOf("{showSkipLink ? <SkipToMainContent /> : null}");
  const navigationIndex = header.indexOf('<div className="mx-auto flex h-16');
  assert.ok(skipIndex >= 0, "PublicHeader must render the shared skip link");
  assert.ok(skipIndex < navigationIndex, "skip link must precede the public navigation in DOM order");
  assert.match(skipLink, /href={`#\${targetId}`}/);
  assert.match(skipLink, />\s*Skip to main content\s*<\/a>/);
});
