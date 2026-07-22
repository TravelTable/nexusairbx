import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RobloxAssetTray from "./RobloxAssetTray";

jest.mock("../../../lib/assetPlatformApi", () => ({
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

describe("RobloxAssetTray", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loads canonical project assets and keeps Roblox writes disabled without consent", async () => {
    listAssets.mockResolvedValue({
      assets: [
        {
          assetId: "asset_coin",
          name: "Coin icon",
          kind: "icon",
          lifecycle: "ready_to_publish",
        },
        {
          assetId: "asset_banner",
          name: "Shop banner",
          kind: "banner",
          lifecycle: "roblox_processing",
          robloxOperationId: "op_1",
        },
      ],
    });

    render(
      <RobloxAssetTray
        projectId="project_1"
        robloxConnected
        uploadAvailable
        assetUploadsEnabled={false}
        selectedCreator={{ type: "User", id: "123" }}
        notify={jest.fn()}
      />
    );

    await waitFor(() => expect(screen.getByText("Coin icon")).toBeTruthy());

    expect(listAssets).toHaveBeenCalledWith({
      scope: "project",
      projectId: "project_1",
      sort: "updated_desc",
      limit: 8,
    });
    expect(screen.getByRole("button", { name: "Retry Upload" }).disabled).toBe(true);
    expect(screen.getByText("Auto Upload Assets is off. Assets stay in NexusRBX until you enable it.")).toBeTruthy();
    expect(screen.getByText("Ready to publish")).toBeTruthy();
    expect(screen.getByText("Roblox processing")).toBeTruthy();
    expect(screen.queryByText("Approve")).toBeNull();
  });

  test("publishes an eligible canonical asset to the normalized selected creator", async () => {
    const notify = jest.fn();
    listAssets.mockResolvedValue({
      assets: [{
        assetId: "asset_coin",
        name: "Coin icon",
        lifecycle: "ready_to_publish",
      }],
    });
    publishAssetToRoblox.mockResolvedValue({ assetId: "asset_coin", lifecycle: "publishing" });

    render(
      <RobloxAssetTray
        projectId="project_1"
        robloxConnected
        uploadAvailable
        assetUploadsEnabled
        selectedCreator={{ type: "group", id: "42" }}
        notify={notify}
      />
    );

    const publishButton = await screen.findByRole("button", { name: "Retry Upload" });
    await waitFor(() => expect(publishButton.disabled).toBe(false));
    fireEvent.click(publishButton);

    await waitFor(() => expect(publishAssetToRoblox).toHaveBeenCalledWith("asset_coin", {
      projectId: "project_1",
      creatorTarget: { type: "Group", id: "42" },
    }));
    expect(notify).toHaveBeenCalledWith({ type: "success", message: "Roblox publishing started" });
  });

  test("polls a pending canonical Roblox operation without requiring write consent", async () => {
    listAssets.mockResolvedValue({
      assets: [{
        assetId: "asset_banner",
        name: "Shop banner",
        lifecycle: "under_moderation",
        robloxOperationId: "op_1",
      }],
    });
    getRobloxUploadStatus.mockResolvedValue({ assetId: "asset_banner", lifecycle: "under_moderation" });

    render(
      <RobloxAssetTray
        projectId="project_1"
        assetUploadsEnabled={false}
        notify={jest.fn()}
      />
    );

    const pollButton = await screen.findByRole("button", { name: "Poll" });
    await waitFor(() => expect(pollButton.disabled).toBe(false));
    fireEvent.click(pollButton);

    await waitFor(() => expect(getRobloxUploadStatus).toHaveBeenCalledWith("asset_banner", {
      projectId: "project_1",
      operationId: "op_1",
    }));
  });
});
