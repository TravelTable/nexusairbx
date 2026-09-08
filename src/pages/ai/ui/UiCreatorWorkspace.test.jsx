import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import UiCreatorWorkspace from "./UiCreatorWorkspace";
import {
  acceptUiDraft,
  compileUiDesign,
  createUiCheckpoint,
  generateUiDraft,
  getUiDesign,
  listUiDesigns,
} from "../../../lib/uiDesignApi";
import { getStudioCommand, queueStudioTool } from "../../../lib/studioBridgeApi";
import { getUiPreviewManifest, readUiCapture, requestUiCapture } from "../../../lib/uiPreviewApi";
import useUiPreview from "../../../hooks/useUiPreview";

jest.mock("../../../lib/uiDesignApi", () => ({
  acceptUiDraft: jest.fn(),
  compileUiDesign: jest.fn(),
  createUiCheckpoint: jest.fn(),
  createUiDesign: jest.fn(),
  generateUiDraft: jest.fn(),
  getUiDesign: jest.fn(),
  listUiDesigns: jest.fn(),
  saveUiHooks: jest.fn(),
}));
jest.mock("../../../lib/studioBridgeApi", () => ({
  getStudioCommand: jest.fn(),
  queueStudioTool: jest.fn(),
}));
jest.mock("../../../lib/uiPreviewApi", () => ({
  getUiPreviewManifest: jest.fn(),
  requestUiCapture: jest.fn(),
  readUiCapture: jest.fn(),
}));
jest.mock("../../../hooks/useUiPreview", () => jest.fn());
jest.mock("../../../lib/featureFlags", () => {
  const flags = { streamV2: true, unifiedAgent: true, rawReasoning: true };
  return { __esModule: true, FEATURE_FLAGS: flags, default: flags };
});
jest.mock("../../../context/SettingsContext", () => ({
  useSettings: () => ({ settings: { showThinking: true } }),
}));
jest.mock("../../../components/ai-elements/conversation", () => {
  const ReactModule = require("react");
  const Passthrough = ({ children }) => ReactModule.createElement("div", null, children);
  return {
    Conversation: Passthrough,
    ConversationContent: Passthrough,
    ConversationScrollButton: () => null,
  };
});

function makeDocument(revision, { name = "Panel", width = 240, nodes } = {}) {
  return {
    schemaVersion: 1,
    kind: "roblox-ui",
    designId: "design-1",
    projectId: "project-1",
    chatId: "chat-1",
    title: "Test UI",
    revision,
    tokens: { colors: { primary: "#9f7aea" } },
    screens: [{
      id: "main",
      name: "Main",
      className: "ScreenGui",
      nodes: nodes || [{
        id: "panel",
        name,
        className: "Frame",
        parentId: null,
        order: 0,
        props: {
          position: { x: { scale: 0.5, offset: 0 }, y: { scale: 0.5, offset: 0 } },
          size: { x: { scale: 0, offset: width }, y: { scale: 0, offset: 100 } },
          anchorPoint: { x: 0.5, y: 0.5 },
          backgroundColor: "#241f25",
          visible: true,
        },
        style: { cornerRadius: 4 },
        constraints: {},
        interactions: {},
      }],
      states: {},
      timelines: [],
    }],
    assets: [],
    hooks: [],
  };
}

