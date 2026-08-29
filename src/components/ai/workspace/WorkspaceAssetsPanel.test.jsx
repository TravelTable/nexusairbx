import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import WorkspaceAssetsPanel from "./WorkspaceAssetsPanel";

jest.mock("../../../lib/assetPlatformApi", () => ({
  ASSET_PLATFORM_READS_ENABLED: false,
}));

jest.mock("./RobloxAssetTray", () => function RobloxAssetTray(props) {
  return (
    <div data-testid="attached-tray">
      <span>{props.projectId}</span>
      <span>{props.assets.map((asset) => asset.name).join(",")}</span>
      <button type="button" onClick={props.onRefresh}>Refresh attached mock</button>
      <button type="button" onClick={() => props.onRemove?.("9001")}>Remove attached mock</button>
    </div>
  );
});

jest.mock("./CanonicalAssetTray", () => function CanonicalAssetTray(props) {
  return <div data-testid="canonical-tray">{props.projectId}:{String(props.enabled)}</div>;
});

jest.mock("./RobloxDecalUploadDropdown", () => function RobloxDecalUploadDropdown(props) {
  return (
    <div>
      <span data-testid="upload-project-id">{props.projectId}</span>
      <button type="button" onClick={props.onAttached}>Finish upload mock</button>
    </div>
  );
});

jest.mock("../../assets/CreatorStoreSearch", () => function CreatorStoreSearch(props) {
  const MockReact = require("react");
  const [query, setQuery] = MockReact.useState("");
  return (
    <div>
      <span data-testid="store-project-id">{props.projectId}</span>
      <input aria-label="Store state" value={query} onChange={(event) => setQuery(event.target.value)} />
      <button type="button" onClick={() => props.onAttachAsset?.([{ assetId: "123" }])}>Attach store mock</button>
    </div>
  );
});

jest.mock("../../assets/ModelFilePipelinePanel", () => function ModelFilePipelinePanel() {
  const MockReact = require("react");
  const [name, setName] = MockReact.useState("");
  return <input aria-label="GLB state" value={name} onChange={(event) => setName(event.target.value)} />;
});

function renderPanel(overrides = {}) {
  const props = {
    user: { uid: "user-1" },
    roblox: { connected: true },
    attachmentProjectId: "chat-123",
    canonicalProjectId: "project-789",
    attachedAssets: [{ assetId: "9001", name: "Inventory decal" }],
    onRefreshAttachedAssets: jest.fn(),
    onAttachAssets: jest.fn(),
    onRemoveAttachedAsset: jest.fn(),
    canonicalAssetsEnabled: true,
    ...overrides,
  };
  return { ...render(<WorkspaceAssetsPanel {...props} />), props };
}

describe("WorkspaceAssetsPanel", () => {
  test("keeps attachment and canonical project identifiers separate", () => {
    const { props } = renderPanel();

    expect(screen.getByTestId("upload-project-id").textContent).toBe("chat-123");
    expect(screen.getByTestId("attached-tray").textContent).toContain("chat-123");
    expect(screen.getByTestId("attached-tray").textContent).toContain("Inventory decal");
    expect(screen.getByTestId("canonical-tray").textContent).toBe("project-789:true");

    fireEvent.click(screen.getByRole("button", { name: "Finish upload mock" }));
    expect(props.onRefreshAttachedAssets).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Remove attached mock" }));
    expect(props.onRemoveAttachedAsset).toHaveBeenCalledWith("9001");
  });

  test("passes the chat attachment contract into Creator Store", () => {
    const { props } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Browse" }));

    expect(screen.getByTestId("store-project-id").textContent).toBe("chat-123");
    fireEvent.click(screen.getByRole("button", { name: "Attach store mock" }));
    expect(props.onAttachAssets).toHaveBeenCalledWith([{ assetId: "123" }]);
  });

  test("preserves Store and GLB state while switching views", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Browse" }));
    fireEvent.change(screen.getByLabelText("Store state"), { target: { value: "tree" } });
    fireEvent.click(screen.getByRole("button", { name: "Import 3D" }));
    fireEvent.change(screen.getByLabelText("GLB state"), { target: { value: "castle.glb" } });
    fireEvent.click(screen.getByRole("button", { name: "Project" }));
    fireEvent.click(screen.getByRole("button", { name: "Browse" }));
    expect(screen.getByLabelText("Store state").value).toBe("tree");
    fireEvent.click(screen.getByRole("button", { name: "Import 3D" }));
    expect(screen.getByLabelText("GLB state").value).toBe("castle.glb");
  });
});
