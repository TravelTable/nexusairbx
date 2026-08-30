import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import UiCreatorWorkspace from "./UiCreatorWorkspace";
import {
  generateUiDraft,
  getUiDesign,
  listUiDesigns,
  patchUiDesign,
} from "../../../lib/uiDesignApi";
import { getAssetFileBlob } from "../../../lib/assetPlatformApi";

jest.mock("@headless-tree/core", () => ({
  hotkeysCoreFeature: {},
  selectionFeature: {},
  syncDataLoaderFeature: {},
}));
jest.mock("@headless-tree/react", () => ({
  useTree: (options) => {
    const itemIds = [];
    const visit = (itemId) => {
      (options.dataLoader.getChildren(itemId) || []).forEach((childId) => {
        itemIds.push(childId);
        visit(childId);
      });
    };
    visit(options.rootItemId);
    return {
      getItems: () => itemIds.map((itemId) => ({
        getId: () => itemId,
        getItemData: () => options.dataLoader.getItem(itemId),
      })),
    };
  },
}));
jest.mock("../../../components/ui/tree", () => ({
  Tree: ({ children }) => <div>{children}</div>,
  TreeItem: ({ children }) => children,
  TreeItemLabel: ({ children }) => children,
}));
jest.mock("./RobloxUiPreview", () => ({ document }) => <div data-testid="roblox-ui-preview" data-asset-preview={document?.assets?.[0]?.previewUrl || ""} />);
jest.mock("../../../lib/uiDesignApi", () => ({
  acceptUiDraft: jest.fn(),
  compileUiDesign: jest.fn(),
  createUiCheckpoint: jest.fn(),
  createUiDesign: jest.fn(),
  discardUiDraft: jest.fn(),
  generateUiDraft: jest.fn(),
  getUiDesign: jest.fn(),
  listUiCheckpoints: jest.fn(),
  listUiDesigns: jest.fn(),
  patchUiDesign: jest.fn(),
  restoreUiCheckpoint: jest.fn(),
  saveUiHooks: jest.fn(),
}));
jest.mock("../../../lib/assetPlatformApi", () => ({
  ASSET_PLATFORM_WRITES_ENABLED: true,
  createAssetOperationKey: jest.fn(() => "operation-1"),
  generateAsset: jest.fn(),
  getAssetFileBlob: jest.fn(),
}));
jest.mock("../../../lib/studioBridgeApi", () => ({
  getStudioCommand: jest.fn(),
  queueStudioTool: jest.fn(),
}));

