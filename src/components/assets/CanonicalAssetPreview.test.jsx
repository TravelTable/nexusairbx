import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import CanonicalAssetPreview from "./CanonicalAssetPreview";
import { getAssetFileBlob } from "../../lib/assetPlatformApi";

jest.mock("../../lib/assetPlatformApi", () => ({ getAssetFileBlob: jest.fn() }));

describe("CanonicalAssetPreview", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: jest.fn(() => "blob:private-preview") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: jest.fn() });
  });

  afterEach(() => jest.clearAllMocks());

  test("renders an authenticated private blob instead of record URLs and revokes it", async () => {
    getAssetFileBlob.mockResolvedValue(new Blob(["preview"], { type: "image/png" }));
    const { container, unmount } = render(
      <CanonicalAssetPreview asset={{
        assetId: "asset_one",
        name: "Sword",
        sourceProjectId: "project_one",
        universeId: "universe_one",
        previewUrl: "https://private.example/should-not-render.png",
      }} />
    );

    const image = await screen.findByRole("img", { name: "Sword preview" });
    expect(image.getAttribute("src")).toBe("blob:private-preview");
    expect(container.innerHTML).not.toContain("private.example");
    expect(getAssetFileBlob).toHaveBeenCalledWith("asset_one", "preview", expect.objectContaining({
      projectId: "project_one",
      universeId: "universe_one",
    }));

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:private-preview");
  });

  test("exposes a useful accessible failure state", async () => {
    getAssetFileBlob.mockRejectedValue(new Error("no preview"));
    render(<CanonicalAssetPreview asset={{ assetId: "asset_one", name: "Sword" }} />);

    await waitFor(() => expect(screen.getByRole("img", { name: "Asset preview is unavailable" })).not.toBeNull());
    expect(screen.getByText("Preview unavailable")).not.toBeNull();
  });
});
