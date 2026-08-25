import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RobloxAssetTray from "./RobloxAssetTray";

const attachedAsset = {
  assetId: "9001",
  name: "Inventory decal",
  assetType: "Decal",
  thumbnailUrl: "/api/roblox/thumbnail?assetId=9001&size=420x420",
  openUrl: "https://create.roblox.com/store/asset/9001",
};

describe("RobloxAssetTray", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  test("renders an explicit no-chat state", () => {
    render(<RobloxAssetTray />);

    expect(screen.getByText("No active chat")).toBeTruthy();
    expect(screen.getByText(/Start or open a chat/i)).toBeTruthy();
  });

  test("renders loading, empty, and retryable error states", () => {
    const onRefresh = jest.fn();
    const { rerender } = render(
      <RobloxAssetTray projectId="chat-1" loading onRefresh={onRefresh} />
    );

    expect(screen.getByText("Loading attached assets…")).toBeTruthy();

    rerender(<RobloxAssetTray projectId="chat-1" onRefresh={onRefresh} />);
    expect(screen.getByText("No Roblox assets attached yet")).toBeTruthy();

    rerender(
      <RobloxAssetTray
        projectId="chat-1"
        error={Object.assign(new Error("Asset access denied"), { requestId: "req-1" })}
        onRefresh={onRefresh}
      />
    );
    expect(screen.getByRole("alert").textContent).toContain("Support ID: req-1");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  test("shows controller-provided attachments and copies the Roblox URI", async () => {
    render(
      <RobloxAssetTray
        projectId="chat-1"
        assets={[attachedAsset]}
        robloxConnected
      />
    );

    expect(screen.getByText("Inventory decal")).toBeTruthy();
    expect(screen.getByText("Decal · 9001")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Inventory decal on Roblox" }).getAttribute("href"))
      .toBe("https://create.roblox.com/store/asset/9001");

    fireEvent.click(screen.getByRole("button", { name: "Copy Inventory decal Roblox asset URI" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("rbxassetid://9001"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Inventory decal Roblox asset URI copied" })).toBeTruthy());
  });

  test("requires an inline confirmation before removing an attachment", async () => {
    const onRemove = jest.fn().mockResolvedValue({ assets: [] });
    const notify = jest.fn();
    render(
      <RobloxAssetTray
        projectId="chat-1"
        assets={[attachedAsset]}
        onRemove={onRemove}
        notify={notify}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Inventory decal from this chat" }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirm removing Inventory decal" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Confirm removing Inventory decal" }));
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith("9001"));
    expect(notify).toHaveBeenCalledWith({ type: "success", message: "Inventory decal removed from this chat" });
  });

  test("keeps attachments visible while Roblox is disconnected", () => {
    render(<RobloxAssetTray projectId="chat-1" assets={[attachedAsset]} robloxConnected={false} />);

    expect(screen.getByText("Inventory decal")).toBeTruthy();
    expect(screen.getByText(/These assets remain attached/i)).toBeTruthy();
  });
});
