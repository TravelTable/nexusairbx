import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import ExportActions from "./ExportActions";
import { getStudioStatus } from "../../../lib/studioBridgeApi";
import { buildPlacementZip } from "../../../lib/rojoExport";

jest.mock("../../../lib/studioBridgeApi", () => ({
  getStudioStatus: jest.fn(),
  getStudioCommand: jest.fn(),
  applyArtifactToStudio: jest.fn(),
}));
jest.mock("../../../lib/rojoExport", () => ({
  buildPlacementZip: jest.fn(),
  buildRojoZip: jest.fn(),
  buildStudioLoader: jest.fn(),
  safeProjectName: jest.fn(() => "sample-project"),
}));
jest.mock("../../../lib/artifactState", () => ({ buildBaseArtifactSnapshot: jest.fn() }));
jest.mock("../../../lib/workflowApi", () => ({ verifyRobloxReadiness: jest.fn() }));
jest.mock("../../../lib/productAnalytics", () => ({ trackProductEvent: jest.fn() }));

const artifact = {
  artifactId: "artifact_export_only",
  title: "Sample Project",
  files: [{
    name: "Main",
    path: "ServerScriptService/Main",
    placement: "ServerScriptService",
    kind: "server",
    content: "return true",
  }],
};

describe("ExportActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getStudioStatus.mockResolvedValue({ sessions: [] });
  });

  test("makes the placement-aware Project ZIP available without a live Studio session", async () => {
    render(<ExportActions artifact={artifact} activeFile={artifact.files[0]} notify={jest.fn()} />);

    await waitFor(() => expect(getStudioStatus).toHaveBeenCalled());
    expect(screen.getByText("Export only")).toBeTruthy();
    expect(screen.getByRole("button", { name: /project zip/i })).toBeEnabled();
    expect(screen.getByText("Project ZIP includes Studio placement steps")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /push to studio/i })).toBeNull();
    expect(buildPlacementZip).not.toHaveBeenCalled();
  });
});
