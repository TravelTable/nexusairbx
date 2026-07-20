import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockUseTaskRuntime = jest.fn();
const mockTaskProgressPanel = jest.fn();
const mockAgentChatPanel = jest.fn();

jest.mock("../../hooks/useTaskRuntime", () => ({
  __esModule: true,
  default: (...args) => mockUseTaskRuntime(...args),
}));

jest.mock("../../components/ai/workspace/TaskProgressPanel", () => ({
  __esModule: true,
  default: (props) => {
    const ReactModule = require("react");
    mockTaskProgressPanel(props);
    return ReactModule.createElement(
      "section",
      { "data-testid": "task-progress" },
      ReactModule.createElement("button", { type: "button", onClick: props.onRetry }, "retry task"),
      ReactModule.createElement("button", { type: "button", onClick: props.onCancel }, "cancel task"),
      ReactModule.createElement(
        "button",
        { type: "button", onClick: () => props.onAmend("Use a smaller lobby") },
        "amend task",
      ),
    );
  },
}));

jest.mock("lib/icons", () => {
  const ReactModule = require("react");
  const Icon = (props) => ReactModule.createElement("span", props);
  return {
    Menu: Icon,
    FolderTree: Icon,
    History: Icon,
    FileCode2: Icon,
    MessageSquare: Icon,
    ClipboardList: Icon,
    Search: Icon,
    RefreshCw: Icon,
    TerminalSquare: Icon,
    Bot: Icon,
  };
});

jest.mock("../../components/SidebarContent", () => () => null);
jest.mock("../../components/CodeDrawer", () => () => null);
jest.mock("../../components/SignInNudgeModal", () => () => null);
jest.mock("../../components/ProNudgeModal", () => () => null);
jest.mock("../../components/StarterPromoModal", () => () => null);
jest.mock("../../components/NotificationToast", () => () => null);
jest.mock("../../components/ai/ModelSwitcher", () => () => null);
jest.mock("../../components/ai/StudioPairControl", () => () => null);
jest.mock("../../components/ai/ProjectArchitecturePanel", () => () => null);
jest.mock("../../components/ai/AiComponents", () => ({ ProjectContextStatus: () => null }));
jest.mock("../../components/site/SiteHeader", () => () => null);
jest.mock("../../components/ui", () => ({ Segmented: () => null }));
jest.mock("../../components/ai/workspace/CodeFileTree", () => () => null);
jest.mock("../../components/ai/workspace/CodeWorkspace", () => () => null);
jest.mock("../../components/ai/workspace/AgentChatPanel", () => ({
  __esModule: true,
  default: (props) => {
    const ReactModule = require("react");
    mockAgentChatPanel(props);
    return ReactModule.createElement(
      "div",
      null,
      ReactModule.createElement(
        "button",
        { type: "button", onClick: () => props.onSubmit({ preventDefault: jest.fn() }) },
        "submit prompt",
      ),
      ReactModule.createElement(
        "button",
        { type: "button", onClick: () => props.onApprovePlan({ planId: "plan_1" }) },
        "approve plan",
      ),
    );
  },
}));
jest.mock("../../components/ai/workspace/BuildDetailsPanel", () => () => null);
jest.mock("../../components/ai/workspace/RobloxDecalUploadDropdown", () => () => null);
jest.mock("./QuickScriptWorkspace", () => () => null);
jest.mock("../../components/onboarding/TutorialOverlay", () => () => null);
jest.mock("../../components/onboarding/useTutorial", () => ({
  useTutorial: () => ({
    activeStep: 0,
    isActive: false,
    startTutorial: jest.fn(),
    nextStep: jest.fn(),
    prevStep: jest.fn(),
    skipTutorial: jest.fn(),
  }),
}));
jest.mock("../../components/ai/workspace/studioControlAccess", () => ({
  getActiveStudioCapabilities: () => [],
  isCurrentPluginAutoPushAuthorized: () => false,
  selectedStudioSupportsCommand: () => false,
}));
jest.mock("../../lib/studioBridgeApi", () => ({
  getStudioCommand: jest.fn(),
  getStudioManifest: jest.fn(),
  getStudioManifestStatus: jest.fn(),
  queueStudioTool: jest.fn(),
}));
jest.mock("../../lib/workspaceApi", () => ({
  cancelWorkspaceCommand: jest.fn(),
  createWorkspaceCommand: jest.fn(),
  getWorkspaceCommand: jest.fn(),
  streamWorkspaceCommandEvents: jest.fn(),
}));
jest.mock("../../lib/studioConnection", () => ({ getStudioSessionId: () => null }));

import AgentWorkspaceLayout from "./AgentWorkspaceLayout";

const noop = jest.fn();

function makeController({ activeMode = "build", handlers = {} } = {}) {
  return {
    billing: {},
    uiState: {
      user: { uid: "user_1" },
      isMobile: false,
      sidebarOpen: false,
      mobileTab: "chat",
      generatorMode: "agent_build",
      quickScript: null,
      prompt: "",
      isImproving: false,
      refineTarget: null,
      attachments: [],
      robloxImageUploading: false,
      robloxImageUploads: [],
      scripts: [],
      projectContext: null,
      architecturePanelOpen: false,
      showSignInNudge: false,
      signInNudgeReason: "",
      showProNudge: false,
      proNudgeReason: "",
      codeDrawerOpen: false,
      codeDrawerData: {},
      currentTheme: { primary: "#00f5d4", secondary: "#7c3aed" },
      currentToast: null,
      authReady: true,
    },
    modules: {
      chat: {
        currentChatId: "chat_1",
        messages: [],
        generatingChatIds: [],
        activeMode,
        updateChatMode: noop,
      },
      scriptManager: { versionHistory: [] },
      unified: { isGenerating: false },
      workspace: {
        activeArtifact: null,
        activeFile: null,
        agentRun: null,
        openFile: noop,
        revertArtifactEdits: noop,
      },
      settings: { modelVersion: "default" },
    },
    handlers: new Proxy(
      { notify: noop, dismissToast: noop, ...handlers },
      { get: (target, key) => target[key] || noop },
    ),
    studio: { connected: false },
    roblox: { connected: false, selectedAssetProjectId: "project_1" },
    starterPromo: {},
  };
}

