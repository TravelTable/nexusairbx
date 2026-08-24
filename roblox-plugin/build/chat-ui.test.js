const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pluginRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(pluginRoot, relativePath), "utf8");
}

for (const relativePath of ["src/ui/BridgePanel.lua", "NexusRBXStudioBridge.plugin.lua"]) {
  test(`${relativePath} keeps chat primary, dark, and synchronized`, () => {
    const source = read(relativePath);
    assert.match(source, /activeTab[^\n]+"Chat"/);
    assert.match(source, /local TAB_ORDER = \{ "Chat", "Activity", "Recovery", "Settings" \}/);
    assert.match(source, /canvas = Color3\.fromRGB\(17, 18, 20\)/);
    assert.match(source, /conversationSection = makeSection\("Conversation"\)/);
    assert.match(source, /promptSection\.Parent = root/);
    assert.match(source, /promptSection\.AnchorPoint = Vector2\.new\(0, 1\)/);
    assert.match(source, /\/api\/studio\/agent\/chat\/messages\?limit=30/);
    assert.match(source, /\/api\/studio\/agent\/runs\/" \.\. runId/);
    assert.match(source, /appendChatMessage\(approvalId, "assistant"/);
    assert.match(source, /approvalOverlay\.Visible = false\s+setActiveTab\("Chat"\)/);
  });
}
