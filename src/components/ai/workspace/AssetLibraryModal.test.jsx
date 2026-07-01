import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AssetLibraryModal from "./AssetLibraryModal";
import {
  getRobloxAsset,
  getRobloxAssetPreview,
  listRobloxAssets,
} from "../../../lib/robloxAssetLibraryApi";
import { beginCreatorStoreReauthorization } from "../../../lib/robloxOAuthApi";

jest.mock("../../../lib/robloxAssetLibraryApi", () => ({
  getRobloxAsset: jest.fn(),
  getRobloxAssetPreview: jest.fn(),
  listRobloxAssets: jest.fn(),
}));

jest.mock("../../../lib/robloxOAuthApi", () => {
  const actual = jest.requireActual("../../../lib/robloxOAuthApi");
  return {
    ...actual,
    beginCreatorStoreReauthorization: jest.fn(),
  };
});

const asset = {
  assetId: "123",
  name: "Low Poly Tree",
  assetType: "Model",
  creator: { id: "99", name: "Builder", type: "User" },
  thumbnailUrl: "/api/roblox/thumbnail?assetId=123",
  availabilityStatus: "available",
  moderationStatus: "unknown",
  canSelect: true,
  previewCapabilities: {
    renderer: "model_fallback",
    reason: "Raw Roblox geometry is not available.",
  },
};

const authorizedRobloxStatus = {
  connected: true,
  connection: { profile: { preferred_username: "Builder" } },
  capabilities: {
    granted: [{ id: "roblox_search_creator_store", available: true, missingScopes: [] }],
    missing: [],
  },
};

const coreOnlyRobloxStatus = {
  connected: true,
  connection: { profile: { preferred_username: "Builder" } },
  capabilities: {
    granted: [{ id: "roblox_upload_asset", available: true, missingScopes: [] }],
    missing: [{ id: "roblox_search_creator_store", available: false, missingScopes: ["creator-store-product:read"] }],
  },
};

describe("AssetLibraryModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listRobloxAssets.mockResolvedValue({
      assets: [asset],
      nextCursor: null,
      sources: [
        { id: "my", label: "My Assets", authorized: true },
        { id: "selected", label: "Selected", authorized: true },
      ],
    });
    getRobloxAsset.mockResolvedValue({ asset });
    getRobloxAssetPreview.mockResolvedValue({
      preview: asset.previewCapabilities,
      metadata: { name: asset.name },
    });
    beginCreatorStoreReauthorization.mockResolvedValue({});
  });

  test("previews separately from selection and confirms selected assets", async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(
      <AssetLibraryModal
        open
        onClose={jest.fn()}
        projectId="chat_1"
        robloxStatus={authorizedRobloxStatus}
        robloxIdentity={{ profile: { preferred_username: "Builder" } }}
        destination={{ type: "User", id: "99" }}
        persistedAssets={[]}
        onConfirm={onConfirm}
      />
    );

    expect(await screen.findByText("Low Poly Tree")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Preview Low Poly Tree" }));
    await waitFor(() => expect(getRobloxAssetPreview).toHaveBeenCalledWith("123"));
    expect(await screen.findByText("3D preview fallback")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Select Low Poly Tree" }));
    expect(screen.getByText("1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Add Selected Assets" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith([expect.objectContaining({ assetId: "123" })]));
  });

  test("escape closes the modal", async () => {
    const onClose = jest.fn();
    render(
      <AssetLibraryModal
        open
        onClose={onClose}
        projectId="chat_1"
        robloxStatus={authorizedRobloxStatus}
        persistedAssets={[]}
        onConfirm={jest.fn()}
      />
    );

    expect(await screen.findByText("Low Poly Tree")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  test("does not fetch remote assets without Creator Store read authorization", async () => {
    render(
      <AssetLibraryModal
        open
        onClose={jest.fn()}
        projectId="chat_1"
        robloxStatus={coreOnlyRobloxStatus}
        persistedAssets={[]}
        onConfirm={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Reauthorize Roblox to grant Creator Store read access/i)).toBeTruthy();
    });
    expect(listRobloxAssets).not.toHaveBeenCalled();
  });

  test("shows reauthorize action and starts creator store reauth", async () => {
    render(
      <AssetLibraryModal
        open
        onClose={jest.fn()}
        projectId="chat_1"
        robloxStatus={coreOnlyRobloxStatus}
        persistedAssets={[]}
        onConfirm={jest.fn()}
      />
    );

    const reauthorizeButton = await screen.findByRole("button", { name: "Reauthorize Roblox" });
    fireEvent.click(reauthorizeButton);
    expect(beginCreatorStoreReauthorization).toHaveBeenCalledWith("/ai");
  });

  test("skips preview API calls without Creator Store read authorization", async () => {
    render(
      <AssetLibraryModal
        open
        onClose={jest.fn()}
        projectId="chat_1"
        robloxStatus={coreOnlyRobloxStatus}
        persistedAssets={[asset]}
        onConfirm={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Project Assets" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview Low Poly Tree" }));

    await waitFor(() => expect(getRobloxAsset).not.toHaveBeenCalled());
    expect(getRobloxAssetPreview).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Reauthorize Roblox to grant Creator Store read access/i).length).toBeGreaterThan(0);
  });
});