describe("AgentWorkspaceLayout task-runtime wiring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loads the scoped runtime and forwards durable state and actions to the progress panel", async () => {
    const retry = jest.fn().mockResolvedValue(undefined);
    const cancel = jest.fn().mockResolvedValue(undefined);
    const amend = jest.fn().mockResolvedValue(undefined);
    const task = { taskId: "task_1", status: "running" };
    const events = [{ sequence: 3, type: "step_started" }];
    const runtimeError = { code: "TIMEOUT", message: "Retry safely." };

    mockUseTaskRuntime.mockReturnValue({
      task,
      events,
      connectionState: "polling",
      error: runtimeError,
      busyAction: "retry",
      retry,
      cancel,
      approve: jest.fn(),
      amend,
      selectTask: jest.fn(),
    });

    render(<AgentWorkspaceLayout controller={makeController()} />);

    expect(mockUseTaskRuntime).toHaveBeenCalledWith({
      user: { uid: "user_1" },
      projectId: "project_1",
      chatId: "chat_1",
      enabled: true,
    });
    expect(screen.getByTestId("task-progress")).toBeTruthy();

    const panelProps = mockTaskProgressPanel.mock.calls.at(-1)[0];
    expect(panelProps.task).toBe(task);
    expect(panelProps.events).toBe(events);
    expect(panelProps.connectionState).toBe("polling");
    expect(panelProps.error).toBe(runtimeError);
    expect(panelProps.busyAction).toBe("retry");

    fireEvent.click(screen.getByRole("button", { name: "retry task" }));
    fireEvent.click(screen.getByRole("button", { name: "cancel task" }));
    fireEvent.click(screen.getByRole("button", { name: "amend task" }));

    await waitFor(() => {
      expect(retry).toHaveBeenCalledTimes(1);
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(amend).toHaveBeenCalledWith("Use a smaller lobby");
    });
  });

  test("forwards task intake context through prompt submission and plan approval", () => {
    const handlePromptSubmit = jest.fn();
    const onApprovePlan = jest.fn();
    const selectTask = jest.fn();
    const startTask = jest.fn();
    mockUseTaskRuntime.mockReturnValue({
      enabled: true,
      taskId: "task_active",
      task: null,
      events: [],
      connectionState: "idle",
      error: null,
      busyAction: "",
      selectTask,
      startTask,
    });

    render(<AgentWorkspaceLayout controller={makeController({
      activeMode: "plan",
      handlers: { handlePromptSubmit, onApprovePlan },
    })} />);

    fireEvent.click(screen.getByRole("button", { name: "submit prompt" }));

    expect(handlePromptSubmit).toHaveBeenCalledTimes(1);
    const submitCall = handlePromptSubmit.mock.calls[0];
    expect(submitCall[1]).toBeNull();
    expect(submitCall[2]).toEqual({
      projectId: "project_1",
      activeTaskId: "task_active",
      showPlan: true,
      onTaskAccepted: selectTask,
    });
    submitCall[2].onTaskAccepted("task_accepted");
    expect(selectTask).toHaveBeenCalledWith("task_accepted");

    fireEvent.click(screen.getByRole("button", { name: "approve plan" }));
    expect(onApprovePlan).toHaveBeenCalledWith(
      { planId: "plan_1" },
      expect.objectContaining({
        projectId: "project_1",
        activeTaskId: "task_active",
        showPlan: true,
        onTaskAccepted: selectTask,
      }),
    );
    expect(startTask).not.toHaveBeenCalled();
  });

  test("preserves the legacy handler signatures when the task runtime is disabled", () => {
    const handlePromptSubmit = jest.fn();
    const onApprovePlan = jest.fn();
    const selectTask = jest.fn();
    const startTask = jest.fn();
    mockUseTaskRuntime.mockReturnValue({
      enabled: false,
      taskId: "",
      task: null,
      events: [],
      connectionState: "disabled",
      error: null,
      busyAction: "",
      selectTask,
      startTask,
    });

    render(<AgentWorkspaceLayout controller={makeController({
      handlers: { handlePromptSubmit, onApprovePlan },
    })} />);

    fireEvent.click(screen.getByRole("button", { name: "submit prompt" }));
    fireEvent.click(screen.getByRole("button", { name: "approve plan" }));

    expect(handlePromptSubmit).toHaveBeenCalledTimes(1);
    expect(handlePromptSubmit.mock.calls[0]).toHaveLength(1);
    expect(onApprovePlan).toHaveBeenCalledTimes(1);
    expect(onApprovePlan.mock.calls[0]).toHaveLength(1);
    expect(selectTask).not.toHaveBeenCalled();
    expect(startTask).not.toHaveBeenCalled();
  });
});
