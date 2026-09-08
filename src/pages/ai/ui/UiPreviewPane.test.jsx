import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";

import UiPreviewPane from "./UiPreviewPane";
import useUiPreview from "../../../hooks/useUiPreview";

jest.mock("../../../hooks/useUiPreview", () => jest.fn());

const capture = {
  snapshotId: "snap-1",
  captureKind: "studio_edit",
  sourceRevision: "revision-1",
  rootPath: "StarterGui/NexusRBX_UI/UI_design1",
  treeHash: "tree-1",
  nodeCount: 3,
  complete: true,
  warnings: [],
};
const viewports = [
  { id: "desktop", label: "Desktop", width: 1280, height: 720 },
  { id: "phone", label: "Phone portrait", width: 390, height: 844 },
];
const states = [
  { id: "default", label: "Default", stale: false },
  { id: "shop-open", label: "Shop open", stale: false },
  { id: "old", label: "Old state", stale: true },
];
const capabilities = { previewEnabled: true, rendererAvailable: true };

const waiting = { status: "waiting_capture", preview: null, imageUrl: "", error: "", retry: jest.fn() };
const ready = {
  status: "ready",
  imageUrl: "blob:preview",
  error: "",
  retry: jest.fn(),
  preview: {
    snapshotId: "snap-1",
    stateLabel: "Default",
    viewport: { width: 1280, height: 720 },
    rendererBackend: "public",
    imageHash: "hash-1",
    viewportId: "desktop",
    captureKind: "studio_edit",
    warnings: [{ nodeId: "n1", code: "font", message: "Font approximated." }, { nodeId: "n2", code: "gradient", message: "Gradient flattened." }],
  },
};

const baseProps = {
  designId: "design-1",
  projectId: "project-1",
  sourceRevision: "revision-1",
  capture,
  states,
  viewports,
  capabilities,
  studioConnected: true,
  hasNodes: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  useUiPreview.mockReturnValue(waiting);
});

test("connect state when Studio is not bound and nothing has been captured", () => {
  render(<UiPreviewPane {...baseProps} capture={null} studioConnected={false} />);
  expect(screen.getByText("Open your bound place in Roblox Studio to start")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Studio not connected");
  expect(screen.queryByRole("button", { name: "Apply to Studio" })).not.toBeInTheDocument();
});

test("empty state before the first generation", () => {
  render(<UiPreviewPane {...baseProps} capture={null} hasNodes={false} />);
  expect(screen.getByText("Describe the UI you want")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("No UI yet");
});

test("blocked state offers the one action that fixes it and stays blocked while Studio approval is pending", () => {
  const onApplyToStudio = jest.fn();
  const onRefreshCapture = jest.fn();
  const { rerender } = render(<UiPreviewPane {...baseProps} capture={{ ...capture, sourceRevision: "revision-0" }} onApplyToStudio={onApplyToStudio} onRefreshCapture={onRefreshCapture} />);

  expect(screen.getByText("This revision is not in Studio yet")).toBeInTheDocument();
  const body = screen.getByText("This revision is not in Studio yet").closest(".nx-ui-preview__empty");
  fireEvent.click(within(body).getByRole("button", { name: "Apply to Studio" }));
  expect(onApplyToStudio).toHaveBeenCalledTimes(1);
  fireEvent.click(within(body).getByRole("button", { name: "Sync Studio" }));
  expect(onRefreshCapture).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("combobox", { name: "Preview state" })).toBeDisabled();

  rerender(<UiPreviewPane {...baseProps} capture={{ ...capture, sourceRevision: "revision-0" }} onApplyToStudio={onApplyToStudio} pendingStudioCommand={{ commandId: "c1" }} />);
  expect(screen.getByText("Studio has not approved the last apply")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Apply to Studio" })).not.toBeInTheDocument();
});

test("ready state shows the image, hosted provenance, non-stale state chips, and warnings; nothing is editable", () => {
  useUiPreview.mockReturnValue(ready);
  const { container } = render(<UiPreviewPane {...baseProps} />);

  const image = screen.getByRole("img", { name: "Default state of the captured Roblox UI" });
  expect(image).toHaveAttribute("src", "blob:preview");
  expect(image).toHaveAttribute("draggable", "false");
  expect(screen.getByRole("status")).toHaveTextContent("Studio edit snapshot · rev revision · hosted render");
  expect(screen.getByRole("button", { name: "Shop open" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Old state" })).not.toBeInTheDocument();
  expect(screen.getByText("1 saved state needs rebuilding for the current revision.")).toBeInTheDocument();
  expect(screen.getByText("State previews do not click Roblox buttons or change Studio.")).toBeInTheDocument();
  expect(screen.getByText("2 preview limitations")).toBeInTheDocument();
  expect(container.querySelectorAll("input, textarea, [contenteditable]")).toHaveLength(0);
});

test("state selection only changes the requested image, scoped to the current capture", () => {
  useUiPreview.mockReturnValue(ready);
  render(<UiPreviewPane {...baseProps} />);

  fireEvent.click(screen.getByRole("button", { name: "Shop open" }));
  expect(useUiPreview).toHaveBeenLastCalledWith(expect.objectContaining({ snapshotId: "snap-1", stateId: "shop-open", viewportId: "desktop" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Preview viewport" }), { target: { value: "phone" } });
  expect(useUiPreview).toHaveBeenLastCalledWith(expect.objectContaining({ stateId: "shop-open", viewportId: "phone" }));
});

test("a live run shows one status line and reports the render outcome for the current capture only", () => {
  const onRenderStatus = jest.fn();
  const { rerender } = render(<UiPreviewPane {...baseProps} run={{ stage: "Rendering preview..." }} onRenderStatus={onRenderStatus} />);

  const [statusLine, body] = screen.getAllByRole("status");
  expect(statusLine).toHaveTextContent("Rendering preview...");
  expect(body).toHaveTextContent("Rendering preview...");
  expect(screen.queryByTestId("live-work-stream")).not.toBeInTheDocument();
  expect(onRenderStatus).toHaveBeenLastCalledWith(expect.objectContaining({ status: "waiting_capture", snapshotId: "snap-1", sourceRevision: "revision-1" }));

  useUiPreview.mockReturnValue(ready);
  rerender(<UiPreviewPane {...baseProps} run={{ stage: "Rendering preview..." }} onRenderStatus={onRenderStatus} />);
  expect(onRenderStatus).toHaveBeenLastCalledWith(expect.objectContaining({ status: "ready", preview: ready.preview }));

  onRenderStatus.mockClear();
  rerender(<UiPreviewPane {...baseProps} capture={{ ...capture, sourceRevision: "revision-0" }} onRenderStatus={onRenderStatus} />);
  expect(onRenderStatus).not.toHaveBeenCalled();
});

test("renderer unavailable explains itself instead of spinning", () => {
  render(<UiPreviewPane {...baseProps} capabilities={{ previewEnabled: false, rendererAvailable: false, captureUnavailableReason: "Renderer offline." }} />);
  expect(screen.getByText("No preview image right now")).toBeInTheDocument();
  expect(screen.getByText(/Renderer offline\./)).toBeInTheDocument();
  expect(useUiPreview).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
});
