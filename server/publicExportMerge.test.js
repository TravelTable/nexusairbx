const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { mergePublicExport, shouldCopyStaticSidecar } = require("../scripts/merge-public-export");

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

test("public export merge keeps Next flight text payloads out of the deployed root", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nexusrbx-public-merge-"));

  try {
    writeFile(path.join(projectRoot, "build", "index.html"), "<!doctype html><div id=\"root\"></div>");
    writeFile(path.join(projectRoot, "build", "static", "js", "main.js"), "window.__CRA__=true;");
    writeFile(path.join(projectRoot, "build", "robots.txt"), "User-agent: *");
    writeFile(path.join(projectRoot, "public-frontend", "out", "index.html"), "<!doctype html><h1>Home</h1>");
    writeFile(path.join(projectRoot, "public-frontend", "out", "index.txt"), "1:\"$React.fragment\"");
    writeFile(path.join(projectRoot, "public-frontend", "out", "__next._index.txt"), "0:{\"b\":\"flight\"}");
    writeFile(path.join(projectRoot, "public-frontend", "out", "docs.txt"), "1:\"$React.fragment\"");
    writeFile(path.join(projectRoot, "public-frontend", "out", "docs", "index.html"), "<!doctype html><h1>Docs</h1>");
    writeFile(path.join(projectRoot, "public-frontend", "out", "docs", "__next.docs.txt"), "0:{\"b\":\"flight\"}");
    writeFile(path.join(projectRoot, "public-frontend", "out", "_next", "static", "chunks", "app.js"), "self.__next_f=[];");
    writeFile(path.join(projectRoot, "public-frontend", "out", "favicon.ico"), "ico");
    writeFile(path.join(projectRoot, "public-frontend", "out", "site.webmanifest"), "{\"name\":\"NexusRBX\"}");

    mergePublicExport({ projectRoot, log: () => {} });

    assert.equal(exists(path.join(projectRoot, "build", "__spa-shell.html")), true);
    assert.equal(exists(path.join(projectRoot, "build", "index.html")), false);
    assert.equal(exists(path.join(projectRoot, "build", "__public", "index.html")), true);
    assert.equal(exists(path.join(projectRoot, "build", "__public", "index.txt")), true);
    assert.equal(exists(path.join(projectRoot, "build", "__public", "docs", "__next.docs.txt")), true);

    assert.equal(exists(path.join(projectRoot, "build", "index.txt")), false);
    assert.equal(exists(path.join(projectRoot, "build", "__next._index.txt")), false);
    assert.equal(exists(path.join(projectRoot, "build", "docs.txt")), false);
    assert.equal(exists(path.join(projectRoot, "build", "docs", "__next.docs.txt")), false);

    assert.equal(exists(path.join(projectRoot, "build", "_next", "static", "chunks", "app.js")), true);
    assert.equal(exists(path.join(projectRoot, "build", "favicon.ico")), true);
    assert.equal(exists(path.join(projectRoot, "build", "site.webmanifest")), true);
    assert.equal(exists(path.join(projectRoot, "build", "static", "js", "main.js")), true);
    assert.equal(exists(path.join(projectRoot, "build", "robots.txt")), true);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("static sidecar filter excludes exported HTML and RSC text payloads", () => {
  assert.equal(shouldCopyStaticSidecar("index.html"), false);
  assert.equal(shouldCopyStaticSidecar("__next._index.txt"), false);
  assert.equal(shouldCopyStaticSidecar("_next/static/chunks/app.js"), true);
  assert.equal(shouldCopyStaticSidecar("site.webmanifest"), true);
});