function makePreviewManifest(designId, { sourceRevision = "revision-1", states = [], snapshotId = `snapshot-${designId}` } = {}) {
  return {
    designId,
    projectId: "project-1",
    sourceRevision,
    capture: {
      snapshotId,
      captureKind: "studio_edit",
      capturedAt: "2026-01-01T00:00:00.000Z",
      treeHash: `tree-${designId}`,
      sourceRevision,
      nodeCount: 4,
      complete: true,
      rootPath: `StarterGui/NexusRBX_UI/UI_${designId}`,
      warnings: [],
    },
    states: [
      { id: "default", label: "Default", version: 1, baseTreeHash: `tree-${designId}`, sourceRevision, stale: false },
      ...states,
    ],
    viewports: [
      { id: "desktop", label: "Desktop", width: 1280, height: 720, insets: { left: 0, right: 0, top: 0, bottom: 0 }, presetVersion: 1 },
      { id: "phone", label: "Phone portrait", width: 390, height: 844, insets: { left: 0, right: 0, top: 44, bottom: 34 }, presetVersion: 1 },
    ],
    capabilities: {
      previewEnabled: true,
      rendererAvailable: true,
      rendererRevision: "renderer-1",
      fontRevision: "font-1",
      studioEditCapture: true,
      studioRuntimeCapture: false,
      captureUnavailableReason: null,
    },
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((next) => { resolve = next; });
  return { promise, resolve };
}

const connectedProps = {
  user: { uid: "user-1" },
  projectId: "project-1",
  projectTitle: "Test Game",
  modelVersion: "gpt-5",
  studio: { connected: true },
  studioSessionId: "studio-1",
  isStarterOrAbove: true,
  notify: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.removeItem("nexusrbx:ui-creator-left-width");
  window.sessionStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: jest.fn(() => ({
      matches: false,
      media: "(max-width: 900px)",
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    })),
  });
  const initial = makeDocument("revision-1");
  useUiPreview.mockImplementation(() => ({ status: "waiting_capture", preview: null, imageUrl: "", error: "", retry: jest.fn() }));
  getUiPreviewManifest.mockResolvedValue(makePreviewManifest("design-1"));
  listUiDesigns.mockResolvedValue({ designs: [{ designId: "design-1", title: "Test UI" }] });
  getUiDesign.mockResolvedValue({
    design: {
      designId: "design-1",
      title: "Test UI",
      revision: initial.revision,
      document: initial,
      messages: [],
      hooksSource: "",
    },
  });
});

test("sends the selected top-bar model with the UI prompt", async () => {
  generateUiDraft.mockResolvedValue({ draft: { draftId: "draft-1" }, messages: [] });
  acceptUiDraft.mockResolvedValue({ document: makeDocument("revision-2") });

  render(<UiCreatorWorkspace {...connectedProps} modelVersion="anthropic/claude-sonnet-5" />);

  const promptInput = await screen.findByRole("textbox", { name: "Prompt input" });
  expect(promptInput.closest("[data-tour='prompt-composer']")).toHaveClass("nexus-composer");
  fireEvent.change(promptInput, { target: { value: "Make the shop header more playful" } });
  fireEvent.click(screen.getByRole("button", { name: "Send prompt" }));

  await waitFor(() => expect(generateUiDraft).toHaveBeenCalledWith("design-1", expect.objectContaining({
    workspace: "ui_creator",
    prompt: "Make the shop header more playful",
    model: "anthropic/claude-sonnet-5",
  })));
});

