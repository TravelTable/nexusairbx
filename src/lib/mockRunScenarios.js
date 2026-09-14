/** Client-only mock frames derived from the shared loading pipelines in runPresentation. */

import {
  AGENT_LOADING_PIPELINE,
  UI_LOADING_PIPELINE,
} from "./runPresentation";

export const UI_PLACEHOLDER_TEXT = "Placeholder";
export const AGENT_PLACEHOLDER_CODE = `\`\`\`lua
-- Placeholder
print("mock run complete")
\`\`\``;

const UI_HAPPY_PATH = "ui-happy-path";
const AGENT_HAPPY_PATH = "agent-happy-path";

export function listMockScenarios(workspace = "all") {
  const all = [
    { id: UI_HAPPY_PATH, workspace: "ui", label: "UI happy path", description: "Walk the UI build stages, then show Placeholder." },
    { id: AGENT_HAPPY_PATH, workspace: "agent", label: "Agent happy path", description: "Walk agent loading, then short placeholder code." },
  ];
  if (workspace === "all") return all;
  return all.filter((item) => item.workspace === workspace);
}

export function buildMockFrames(scenarioId, context = {}) {
  if (scenarioId === UI_HAPPY_PATH) return buildUiMockFrames(context);
  if (scenarioId === AGENT_HAPPY_PATH) return buildAgentMockFrames(context);
  throw new Error(`Unknown mock scenario: ${scenarioId}`);
}

function uiTask({ projectId, chatId, designId, sourceRevision }, uiBuild, status = "running") {
  return {
    taskId: "mock-ui-task",
    chatId,
    projectId,
    mode: "agent",
    status,
    intent: {
      designId,
      workspace: "ui_creator",
      original: "Mock UI request",
      uiIntent: "create",
    },
    uiBuild: {
      designId,
      sourceRevision: sourceRevision || "mock-rev",
      ...uiBuild,
    },
  };
}

export function buildUiMockFrames(context = {}) {
  const scope = {
    projectId: context.projectId || "mock-project",
    chatId: context.chatId || "mock-chat",
    designId: context.designId || "mock-design",
    sourceRevision: context.sourceRevision || "mock-rev",
  };
  const file = {
    path: "StarterGui/MockPlaceholder.luau",
    language: "luau",
    content: "-- Placeholder\nreturn {}",
  };
  const prompt = context.prompt || "Mock UI request";

  return UI_LOADING_PIPELINE.map((step) => {
    const sourceFiles = step.withFiles ? [file] : undefined;
    if (step.busy) {
      return { delayMs: step.delayMs || 0, busy: step.busy, task: null, pendingPrompt: prompt };
    }
    const uiBuild = {
      stage: step.stage,
      action: step.action || null,
      outcome: step.outcome || undefined,
      sourceFiles,
    };
    const terminal = Boolean(step.terminal);
    return {
      delayMs: step.delayMs || 0,
      busy: "",
      task: uiTask(scope, uiBuild, terminal ? "succeeded" : "running"),
      event: {
        eventId: `mock-ui-${step.stage}-${step.action || "stage"}`,
        eventType: "ui_build_progress",
        payload: { designId: scope.designId, sourceRevision: scope.sourceRevision, ...uiBuild },
      },
      placeholder: terminal ? UI_PLACEHOLDER_TEXT : undefined,
      sourceFiles,
      pendingPrompt: prompt,
    };
  });
}

export function buildAgentMockFrames(context = {}) {
  const chatId = context.chatId || "mock-chat";
  const projectId = context.projectId || "mock-project";
  const prompt = context.prompt || "Mock agent request";
  const runBase = { runId: "mock-agent-run", taskId: "mock-agent-task", chatId, projectId };

  return AGENT_LOADING_PIPELINE.map((step) => {
    const terminal = Boolean(step.terminal);
    return {
      delayMs: step.delayMs || 0,
      pendingPrompt: prompt,
      busy: !terminal,
      stage: step.stage || "",
      run: {
        ...runBase,
        status: step.status || (terminal ? "succeeded" : "running"),
        completion: terminal ? { canComplete: false } : undefined,
      },
      assistantContent: terminal ? AGENT_PLACEHOLDER_CODE : undefined,
    };
  });
}