function makeDocument(revision, { name = "Panel", width = 240, assets = [] } = {}) {
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
      nodes: [{
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
    assets,
    hooks: [],
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((next) => { resolve = next; });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.removeItem("nexusrbx:ui-creator-left-width");
  window.localStorage.removeItem("nexusrbx:ui-creator-right-width");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: jest.fn(() => ({
      matches: false,
      media: "(max-width: 900px)",
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: jest.fn(() => "blob:private-preview") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: jest.fn() });
  const initial = makeDocument("revision-1");
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

test("loads a private canonical asset preview without persisting its temporary URL", async () => {
  const canonicalAsset = {
    refId: "asset-1",
    canonicalAssetId: "canonical-1",
    name: "Gold coin",
    kind: "icon",
    required: true,
    status: "generated",
  };
  const initial = makeDocument("revision-1", { assets: [canonicalAsset] });
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
  getAssetFileBlob.mockResolvedValue(new Blob(["private-preview"], { type: "image/webp" }));

  const { container, unmount } = render(
    <UiCreatorWorkspace
      user={{ uid: "user-1" }}
      projectId="project-1"
      projectTitle="Test Game"
      modelVersion="gpt-5"
      studio={{ connected: false }}
      studioSessionId=""
      isStarterOrAbove
      notify={jest.fn()}
    />,
  );

  await waitFor(() => expect(getAssetFileBlob).toHaveBeenCalledWith(
    "canonical-1",
    "preview",
    expect.objectContaining({ projectId: "project-1" }),
  ));
  await waitFor(() => expect(screen.getByTestId("roblox-ui-preview")).toHaveAttribute("data-asset-preview", "blob:private-preview"));

  fireEvent.click(screen.getByRole("tab", { name: "Assets" }));
  await waitFor(() => expect(container.querySelector(".ui-asset-list img")).toHaveAttribute("src", "blob:private-preview"));

  expect(patchUiDesign).not.toHaveBeenCalled();
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:private-preview");
});

test("sends the selected top-bar model with the UI prompt", async () => {
  generateUiDraft.mockResolvedValue({
    draft: {
      draftId: "draft-1",
      document: makeDocument("draft-revision"),
      validation: { score: 88 },
      repairPasses: 0,
    },
    messages: [],
  });

  render(
    <UiCreatorWorkspace
      user={{ uid: "user-1" }}
      projectId="project-1"
      projectTitle="Test Game"
      modelVersion="anthropic/claude-sonnet-5"
      studio={{ connected: false }}
      studioSessionId=""
      isStarterOrAbove
      notify={jest.fn()}
    />,
  );

  const promptInput = await screen.findByRole("textbox", { name: "Prompt input" });
  expect(promptInput.closest("[data-tour='prompt-composer']")).toHaveClass("nexus-composer");
  fireEvent.change(promptInput, {
    target: { value: "Make the shop header more playful" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send prompt" }));

  await waitFor(() => expect(generateUiDraft).toHaveBeenCalledWith("design-1", expect.objectContaining({
    workspace: "ui_creator",
    prompt: "Make the shop header more playful",
    model: "anthropic/claude-sonnet-5",
  })));
});

test("submits the UI prompt with Enter and keeps Shift+Enter for a new line", async () => {
  generateUiDraft.mockResolvedValue({
    draft: {
      draftId: "draft-1",
      document: makeDocument("draft-revision"),
      validation: { score: 88 },
      repairPasses: 0,
    },
    messages: [],
  });

  render(
    <UiCreatorWorkspace
      user={{ uid: "user-1" }}
      projectId="project-1"
      projectTitle="Test Game"
      modelVersion="gpt-5"
      studio={{ connected: false }}
      studioSessionId=""
      isStarterOrAbove
      notify={jest.fn()}
    />,
  );

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

test("serializes rapid property saves and rebases the second edit onto the latest revision", async () => {
  const first = deferred();
  const second = deferred();
  patchUiDesign
    .mockImplementationOnce(() => first.promise)
    .mockImplementationOnce(() => second.promise);

  render(
    <UiCreatorWorkspace
      user={{ uid: "user-1" }}
      projectId="project-1"
      projectTitle="Test Game"
      modelVersion="gpt-5"
      studio={{ connected: false }}
      studioSessionId=""
      isStarterOrAbove
      notify={jest.fn()}
    />,
  );

  fireEvent.click(await screen.findByRole("tab", { name: "Layers" }));
  fireEvent.click(await screen.findByRole("button", { name: "Panel Frame" }));

  const nameField = screen.getByRole("textbox", { name: "Name" });
  const widthField = screen.getByRole("spinbutton", { name: "Width" });
  fireEvent.change(nameField, { target: { value: "FastPanel" } });
  fireEvent.blur(nameField);
  fireEvent.change(widthField, { target: { value: "320" } });
  fireEvent.blur(widthField);

  await waitFor(() => expect(patchUiDesign).toHaveBeenCalledTimes(1));
  expect(patchUiDesign).toHaveBeenNthCalledWith(
    1,
    "design-1",
    "revision-1",
    [{ type: "updateNode", nodeId: "panel", patch: { name: "FastPanel" } }],
  );

  await act(async () => {
    first.resolve({ document: makeDocument("revision-2", { name: "FastPanel" }) });
    await first.promise;
  });

  await waitFor(() => expect(patchUiDesign).toHaveBeenCalledTimes(2));
  expect(patchUiDesign).toHaveBeenNthCalledWith(
    2,
    "design-1",
    "revision-2",
    [{ type: "updateNode", nodeId: "panel", patch: { props: { size: { x: { offset: 320 } } } } }],
  );

  await act(async () => {
    second.resolve({ document: makeDocument("revision-3", { name: "FastPanel", width: 320 }) });
    await second.promise;
  });

  await waitFor(() => {
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("FastPanel");
    expect(screen.getByRole("spinbutton", { name: "Width" })).toHaveValue(320);
  });
});

test("supports keyboard mode switching and persists keyboard pane resizing", async () => {
  render(
    <UiCreatorWorkspace
      user={{ uid: "user-1" }}
      projectId="project-1"
      projectTitle="Test Game"
      modelVersion="gpt-5"
      studio={{ connected: false }}
      studioSessionId=""
      isStarterOrAbove
      notify={jest.fn()}
    />,
  );

  const designTab = await screen.findByRole("tab", { name: "Design" });
  fireEvent.keyDown(designTab, { key: "ArrowRight" });
  expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tab", { name: "Preview" })).toHaveFocus();

  const separator = screen.getByRole("separator", { name: "Resize Chat and Layers panel" });
  expect(separator).toHaveAttribute("aria-valuenow", "280");
  fireEvent.keyDown(separator, { key: "ArrowRight" });
  expect(separator).toHaveAttribute("aria-valuenow", "296");
  expect(window.localStorage.getItem("nexusrbx:ui-creator-left-width")).toBe("296");

  fireEvent.doubleClick(separator);
  expect(separator).toHaveAttribute("aria-valuenow", "280");
  expect(window.localStorage.getItem("nexusrbx:ui-creator-left-width")).toBe("280");
});

test("uses focus-managed drawers and an overflow menu on compact viewports", async () => {
  window.matchMedia.mockImplementation(() => ({
    matches: true,
    media: "(max-width: 900px)",
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));

  render(
    <UiCreatorWorkspace
      user={{ uid: "user-1" }}
      projectId="project-1"
      projectTitle="Test Game"
      modelVersion="gpt-5"
      studio={{ connected: false }}
      studioSessionId=""
      isStarterOrAbove
      notify={jest.fn()}
    />,
  );

  const inspectorTrigger = await screen.findByRole("button", { name: "Open inspector" });
  expect(screen.queryByRole("dialog", { name: "Inspector" })).not.toBeInTheDocument();
  fireEvent.click(inspectorTrigger);

  const inspector = await screen.findByRole("dialog", { name: "Inspector" });
  await waitFor(() => expect(inspector).toHaveFocus());
  expect(screen.getByRole("button", { name: "More UI Creator actions" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Apply to Studio" })).toBeInTheDocument();

  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Inspector" })).not.toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("button", { name: "Open inspector" })).toHaveFocus());
});
