import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AssetCard from "./AssetCard";

jest.mock("./CanonicalAssetPreview", () => ({ asset }) => <div data-testid="private-preview">{asset.assetId}</div>);

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

  test("announces successful Roblox ID copying", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<AssetCard asset={{ assetId: nexusAssetId, robloxAssetId, lifecycle: "ready" }} />);
    fireEvent.click(screen.getByRole("button", { name: `Copy Roblox asset ID ${robloxAssetId}` }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(robloxAssetId));
    await waitFor(() => expect(screen.queryByText("Roblox asset ID copied.")).not.toBeNull());
  });
});