test("submits the UI prompt with Enter and keeps Shift+Enter for a new line", async () => {
  generateUiDraft.mockResolvedValue({ draft: { draftId: "draft-1" }, messages: [] });
  acceptUiDraft.mockResolvedValue({ document: makeDocument("revision-2") });

  render(<UiCreatorWorkspace {...connectedProps} />);

  const input = await screen.findByRole("textbox", { name: "Prompt input" });
  fireEvent.change(input, { target: { value: "Create a responsive inventory" } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter", shiftKey: true });
  expect(generateUiDraft).not.toHaveBeenCalled();

  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
  await waitFor(() => expect(generateUiDraft).toHaveBeenCalledWith("design-1", expect.objectContaining({
    prompt: "Create a responsive inventory",
    model: "gpt-5",
  })));
});

test("disconnected Studio gates the composer and never generates", async () => {
  render(<UiCreatorWorkspace {...connectedProps} studio={{ connected: false }} studioSessionId="" />);

  const input = await screen.findByRole("textbox", { name: "Prompt input" });
  expect(input).toBeDisabled();
  expect(screen.getByRole("button", { name: "Connect Studio to generate" })).toBeDisabled();
  expect(screen.getByText("Open your bound place in Roblox Studio to start")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Apply to Studio" })).toBeDisabled();

  fireEvent.change(input, { target: { value: "Build a shop" } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
  await act(async () => { await Promise.resolve(); });
  expect(generateUiDraft).not.toHaveBeenCalled();
  expect(queueStudioTool).not.toHaveBeenCalled();
  expect(requestUiCapture).not.toHaveBeenCalled();
});

test("the stage exposes no editable UI controls", async () => {
  render(<UiCreatorWorkspace {...connectedProps} />);

  const stage = await screen.findByRole("region", { name: "Roblox UI preview workspace" });
  await waitFor(() => expect(getUiPreviewManifest).toHaveBeenCalledWith("design-1", expect.anything()));
  expect(within(stage).queryAllByRole("textbox")).toHaveLength(0);
  expect(within(stage).queryAllByRole("spinbutton")).toHaveLength(0);
  expect(screen.queryByRole("tab", { name: "Design" })).not.toBeInTheDocument();
  expect(screen.queryByRole("tab", { name: "Layers" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Undo UI edit" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Open inspector" })).not.toBeInTheDocument();
  const comboboxes = within(stage).getAllByRole("combobox").map((node) => node.getAttribute("aria-label"));
  expect(comboboxes).toEqual(["Preview viewport", "Preview state"]);
});

test("supports keyboard mode switching and persists keyboard pane resizing", async () => {
  render(<UiCreatorWorkspace {...connectedProps} />);

  const previewTab = await screen.findByRole("tab", { name: "Preview" });
  expect(previewTab).toHaveAttribute("aria-selected", "true");
  fireEvent.keyDown(previewTab, { key: "ArrowRight" });
  expect(screen.getByRole("tab", { name: "Code" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tab", { name: "Code" })).toHaveFocus();

  const separator = screen.getByRole("separator", { name: "Resize conversation panel" });
  expect(separator).toHaveAttribute("aria-valuenow", "320");
  fireEvent.keyDown(separator, { key: "ArrowRight" });
  expect(separator).toHaveAttribute("aria-valuenow", "336");
  expect(window.localStorage.getItem("nexusrbx:ui-creator-left-width")).toBe("336");

  fireEvent.doubleClick(separator);
  expect(separator).toHaveAttribute("aria-valuenow", "320");
  expect(window.localStorage.getItem("nexusrbx:ui-creator-left-width")).toBe("320");
});

test("uses a focus-managed conversation drawer on compact viewports", async () => {
  window.matchMedia.mockImplementation(() => ({
    matches: true,
    media: "(max-width: 900px)",
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));

  render(<UiCreatorWorkspace {...connectedProps} />);

  const trigger = await screen.findByRole("button", { name: "Open conversation" });
  expect(screen.queryByRole("dialog", { name: "Conversation" })).not.toBeInTheDocument();
  fireEvent.click(trigger);

  const drawer = await screen.findByRole("dialog", { name: "Conversation" });
  await waitFor(() => expect(drawer).toHaveFocus());

  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Conversation" })).not.toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("button", { name: "Open conversation" })).toHaveFocus());
});

test("a failed code preview stops retrying until the creator retries", async () => {
  compileUiDesign.mockRejectedValue(new Error("Compiler unavailable"));
  render(<UiCreatorWorkspace {...connectedProps} />);
  await screen.findByRole("tab", { name: "Code" });
  fireEvent.click(screen.getByRole("tab", { name: "Code" }));
  await screen.findByRole("button", { name: "Retry code preview" });
  expect(compileUiDesign).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Retry code preview" }));
  await waitFor(() => expect(compileUiDesign).toHaveBeenCalledTimes(2));
});

test("Studio apply snapshots first, reports the verified receipt, and streams the steps into chat", async () => {
  const notify = jest.fn();
  const document = makeDocument("revision-1");
  compileUiDesign.mockResolvedValue({ document, studioReady: true, compiled: { files: [], uiRoots: [{ targetPath: "StarterGui/NexusRBX_UI/UI_design1" }] } });
  createUiCheckpoint.mockResolvedValue({});
  queueStudioTool.mockResolvedValue({ commandId: "apply-test" });
  getStudioCommand.mockResolvedValue({ status: "succeeded", result: { uiRoots: [{ nodeCount: 3, treeHash: "verified-tree" }], snapshots: ["snapshot-1"] } });
  requestUiCapture.mockResolvedValue({ status: "ready", capture: { snapshotId: "snapshot-design-1" } });

  const { container } = render(<UiCreatorWorkspace {...connectedProps} notify={notify} />);
  await screen.findByRole("region", { name: "Roblox UI preview workspace" });
  fireEvent.click(container.querySelector(".ui-creator__toolbar .ui-creator__apply"));

  await screen.findByText("Studio apply verified");
  expect(createUiCheckpoint.mock.invocationCallOrder[0]).toBeLessThan(queueStudioTool.mock.invocationCallOrder[0]);
  expect(notify).toHaveBeenCalledWith(expect.objectContaining({ type: "success", message: "Editable UI applied and verified in Studio." }));
  expect(generateUiDraft).not.toHaveBeenCalled();
  await waitFor(() => expect(requestUiCapture).toHaveBeenCalledWith("design-1", expect.objectContaining({ mode: "studio_edit", sourceRevision: "revision-1" }), expect.anything()));
  expect(screen.getAllByText("Apply to Studio").length).toBeGreaterThan(1);
  expect(screen.getAllByText("Capture ScreenGui in Studio").length).toBeGreaterThan(0);
});

test("changing preview state or viewport never generates, compiles, or captures", async () => {
  getUiPreviewManifest.mockResolvedValue(makePreviewManifest("design-1", {
    states: [{ id: "shop-open", label: "Shop open", version: 1, baseTreeHash: "tree-design-1", sourceRevision: "revision-1", stale: false }],
  }));

  render(<UiCreatorWorkspace {...connectedProps} />);

  const stateChip = await screen.findByRole("button", { name: "Shop open" });
  fireEvent.click(stateChip);
  fireEvent.change(screen.getByRole("combobox", { name: "Preview viewport" }), { target: { value: "phone" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Preview state" }), { target: { value: "default" } });

  expect(generateUiDraft).not.toHaveBeenCalled();
  expect(compileUiDesign).not.toHaveBeenCalled();
  expect(queueStudioTool).not.toHaveBeenCalled();
  expect(requestUiCapture).not.toHaveBeenCalled();
});

test("switching design drops the previous design's capture before the new manifest arrives", async () => {
  listUiDesigns.mockResolvedValue({
    designs: [{ designId: "design-1", title: "Test UI" }, { designId: "design-2", title: "Second UI" }],
  });
  getUiDesign.mockImplementation(async (designId) => {
    const documentForDesign = { ...makeDocument("revision-1"), designId };
    return { design: { designId, title: designId, revision: "revision-1", document: documentForDesign, messages: [], hooksSource: "" } };
  });
  const pending = deferred();
  getUiPreviewManifest.mockImplementation((designId) => (designId === "design-1"
    ? Promise.resolve(makePreviewManifest("design-1", {
      states: [{ id: "shop-open", label: "Shop open", version: 1, baseTreeHash: "tree-design-1", sourceRevision: "revision-1", stale: false }],
    }))
    : pending.promise));

  render(<UiCreatorWorkspace {...connectedProps} />);
  await screen.findByRole("button", { name: "Shop open" });

  fireEvent.change(screen.getByRole("combobox", { name: "UI design" }), { target: { value: "design-2" } });

  await waitFor(() => expect(getUiPreviewManifest).toHaveBeenCalledWith("design-2", expect.anything()));
  expect(screen.queryByRole("button", { name: "Shop open" })).not.toBeInTheDocument();
  expect(screen.getByText("This revision is not in Studio yet")).toBeInTheDocument();

  await act(async () => {
    pending.resolve(makePreviewManifest("design-2"));
    await pending.promise;
  });
});

test("connected generate streams generate, apply, capture, and render steps into the chat and finishes on the rendered image", async () => {
  const accepted = makeDocument("revision-2");
  let captured = false;
  generateUiDraft.mockResolvedValue({
    draft: { draftId: "draft-1" },
    messages: [
      { id: "m-user", role: "user", prompt: "Build a shop", createdAt: "2026-01-01T00:00:01.000Z" },
      { id: "draft-1:assistant", role: "assistant", text: "A new UI revision is ready for review.", draftId: "draft-1", createdAt: "2026-01-01T00:00:02.000Z" },
    ],
  });
  acceptUiDraft.mockResolvedValue({ document: accepted });
  compileUiDesign.mockResolvedValue({
    document: accepted,
    studioReady: true,
    compiled: { uiRoots: [{ targetPath: "StarterGui/NexusRBX_UI/UI_design1" }], files: [] },
  });
  createUiCheckpoint.mockResolvedValue({});
  queueStudioTool.mockResolvedValue({ commandId: "apply-gen" });
  getStudioCommand.mockResolvedValue({ status: "succeeded", result: { uiRoots: [{ nodeCount: 2, treeHash: "tree-2" }] } });
  requestUiCapture.mockResolvedValue({ status: "queued", captureRequestId: "cap-1" });
  readUiCapture.mockImplementation(async () => {
    captured = true;
    return { status: "ready", capture: { snapshotId: "snap-2" } };
  });
  getUiPreviewManifest.mockImplementation(async () => (captured
    ? makePreviewManifest("design-1", { sourceRevision: "revision-2", snapshotId: "snap-2" })
    : makePreviewManifest("design-1")));
  useUiPreview.mockImplementation(({ snapshotId }) => (snapshotId === "snap-2"
    ? {
      status: "ready",
      imageUrl: "blob:preview-2",
      error: "",
      retry: jest.fn(),
      preview: { snapshotId: "snap-2", stateLabel: "Default", viewport: { width: 1280, height: 720 }, rendererBackend: "public", imageHash: "hash-2", viewportId: "desktop", captureKind: "studio_edit", warnings: [] },
    }
    : { status: "waiting_capture", preview: null, imageUrl: "", error: "", retry: jest.fn() }));

  render(<UiCreatorWorkspace {...connectedProps} />);

  fireEvent.change(await screen.findByLabelText("Prompt input"), { target: { value: "Build a shop" } });
  fireEvent.click(screen.getByRole("button", { name: "Send prompt" }));

  const live = await screen.findByTestId("live-work-stream");
  expect(within(live).getByText("Generate UI revision")).toBeInTheDocument();
  expect(within(live).getByText("Render preview")).toBeInTheDocument();

  await waitFor(() => expect(acceptUiDraft).toHaveBeenCalledWith("design-1", "draft-1"));
  expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
  await waitFor(() => expect(queueStudioTool).toHaveBeenCalled());
  await waitFor(() => expect(requestUiCapture).toHaveBeenCalledWith("design-1", expect.objectContaining({ sourceRevision: "revision-2", rootPath: "StarterGui/NexusRBX_UI/UI_design1" }), expect.anything()), { timeout: 4000 });

  await screen.findByText("UI revision revision is in Studio and previewed.", {}, { timeout: 4000 });
  expect(screen.queryByTestId("live-work-stream")).not.toBeInTheDocument();
  expect(screen.queryByText("A new UI revision is ready for review.")).not.toBeInTheDocument();
  expect(screen.getByText("Build a shop")).toBeInTheDocument();
  expect(screen.getAllByText("Success").length).toBe(4);
  expect(screen.getByRole("img", { name: "Default state of the captured Roblox UI" })).toHaveAttribute("src", "blob:preview-2");
  expect(screen.getAllByRole("status").some((node) => node.textContent.includes("hosted render"))).toBe(true);
});

test("a rejected Studio apply fails the apply step, leaves later steps untouched, and offers a retry on the stage", async () => {
  const accepted = makeDocument("revision-2");
  generateUiDraft.mockResolvedValue({
    draft: { draftId: "draft-1" },
    messages: [
      { id: "m-user", role: "user", prompt: "Build a shop", createdAt: "2026-01-01T00:00:01.000Z" },
      { id: "draft-1:assistant", role: "assistant", text: "A new UI revision is ready for review.", draftId: "draft-1", createdAt: "2026-01-01T00:00:02.000Z" },
    ],
  });
  let acceptedRevision = "revision-1";
  acceptUiDraft.mockImplementation(async () => {
    acceptedRevision = "revision-2";
    return { document: accepted };
  });
  // The server manifest follows the design revision; the capture stays at the old one.
  getUiPreviewManifest.mockImplementation(async () => ({
    ...makePreviewManifest("design-1"),
    sourceRevision: acceptedRevision,
  }));
  compileUiDesign.mockResolvedValue({ document: accepted, studioReady: true, compiled: { uiRoots: [{ targetPath: "StarterGui/NexusRBX_UI/UI_design1" }], files: [] } });
  createUiCheckpoint.mockResolvedValue({});
  queueStudioTool.mockResolvedValue({ commandId: "apply-fail" });
  getStudioCommand.mockResolvedValue({ status: "failed", error: { code: "APPLY_REJECTED", message: "Studio rejected the shop frame." } });

  render(<UiCreatorWorkspace {...connectedProps} />);

  fireEvent.change(await screen.findByLabelText("Prompt input"), { target: { value: "Build a shop" } });
  fireEvent.click(screen.getByRole("button", { name: "Send prompt" }));

  await waitFor(() => expect(getStudioCommand).toHaveBeenCalled());
  await screen.findByText("The UI revision is saved, but it is not in Studio yet. Use Apply to Studio to retry.");
  expect(requestUiCapture).not.toHaveBeenCalled();
  expect(screen.queryByTestId("live-work-stream")).not.toBeInTheDocument();
  expect(screen.getByText("Error")).toBeInTheDocument();
  expect(screen.getAllByText("Pending")).toHaveLength(2);
  expect(screen.getAllByText("Studio rejected the shop frame.").length).toBeGreaterThan(0);

  const stage = screen.getByRole("region", { name: "Roblox UI preview workspace" });
  expect(within(stage).getByText("This revision is not in Studio yet")).toBeInTheDocument();
  expect(within(stage).getByRole("button", { name: "Apply to Studio" })).toBeEnabled();
});
