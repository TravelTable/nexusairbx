const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pluginRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(pluginRoot, relativePath), "utf8");

function pairingBlock(source, relativePath) {
  const start = source.indexOf("local function pairStudio()");
  const end = source.indexOf("pairButton.MouseButton1Click:Connect(pairStudio)", start);
  assert.ok(start >= 0 && end > start, `${relativePath} must contain the pairing UI flow`);
  return source.slice(start, end);
}

for (const relativePath of ["src/Main.server.lua", "NexusRBXStudioBridge.plugin.lua"]) {
  test(`${relativePath} never renders pairing credentials`, () => {
    const source = read(relativePath);
    const pairing = pairingBlock(source, relativePath);

    assert.doesNotMatch(source, /paired session/i);
    assert.doesNotMatch(
      source,
      /(?:setLast|setStatus|showToast|setBanner)\s*\([^\r\n]*(?:sessionId|dataOrError\.token|getToken\s*\()/,
    );
    assert.doesNotMatch(
      source,
      /(?:\.Text|detail)\s*=\s*[^\r\n]*(?:sessionId|dataOrError\.token|getToken\s*\()/,
    );
    assert.doesNotMatch(pairing, /detail\s*=\s*tostring\(dataOrError\.(?:sessionId|token)\)/);
    assert.match(pairing, /setLast\("Studio paired/);
    assert.match(pairing, /detail\s*=\s*"Secure Studio connection established"/);
  });
}

test("BridgePanel success banners recognize generic pairing copy without credential fields", () => {
  const source = read("src/ui/BridgePanel.lua");
  assert.match(source, /string\.find\(string\.lower\(value\), "studio paired"\)/);
  assert.doesNotMatch(source, /paired session/i);
  assert.doesNotMatch(
    source,
    /(?:setLast|showToast|setBanner)\s*\([^\r\n]*(?:sessionId|dataOrError\.token|getToken\s*\()/,
  );
});
