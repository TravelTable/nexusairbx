import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import RobloxAssetTray from "./RobloxAssetTray";

jest.mock("../../../firebase", () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue("token_1"),
    },
  },
}));

jest.mock("../../../lib/uiBuilderApi", () => ({
  approveProjectAssets: jest.fn(),
  getUiProjectState: jest.fn(),
  listUiProjectAssets: jest.fn(),
  refreshProjectAssetUploads: jest.fn(),
  uploadProjectAssetsToRoblox: jest.fn(),
}));

const {
  getUiProjectState,
  listUiProjectAssets,
} = require("../../../lib/uiBuilderApi");

describe("RobloxAssetTray", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getUiProjectState.mockResolvedValue({ state: { revision: 3 } });
  });

  test("auto upload mode hides approve and shows retry/pending states", async () => {
    listUiProjectAssets.mockResolvedValue({
      assets: [
        {
          logicalAssetId: "coin_icon",
          asset_id: "coin_icon",
          generationId: "gen_1",
          generationStatus: "ready",
          storageUrl: "https://storage.example/coin.png",
          assetKind: "icon",
          latestUpload: {
            uploadStatus: "failed",
            lastError: "Upload quota reached",
          },
        },
        {
          logicalAssetId: "shop_banner",
          asset_id: "shop_banner",
          generationId: "gen_2",
          generationStatus: "ready",
          storageUrl: "https://storage.example/banner.png",
          assetKind: "banner",
          latestUpload: {
            uploadStatus: "operation_pending",
          },
        },
      ],
    });

    render(
      <RobloxAssetTray
        projectId="project_1"
        robloxConnected
        uploadAvailable
        assetUploadsEnabled
        selectedCreator={{ type: "User", id: "123" }}
        notify={jest.fn()}
      />
    );

    await waitFor(() => expect(screen.getByText("Upload quota reached")).toBeTruthy());

    expect(screen.getByText("Retry Upload")).toBeTruthy();
    expect(screen.queryByText("Approve")).toBeNull();
    expect(screen.getByText("Poll")).toBeTruthy();
    expect(screen.getByText("upload failed; local kept")).toBeTruthy();
    expect(screen.getByText("pending")).toBeTruthy();
  });

  test("local-only mode keeps approve visible and hides retry upload", async () => {
    listUiProjectAssets.mockResolvedValue({
      assets: [
        {
          logicalAssetId: "coin_icon",
          asset_id: "coin_icon",
          generationId: "gen_1",
          generationStatus: "ready",
          storageUrl: "https://storage.example/coin.png",
          assetKind: "icon",
          approved: false,
          uploadStatus: "not_requested",
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

    await waitFor(() => expect(screen.getByText("coin icon")).toBeTruthy());

    expect(screen.getByText("Approve")).toBeTruthy();
    expect(screen.queryByText("Retry Upload")).toBeNull();
    expect(screen.getByText("local only")).toBeTruthy();
  });
});
