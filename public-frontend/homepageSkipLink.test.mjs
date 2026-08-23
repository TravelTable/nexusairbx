import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("the public homepage skip link precedes every navigation target", () => {
  const page = read("public-frontend/app/page.jsx");
  const header = read("public-frontend/components/PublicHeader.jsx");
  const frame = read("src/components/universal/UniversalHeaderFrame.jsx");
  const account = read("public-frontend/components/PublicAccountState.jsx");
  const skipLink = read("src/components/site/SkipToMainContent.jsx");

  assert.match(page, /<PublicHeader showSkipLink homepage \/>/);
  assert.match(header, /before=\{showSkipLink \? <SkipToMainContent \/> : null\}/);
  const skipIndex = frame.indexOf("{before}");
  const navigationIndex = frame.indexOf('<nav className={styles.navigation}');
  assert.ok(skipIndex >= 0 && skipIndex < navigationIndex, "skip link must precede the public navigation in DOM order");
  assert.match(skipLink, /href={`#\${targetId}`}/);
  assert.match(skipLink, />\s*Skip to main content\s*<\/a>/);
  assert.match(skipLink, /className="nx-skip-link"/);
  assert.match(frame, /aria-label="Primary navigation"/);
  assert.match(frame, /navigation\.map/);
  assert.match(account, /const controlHeightClass = "h-11 md:h-9"/);
});
