const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("Quick Script mobile workspace keeps prompt reachable and code contained", () => {
  const workspace = read("src/pages/ai/QuickScriptWorkspace.jsx");

  assert.match(workspace, /lazy\(\(\) => import\("\.\.\/\.\.\/components\/ai\/QuickScriptCodeBlock"\)\)/);
  assert.doesNotMatch(workspace, /react-syntax-highlighter/);
  assert.match(workspace, /scrollIntoView\(\{ block: "center"/);
  assert.match(workspace, /text-sm leading-relaxed/);
  assert.match(workspace, /aria-invalid=\{Boolean\(quickScript\?\.error && !result\)\}/);
  assert.match(workspace, /quick-script-code-scroll/);
  assert.match(workspace, /tabIndex=\{0\}/);
  assert.match(workspace, /Generated Luau code\. Scroll to read\./);
  assert.match(workspace, /className="h-8 px-4 text-xs font-bold bg-\[#00f5d4\]/);
});

test("Quick Script code highlighter is isolated behind a lazy client chunk", () => {
  const codeBlock = read("src/components/ai/QuickScriptCodeBlock.jsx");

  assert.match(codeBlock, /react-syntax-highlighter/);
  assert.match(codeBlock, /width: "max-content"/);
  assert.match(codeBlock, /minWidth: "100%"/);
  assert.match(codeBlock, /wrapLongLines=\{false\}/);
});

test("AI workspace uses mobile viewport units and safe toast placement", () => {
  const layout = read("src/pages/ai/AgentWorkspaceLayout.jsx");

  assert.match(layout, /h-\[100dvh\]/);
  assert.match(layout, /min-h-\[100svh\]/);
  assert.match(layout, /flex-1 min-h-0 flex flex-col/);
  assert.match(layout, /bottom-\[max\(1rem,env\(safe-area-inset-bottom\)\)\]/);
});

test("Sign-in nudge remains dismissible and accessible on narrow viewports", () => {
  const modal = read("src/components/SignInNudgeModal.jsx");

  assert.match(modal, /role="dialog"/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /aria-labelledby="signin-nudge-title"/);
  assert.match(modal, /overflow-y-auto p-3/);
  assert.match(modal, /aria-label="Dismiss sign-in prompt"/);
  assert.match(modal, /Secure workspace handoff/);
});

test("Quick Script activation contracts keep value before authentication", () => {
  const controller = read("src/pages/ai/useAiWorkspaceController.js");

  assert.match(controller, /resolveInitialGeneratorMode/);
  assert.match(controller, /if \(quickScript\.status === "generating"\) return null;/);
  assert.match(controller, /navigator\.clipboard\.writeText\(code\)/);
  assert.match(controller, /PENDING_AUTH_ACTIONS\.SAVE_PROJECT/);
  assert.match(controller, /PENDING_AUTH_ACTIONS\.EXPORT_PROJECT/);
  assert.match(controller, /PENDING_AUTH_ACTIONS\.PUSH_TO_STUDIO/);
  assert.match(controller, /PENDING_AUTH_ACTIONS\.UPGRADE_TO_AGENT_BUILD/);
  assert.match(controller, /quick_script_upgrade/);
});
