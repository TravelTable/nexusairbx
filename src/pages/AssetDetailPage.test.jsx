import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import AssetDetailPage from "./AssetDetailPage";
import { getAsset, getAssetPlatformContext, listStyleProfiles, publishAssetToRoblox } from "../lib/assetPlatformApi";

jest.mock("../context/BillingContext", () => {
  const billing = { user: { uid: "user-1" }, authReady: true };
  return { useBilling: () => billing };
});
jest.mock("../context/SettingsContext", () => ({
  useSettings: () => ({ settings: { robloxAssetUploadsEnabled: true } }),
}));
jest.mock("../context/RobloxConnectionContext", () => {
  const connection = {
    status: {
      connected: true,
      connection: {
        connected: true,
        selectedCreator: { type: "Group", id: "42", name: "Test Builders" },
      },
    },
  };
  return { useRobloxConnection: () => connection };
});
jest.mock("../components/assets/CanonicalAssetPreview", () => ({ asset }) => <div>{asset.name} preview</div>);
jest.mock("../components/Modal", () => ({ isOpen, title, children }) => isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null);
jest.mock("../lib/assetPlatformApi", () => ({
  archiveAsset: jest.fn(),
  attachAssetToProject: jest.fn(),
  canAssetPlatformAction: (capabilities, action) => capabilities[action] === true,
  formatAssetPlatformError: (error, fallback) => error?.message || fallback,
  getAsset: jest.fn(),
  getAssetPlatformCapabilities: (context) => context?.capabilities?.actions || {},
  getAssetPlatformContext: jest.fn(async () => ({
    context: {
      selectedProjectId: "project-1",
      selectedUniverseId: "99",
      project: { projectId: "project-1", name: "Test Game" },
      capabilities: { actions: { publish_asset_to_roblox: true } },
    },
  })),
  getAssetPack: jest.fn(),
  getRobloxUploadStatus: jest.fn(),
  implementAssetInStudio: jest.fn(),
  listStyleProfiles: jest.fn(async () => ({ styleProfiles: [] })),
  normalizeAsset: (asset) => asset,
  publishAssetToRoblox: jest.fn(),
  validateAsset: jest.fn(),
  verifyAssetInStudio: jest.fn(),
}));

const asset = {
  assetId: "asset-coin",
  name: "Gold coin",
  kind: "icon",
  lifecycle: "ready_to_publish",
  sourceProjectId: "project-1",
  universeId: "99",
  moderation: {},
  usage: {},
};

beforeEach(() => {
  jest.clearAllMocks();
  getAsset.mockResolvedValue({ asset });
  getAssetPlatformContext.mockResolvedValue({
    context: {
      selectedProjectId: "project-1",
      selectedUniverseId: "99",
      project: { projectId: "project-1", name: "Test Game" },
      capabilities: { actions: { publish_asset_to_roblox: true } },
    },
  });
  listStyleProfiles.mockResolvedValue({ styleProfiles: [] });
  publishAssetToRoblox.mockResolvedValue({ result: { asset: { ...asset, lifecycle: "publishing" } } });
});

test("requires a detailed creator review before publishing the exact canonical asset", async () => {
  render(
    <MemoryRouter initialEntries={["/assets/asset-coin"]}>
      <Routes><Route path="/assets/:assetId" element={<AssetDetailPage />} /></Routes>
    </MemoryRouter>,
  );

  const publishButtons = await screen.findAllByRole("button", { name: "Publish to Roblox" });
  fireEvent.click(publishButtons[0]);

  const dialog = screen.getByRole("dialog", { name: "Confirm Roblox publishing" });
  expect(dialog).toHaveTextContent("Gold coin");
  expect(dialog).toHaveTextContent("Test Builders (42)");
  expect(dialog).toHaveTextContent("One Roblox image upload");
  expect(dialog).toHaveTextContent("Ready for explicit approval");
  expect(publishAssetToRoblox).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Confirm upload" }));
  await waitFor(() => expect(publishAssetToRoblox).toHaveBeenCalledWith("asset-coin", {
    projectId: "project-1",
    universeId: "99",
    creatorTarget: { type: "Group", id: "42" },
  }));
});
