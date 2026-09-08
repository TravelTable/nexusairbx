import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import UiPreviewPane from "./UiPreviewPane";
import useUiPreview from "../../../hooks/useUiPreview";

jest.mock("../../../hooks/useUiPreview", () => jest.fn());

const capture = {
  snapshotId: "snapshot-1",
  captureKind: "studio_edit",
  capturedAt: "2026-01-01T00:00:00.000Z",
  treeHash: "tree-1",
  sourceRevision: "revision-1",
  nodeCount: 12,
  complete: true,
  rootPath: "StarterGui/NexusRBX_UI/UI_design-1",
  warnings: [],
};

const viewports = [
  { id: "desktop", label: "Desktop", width: 1280, height: 720, insets: { left: 0, right: 0, top: 0, bottom: 0 }, presetVersion: 1 },
  { id: "phone", label: "Phone portrait", width: 390, height: 844, insets: { left: 0, right: 0, top: 44, bottom: 34 }, presetVersion: 1 },
];

const states = [
  { id: "default", label: "Default", version: 1, baseTreeHash: "tree-1", sourceRevision: "revision-1", stale: false },
  { id: "shop-open", label: "Shop open", version: 1, baseTreeHash: "tree-1", sourceRevision: "revision-1", stale: false },
];

function makePreview(overrides = {}) {
  return {
    projectId: "project-1",
    designId: "design-1",
    snapshotId: "snapshot-1",
    sourceRevision: "revision-1",
    treeHash: "tree-1",
    stateId: "default",
    stateLabel: "Default",
    viewportId: "desktop",
    viewport: { width: 1280, height: 720, insets: { left: 0, right: 0, top: 0, bottom: 0 } },
    rendererRevision: "renderer-1",
    fontRevision: "font-1",
    imageHash: "image-hash",
    simulated: false,
    captureKind: "studio_edit",
    capturedAt: "2026-01-01T00:00:00.000Z",
    fidelity: "approximate",
    runtimeVerified: false,
    warnings: [],
    ...overrides,
  };
}

function mockHook(result = {}) {
  useUiPreview.mockImplementation(() => ({
    status: "ready",
    preview: makePreview(),
    imageUrl: "blob:preview-1",
    error: "",
    retry: jest.fn(),
    ...result,
  }));
}

function renderPane(props = {}) {
  return render(
    <UiPreviewPane
      designId="design-1"
      projectId="project-1"
      sourceRevision="revision-1"
      capture={capture}
      states={states}
      viewports={viewports}
      {...props}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHook();
});

test("provenance reads Studio snapshot redraw for an edit capture", () => {
  renderPane();
  expect(screen.getByRole("status")).toHaveTextContent("Studio snapshot redraw · browser approximation");
});

test("provenance reads Runtime snapshot redraw for a runtime capture", () => {
  mockHook({ preview: makePreview({ captureKind: "studio_runtime" }) });
  renderPane({ capture: { ...capture, captureKind: "studio_runtime" } });
  expect(screen.getByRole("status")).toHaveTextContent("Runtime snapshot redraw");
});

test("provenance reads Simulated state for a simulated preview", () => {
  mockHook({ preview: makePreview({ simulated: true, stateId: "shop-open", stateLabel: "Shop open" }) });
  renderPane();
  expect(screen.getByRole("status")).toHaveTextContent("Simulated state");
  expect(screen.getByRole("status")).not.toHaveTextContent("Studio snapshot redraw");
});

test("with no capture it shows the capture-needed copy and disables state selection", () => {
  mockHook({ status: "waiting_capture", preview: null, imageUrl: "" });
  renderPane({ capture: null, onRefreshCapture: jest.fn() });

  expect(screen.getByRole("status")).toHaveTextContent("Capture needed");
  expect(screen.getByText("Build or sync the UI in Studio to see its preview.")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Preview state" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Sync Studio" })).toBeEnabled();
});

test("Reset preview returns the requested stateId to default", () => {
  renderPane();

  fireEvent.click(screen.getByRole("button", { name: "Shop open" }));
  expect(useUiPreview).toHaveBeenLastCalledWith(expect.objectContaining({ stateId: "shop-open" }));

  fireEvent.click(screen.getByRole("button", { name: "Reset preview" }));
  expect(useUiPreview).toHaveBeenLastCalledWith(expect.objectContaining({ stateId: "default" }));
});

test("stale states are not offered and are disclosed as needing a rebuild", () => {
  renderPane({
    states: [
      ...states,
      { id: "old-error", label: "Error (old revision)", version: 1, baseTreeHash: "tree-0", sourceRevision: "revision-0", stale: true },
    ],
  });

  expect(screen.queryByRole("button", { name: "Error (old revision)" })).not.toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "Error (old revision)" })).not.toBeInTheDocument();
  expect(screen.getByText("1 saved state needs rebuilding for the current revision.")).toBeInTheDocument();
});

test("the limitation disclosure exists and is collapsed by default", () => {
  mockHook({
    preview: makePreview({ warnings: [{ nodeId: "shop", code: "UNSUPPORTED_CLASS", message: "UISizeConstraint is not drawn." }] }),
  });
  renderPane();

  const details = screen.getByRole("group");
  expect(details.tagName).toBe("DETAILS");
  expect(details).toHaveTextContent("1 preview limitation");
  expect(details).not.toHaveAttribute("open");
});

test("the rendered image carries meaningful alt text and explicit dimensions", () => {
  mockHook({ preview: makePreview({ stateLabel: "Shop open", stateId: "shop-open" }) });
  renderPane();

  const image = screen.getByRole("img");
  expect(image.getAttribute("alt")).toBe("Shop open Roblox UI state preview");
  expect(image).toHaveAttribute("width", "1280");
  expect(image).toHaveAttribute("height", "720");
});

test("an unavailable renderer renders truthful copy and never requests a preview", () => {
  mockHook({ status: "waiting_capture", preview: null, imageUrl: "" });
  renderPane({
    capabilities: {
      previewEnabled: true,
      rendererAvailable: false,
      rendererRevision: null,
      fontRevision: null,
      studioEditCapture: true,
      studioRuntimeCapture: false,
      captureUnavailableReason: "The preview renderer is not deployed in this environment.",
    },
  });

  expect(screen.getByRole("status")).toHaveTextContent("Preview renderer unavailable");
  expect(screen.getByText(/cannot draw UI previews right now/)).toHaveTextContent(
    "The preview renderer is not deployed in this environment.",
  );
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(useUiPreview).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
});

test("the code tab renders the supplied code panel instead of preview controls", () => {
  renderPane({ codePanel: <div data-testid="code-panel" /> });

  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  expect(screen.getByTestId("code-panel")).toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "Preview viewport" })).not.toBeInTheDocument();
  expect(useUiPreview).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
});
