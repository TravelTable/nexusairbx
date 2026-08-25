const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pluginRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(pluginRoot, relativePath), "utf8");
const sourceUi = [
  "src/ui/PluginHeader.lua",
  "src/ui/ChatMessage.lua",
  "src/ui/Composer.lua",
  "src/ui/ToolActivity.lua",
  "src/ui/BridgePanel.lua",
  "src/net/chatClient.lua",
].map(read).join("\n");

for (const [name, source] of [
  ["componentized Studio UI", sourceUi],
  ["bundled Studio plugin", read("NexusRBXStudioBridge.plugin.lua")],
]) {
  test(`${name} is a project-aware streaming Nexus chat`, () => {
    assert.match(source, /canvas = Color3\.fromRGB\(17, 18, 20\)/);
    assert.match(source, /createNexusPluginHeader/);
    assert.match(source, /createNexusChatMessage/);
    assert.match(source, /createNexusComposer/);
    assert.match(source, /\{ "Plan", "Ask", "Agent" \}/);
    assert.match(source, /What do you want to build\?/);
    assert.match(source, /tabBar\.Visible = false/);
    assert.match(source, /studioChatBootstrap/);
    assert.match(source, /\/api\/studio\/chat\/bootstrap/);
    assert.match(source, /\/api\/studio\/chat\/runs\//);
    assert.match(source, /eventType == "delta"/);
    assert.match(source, /eventType == "tool_step"/);
    assert.match(source, /studioChatCancelRun/);
    assert.match(source, /studioChatApproveRun/);
    assert.match(source, /studioChatUndoRun/);
    assert.match(source, /resumeRunId/);
    assert.match(source, /refreshStudioSelection/);
    assert.match(source, /nexusChatNearBottom/);
    assert.match(source, /appendChatMessage\(approvalId, "assistant"/);
    assert.doesNotMatch(source, /ProjectIdInput|nexusrbxProjectId/);
    assert.doesNotMatch(source, /Script mode|Quick Script/i);
  });
}

test("chat UI responsibilities stay split into focused source files", () => {
  for (const file of ["PluginHeader.lua", "ChatMessage.lua", "Composer.lua", "ToolActivity.lua"]) {
    assert.ok(fs.existsSync(path.join(pluginRoot, "src", "ui", file)), `${file} should exist`);
  }
  assert.ok(fs.existsSync(path.join(pluginRoot, "src", "net", "chatClient.lua")));
});

test("active project identity changes always start a fresh Studio conversation", () => {
  const main = read("src/Main.server.lua");
  const panel = read("src/ui/BridgePanel.lua");
  assert.match(main, /projectIdentityChanged/);
  assert.match(main, /bootstrapStudioConversation\(true, projectIdentityChanged\)/);
  assert.match(panel, /function bootstrapStudioConversation\(force, freshConversation\)/);
  assert.match(panel, /freshConversation == true or not active/);
  assert.match(panel, /studioChatCreateConversation\(token, chatComposer\.mode\)/);
});
