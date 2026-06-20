import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AssetLibraryModal from "./AssetLibraryModal";
import {
  getRobloxAsset,
  getRobloxAssetPreview,
  listRobloxAssets,
} from "../../../lib/robloxAssetLibraryApi";

jest.mock("../../../lib/robloxAssetLibraryApi", () => ({
  getRobloxAsset: jest.fn(),
  getRobloxAssetPreview: jest.fn(),
  listRobloxAssets: jest.fn(),
}));

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
  });

  test("previews separately from selection and confirms selected assets", async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(
      <AssetLibraryModal
        open
        onClose={jest.fn()}
        projectId="chat_1"
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
        persistedAssets={[]}
        onConfirm={jest.fn()}
      />
    );

    expect(await screen.findByText("Low Poly Tree")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
