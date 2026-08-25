import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CanonicalAssetTray from "./CanonicalAssetTray";

jest.mock("../../../lib/assetPlatformApi", () => ({
  ASSET_PLATFORM_READS_ENABLED: false,
  formatAssetPlatformError: jest.fn((error, fallback) => error?.summary || error?.message || fallback),
  getRobloxUploadStatus: jest.fn(),
  listAssets: jest.fn(),
  publishAssetToRoblox: jest.fn(),
}));

jest.mock("../../assets/CanonicalAssetPreview", () => function CanonicalAssetPreview({ asset, alt }) {
  return <div aria-label={alt}>{asset.assetId}</div>;
});

const {
  getRobloxUploadStatus,
  listAssets,
  publishAssetToRoblox,
} = require("../../../lib/assetPlatformApi");

describe("CanonicalAssetTray", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("does not request canonical assets when the feature is disabled", () => {
    render(<CanonicalAssetTray projectId="project-1" enabled={false} />);
    expect(listAssets).not.toHaveBeenCalled();
    expect(screen.queryByText("Generated Nexus assets")).toBeNull();
  });

  test("loads canonical assets with the real project identifier", async () => {
    listAssets.mockResolvedValue({
      assets: [
        { assetId: "asset_coin", name: "Coin icon", kind: "icon", lifecycle: "ready_to_publish" },
        { assetId: "asset_banner", name: "Shop banner", kind: "banner", lifecycle: "roblox_processing", robloxOperationId: "op_1" },
      ],
    });

    render(
      <CanonicalAssetTray
        projectId="project-1"
        enabled
        robloxConnected
        uploadAvailable
        assetUploadsEnabled={false}
        selectedCreator={{ type: "User", id: "123" }}
      />
    );

    expect(await screen.findByText("Coin icon")).toBeTruthy();
    expect(listAssets).toHaveBeenCalledWith({
      scope: "project",
      projectId: "project-1",
      sort: "updated_desc",
      limit: 8,
    });
    expect(screen.getByRole("button", { name: "Retry upload" }).disabled).toBe(true);
    expect(screen.getByText(/Auto Upload Assets is off/i)).toBeTruthy();
  });

  test("publishes eligible generated assets to the selected creator", async () => {
    const notify = jest.fn();
    listAssets.mockResolvedValue({ assets: [{ assetId: "asset_coin", name: "Coin icon", lifecycle: "ready_to_publish" }] });
    publishAssetToRoblox.mockResolvedValue({ assetId: "asset_coin", lifecycle: "publishing" });

    render(
      <CanonicalAssetTray
        projectId="project-1"
        enabled
        robloxConnected
        uploadAvailable
        assetUploadsEnabled
        selectedCreator={{ type: "group", id: "42" }}
        notify={notify}
      />
    );

    const publishButton = await screen.findByRole("button", { name: "Retry upload" });
    await waitFor(() => expect(publishButton.disabled).toBe(false));
    fireEvent.click(publishButton);

    await waitFor(() => expect(publishAssetToRoblox).toHaveBeenCalledWith("asset_coin", {
      projectId: "project-1",
      creatorTarget: { type: "Group", id: "42" },
    }));
    expect(notify).toHaveBeenCalledWith({ type: "success", message: "Roblox publishing started" });
  });

  test("polls pending operations without requiring write consent", async () => {
    listAssets.mockResolvedValue({ assets: [{ assetId: "asset_banner", name: "Shop banner", lifecycle: "under_moderation", robloxOperationId: "op_1" }] });
    getRobloxUploadStatus.mockResolvedValue({ assetId: "asset_banner", lifecycle: "under_moderation" });

    render(<CanonicalAssetTray projectId="project-1" enabled assetUploadsEnabled={false} />);

    const pollButton = await screen.findByRole("button", { name: "Poll" });
    await waitFor(() => expect(pollButton.disabled).toBe(false));
    fireEvent.click(pollButton);

    await waitFor(() => expect(getRobloxUploadStatus).toHaveBeenCalledWith("asset_banner", {
      projectId: "project-1",
      operationId: "op_1",
    }));
  });
});
