import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ModelFilePipelinePanel from "./ModelFilePipelinePanel";
import * as api from "../../lib/modelPipelineApi";

jest.mock("../../lib/modelPipelineApi");

const mockBillingUser = { uid: "test-user" };
jest.mock("../../context/BillingContext", () => ({
  useBilling: () => ({ authReady: true, user: mockBillingUser }),
}));

function file(name, size, type = "model/gltf-binary") {
  return new File([new Uint8Array(size)], name, { type });
}

beforeEach(() => {
  jest.resetAllMocks();
  api.getModelFileRules.mockResolvedValue({ limits: { maxBytes: 10 } });
  api.listModelFiles.mockResolvedValue({ items: [] });
});

test("rejects non-GLB files before creating upload sessions", async () => {
  render(<ModelFilePipelinePanel />);
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [file("tree.txt", 4, "text/plain")] } });
  expect(await screen.findByText("Choose a .glb file.")).toBeInTheDocument();
  expect(api.createModelUploadSession).not.toHaveBeenCalled();
});

test("rejects files above the server-advertised size limit", async () => {
  render(<ModelFilePipelinePanel />);
  await waitFor(() => expect(api.getModelFileRules).toHaveBeenCalled());
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [file("tree.glb", 11)] } });
  expect(await screen.findByText("File is larger than 10 B.")).toBeInTheDocument();
  expect(api.createModelUploadSession).not.toHaveBeenCalled();
});

test("shows actual upload progress and completion state", async () => {
  api.createModelUploadSession.mockResolvedValue({ modelFileId: "mf_1", upload: { method: "PUT", url: "https://signed" } });
  let resolveUpload;
  api.uploadModelFileToSignedUrl.mockImplementation(async (_file, _upload, onProgress) => {
    onProgress({ loaded: 5, total: 10 });
    return new Promise((resolve) => {
      resolveUpload = resolve;
    });
  });
  api.completeModelUpload.mockResolvedValue({ status: "queued" });
  api.listModelFiles.mockResolvedValueOnce({ items: [] }).mockResolvedValue({ items: [{ id: "mf_1", status: "queued" }] });

  render(<ModelFilePipelinePanel />);
  await waitFor(() => expect(api.getModelFileRules).toHaveBeenCalled());
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [file("tree.glb", 10)] } });

  expect(await screen.findByText("5 B / 10 B")).toBeInTheDocument();
  resolveUpload();
  await waitFor(() => expect(api.completeModelUpload).toHaveBeenCalledWith("mf_1"));
});

test("shows retryable database busy state without retrying before cooldown", async () => {
  api.listModelFiles
    .mockRejectedValueOnce(Object.assign(new Error("Database temporarily unavailable"), {
      status: 503,
      retryable: true,
      retryAfterMs: 60000,
    }))
    .mockResolvedValue({ items: [] });

  render(<ModelFilePipelinePanel />);

  expect(await screen.findByText("Database is temporarily busy. Retry in a moment.")).toBeInTheDocument();
  const retryButton = screen.getByRole("button", { name: /retry in 60s/i });
  expect(retryButton).toBeDisabled();
  expect(screen.getByRole("button", { name: "Refresh model files" })).toBeDisabled();
  fireEvent.click(retryButton);

  expect(api.listModelFiles).toHaveBeenCalledTimes(1);
});

test("backs off when derivative listing hits a retryable database error", async () => {
  api.listModelFiles.mockResolvedValue({
    items: [{ id: "mf_1", status: "queued", originalFilename: "tree.glb" }],
  });
  api.listDerivatives.mockRejectedValueOnce(Object.assign(new Error("Database temporarily unavailable"), {
    status: 503,
    retryable: true,
    retryAfterMs: 60000,
  }));

  render(<ModelFilePipelinePanel />);

  expect(await screen.findByText("Database is temporarily busy. Retry in a moment.")).toBeInTheDocument();
  expect(api.listDerivatives).toHaveBeenCalledTimes(1);
  expect(api.getModelFile).not.toHaveBeenCalled();
});

test("requires explicit confirmation for aggressive derivative plans", async () => {
  api.listModelFiles.mockResolvedValue({ items: [{ id: "mf_1", status: "valid", originalFilename: "tree.glb" }] });
  api.getModelFileReport.mockResolvedValue({ report: { status: "valid", rulesVersion: "glb-validation-1", summary: {}, metrics: {}, issues: [] } });
  api.listDerivatives.mockResolvedValue({ items: [] });
  api.createOptimizationPlan.mockResolvedValue({
    planId: "plan_1",
    confirmationRequired: true,
    lossyOperations: ["resize_oversized_textures"],
    toolVersions: { optimizer: "test" },
  });

  render(<ModelFilePipelinePanel />);
  expect(await screen.findByText(/tree.glb/)).toBeInTheDocument();
  fireEvent.change(screen.getByDisplayValue("Roblox balanced"), { target: { value: "aggressive" } });
  fireEvent.click(screen.getByText("Review plan"));
  expect(await screen.findByText("Confirm aggressive lossy optimization")).toBeInTheDocument();
  expect(screen.getByText("Queue derivative")).toBeDisabled();
  fireEvent.click(screen.getByLabelText("Confirm aggressive lossy optimization"));
  expect(screen.getByText("Queue derivative")).not.toBeDisabled();
});
