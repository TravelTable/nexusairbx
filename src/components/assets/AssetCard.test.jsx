import React from "react";
import { render, screen } from "@testing-library/react";
import AssetCard from "./AssetCard";

const nexusAssetId = "nexus-asset-stable-0123456789";
const robloxAssetId = "98765432109876543210";

describe("AssetCard", () => {
  test("keeps stable Nexus identity separate from the Roblox upload identity", () => {
    const { container } = render(
      <AssetCard
        asset={{
          assetId: nexusAssetId,
          robloxAssetId,
          name: "Inventory",
          lifecycle: "upload_failed",
          moderation: { state: "" },
        }}
        onRetryUpload={jest.fn()}
        onPoll={jest.fn()}
      />
    );

    expect(screen.getByText("Nexus ID")).not.toBeNull();
    expect(screen.getByText("Roblox ID")).not.toBeNull();
    expect(container.querySelector(`[title="${nexusAssetId}"]`)).not.toBeNull();
    expect(container.querySelector(`[title="${robloxAssetId}"]`)).not.toBeNull();
    expect(screen.getByRole("button", { name: "Retry upload" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Refresh status" })).toBeNull();
  });

  test("offers status polling for canonical pending moderation without exposing a manual upload URL", () => {
    render(
      <AssetCard
        asset={{
          assetId: nexusAssetId,
          robloxAssetId,
          name: "Quest log",
          lifecycle: "generated",
          moderation: { state: "pending" },
        }}
        onPoll={jest.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Refresh status" })).not.toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
