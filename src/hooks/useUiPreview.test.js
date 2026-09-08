import { act, render, waitFor } from "@testing-library/react";
import React from "react";

import useUiPreview from "./useUiPreview";
import { readUiPreview, readUiPreviewImage, requestUiPreview } from "../lib/uiPreviewApi";

// jsdom in this toolchain predates AbortSignal.prototype.throwIfAborted, which the hook uses.
if (typeof AbortSignal !== "undefined" && typeof AbortSignal.prototype.throwIfAborted !== "function") {
  AbortSignal.prototype.throwIfAborted = function throwIfAborted() {
    if (this.aborted) throw this.reason || new Error("Aborted");
  };
}

jest.mock("../lib/uiPreviewApi", () => ({
  requestUiPreview: jest.fn(),
  readUiPreview: jest.fn(),
  readUiPreviewImage: jest.fn(),
}));

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

const baseOptions = {
  designId: "design-1",
  projectId: "project-1",
  sourceRevision: "revision-1",
  snapshotId: "snapshot-1",
  stateId: "default",
  viewportId: "desktop",
};

const latest = { current: null };

function Probe(props) {
  latest.current = useUiPreview(props);
  return null;
}

function renderHook(props) {
  return render(<Probe {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  let created = 0;
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: jest.fn(() => `blob:preview-${(created += 1)}`),
  });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: jest.fn() });
  if (!global.crypto) global.crypto = {};
  if (typeof global.crypto.randomUUID !== "function") {
    global.crypto.randomUUID = () => "00000000-0000-4000-8000-000000000000";
  }
});

afterEach(() => {
  jest.useRealTimers();
});

// Drains the hook's internal `pause(180)` debounce plus any pending microtasks.
async function flush(ms = 200) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
  });
  await act(async () => { await Promise.resolve(); });
}

test("a ready job exposes the verified preview and its object URL", async () => {
  const preview = makePreview();
  requestUiPreview.mockResolvedValue({ jobId: "job-1", status: "ready", preview });
  readUiPreview.mockResolvedValue({ jobId: "job-1", status: "ready", preview });
  readUiPreviewImage.mockResolvedValue(new Blob(["png"], { type: "image/png" }));

  renderHook(baseOptions);
  expect(latest.current.status).toBe("loading");

  await flush();
  await waitFor(() => expect(latest.current.status).toBe("ready"));
  expect(latest.current.preview).toEqual(preview);
  expect(latest.current.imageUrl).toBe("blob:preview-1");
  expect(latest.current.error).toBe("");
  expect(requestUiPreview).toHaveBeenCalledWith("design-1", {
    sourceRevision: "revision-1",
    snapshotId: "snapshot-1",
    stateId: "default",
    viewportId: "desktop",
  }, expect.objectContaining({ idempotencyKey: expect.stringContaining("ui-preview-") }));
});

test("a slow response for an older identity cannot overwrite the newer one", async () => {
  const oldPreview = makePreview({ stateId: "shop-open", stateLabel: "Shop open", imageHash: "old-hash" });
  const newPreview = makePreview({ stateId: "error", stateLabel: "Error", imageHash: "new-hash" });
  let resolveOld;
  const oldImage = new Promise((resolve) => { resolveOld = resolve; });

  requestUiPreview.mockImplementation((designId, references) => Promise.resolve({
    jobId: `job-${references.stateId}`,
    status: "ready",
    preview: references.stateId === "shop-open" ? oldPreview : newPreview,
  }));
  readUiPreviewImage.mockImplementation((designId, jobId, imageHash) => (imageHash === "old-hash"
    ? oldImage
    : Promise.resolve(new Blob(["new"], { type: "image/png" }))));

  const view = renderHook({ ...baseOptions, stateId: "shop-open" });
  await flush();

  view.rerender(<Probe {...baseOptions} stateId="error" />);
  await flush();
  await waitFor(() => expect(latest.current.status).toBe("ready"));
  expect(latest.current.preview.stateId).toBe("error");
  const settledUrl = latest.current.imageUrl;

  // The stale request only now finishes; it must not become the visible preview.
  await act(async () => {
    resolveOld(new Blob(["old"], { type: "image/png" }));
    await Promise.resolve();
  });

  expect(latest.current.preview.stateId).toBe("error");
  expect(latest.current.imageUrl).toBe(settledUrl);
});

test("a slow response for an older project cannot overwrite the newer project", async () => {
  const oldPreview = makePreview({ projectId: "project-1", imageHash: "old-hash" });
  const newPreview = makePreview({ projectId: "project-2", imageHash: "new-hash" });
  let resolveOld;
  const oldImage = new Promise((resolve) => { resolveOld = resolve; });

  requestUiPreview.mockResolvedValue({ jobId: "job-1", status: "ready", preview: oldPreview });
  readUiPreviewImage.mockImplementation((designId, jobId, imageHash) => (imageHash === "old-hash"
    ? oldImage
    : Promise.resolve(new Blob(["new"], { type: "image/png" }))));

  const view = renderHook(baseOptions);
  await flush();

  requestUiPreview.mockResolvedValue({ jobId: "job-2", status: "ready", preview: newPreview });
  view.rerender(<Probe {...baseOptions} projectId="project-2" />);
  await flush();
  await waitFor(() => expect(latest.current.status).toBe("ready"));
  expect(latest.current.preview.projectId).toBe("project-2");

  await act(async () => {
    resolveOld(new Blob(["old"], { type: "image/png" }));
    await Promise.resolve();
  });

  expect(latest.current.preview.projectId).toBe("project-2");
});

test("status is waiting_capture until a snapshot exists", async () => {
  renderHook({ ...baseOptions, snapshotId: null });
  await flush();
  expect(latest.current.status).toBe("waiting_capture");
  expect(latest.current.imageUrl).toBe("");
  expect(requestUiPreview).not.toHaveBeenCalled();
});

test("a failed job surfaces an error message and a callable retry", async () => {
  requestUiPreview.mockResolvedValue({ jobId: "job-1", status: "queued" });
  readUiPreview.mockResolvedValue({ jobId: "job-1", status: "failed", message: "The renderer crashed." });

  renderHook(baseOptions);
  await flush(1200);
  await waitFor(() => expect(latest.current.status).toBe("error"));
  expect(latest.current.error).toBe("The renderer crashed.");

  requestUiPreview.mockClear();
  act(() => { latest.current.retry(); });
  await flush(1200);
  expect(requestUiPreview).toHaveBeenCalled();
});

test("switching identity revokes the previous object URL", async () => {
  requestUiPreview.mockImplementation((designId, references) => Promise.resolve({
    jobId: `job-${references.viewportId}`,
    status: "ready",
    preview: makePreview({ viewportId: references.viewportId }),
  }));
  readUiPreviewImage.mockResolvedValue(new Blob(["png"], { type: "image/png" }));

  const view = renderHook(baseOptions);
  await flush();
  await waitFor(() => expect(latest.current.imageUrl).toBe("blob:preview-1"));

  view.rerender(<Probe {...baseOptions} viewportId="phone" />);
  await flush();
  await waitFor(() => expect(latest.current.imageUrl).toBe("blob:preview-2"));
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");
});
