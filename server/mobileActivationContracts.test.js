const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("AI workspace uses mobile viewport units and safe toast placement", () => {
  const layout = read("src/pages/ai/AgentWorkspaceLayout.jsx");

  assert.match(layout, /h-\[100dvh\]/);
  assert.match(layout, /min-h-\[100svh\]/);
  assert.match(layout, /flex-1 min-h-0 flex/);
  assert.match(layout, /bottom-\[max\(1rem,env\(safe-area-inset-bottom\)\)\]/);
});

test("Sign-in nudge remains dismissible and accessible on narrow viewports", () => {
  const modal = read("src/components/SignInNudgeModal.jsx");

  assert.match(modal, /role="dialog"/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /aria-labelledby="signin-nudge-title"/);
  assert.match(modal, /aria-label="Dismiss sign-in prompt"/);
  assert.match(modal, /Secure workspace handoff/);
});

test("Agent Build activation contracts require sign-in before generation", () => {
  const controller = read("src/pages/ai/useAiWorkspaceController.js");

  assert.match(controller, /if \(!pendingGenerationIntent\) return;/);
  assert.match(controller, /if \(!user\) \{\s*setShowSignInNudge\(true\);/);
  assert.match(controller, /submitUnifiedPrompt/);
  assert.match(controller, /PENDING_AUTH_ACTIONS\.RESTRICTED_GENERATION/);
  assert.match(controller, /workspace: "agent_build"/);
});
