import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreatorStoreSearch from "./CreatorStoreSearch";
import { beginRobloxReauthorization } from "../../lib/robloxOAuthApi";
import { getCreatorStoreAsset, searchCreatorStore } from "../../lib/robloxCreatorStoreApi";

jest.mock("../../lib/robloxCreatorStoreApi", () => ({
  getCreatorStoreAsset: jest.fn(),
  searchCreatorStore: jest.fn(),
}));

jest.mock("../../lib/robloxOAuthApi", () => ({
  beginRobloxReauthorization: jest.fn(),
}));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const asset = {
  assetId: "123",
  name: "Low Poly Tree",
  description: "A stylized tree model",
  assetType: "Model",
  creator: { id: "45", name: "Builder", type: "User" },
  thumbnailUrl: "/api/roblox/thumbnail?assetId=123&size=420x420",
  source: "roblox_creator_store",
};

describe("CreatorStoreSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  test("submits search from the button and renders loading then results", async () => {
    const pending = deferred();
    searchCreatorStore.mockReturnValueOnce(pending.promise);

    render(<CreatorStoreSearch />);
    fireEvent.change(screen.getByLabelText("Search Creator Store"), { target: { value: "low poly tree" } });
    fireEvent.click(screen.getByRole("button", { name: /^Search$/ }));

    expect(screen.getByText("Searching Creator Store")).toBeTruthy();
    expect(searchCreatorStore).toHaveBeenCalledWith({
      query: "low poly tree",
      assetTypes: ["Model", "Mesh"],
      pageSize: 20,
      cursor: null,
    });

    pending.resolve({ query: "low poly tree", results: [asset], nextCursor: "next-1" });
    expect(await screen.findByText("Low Poly Tree")).toBeTruthy();
    expect(screen.getByText("Builder")).toBeTruthy();
    expect(screen.getByText("A stylized tree model")).toBeTruthy();
    expect(screen.getByText("Load more")).toBeTruthy();
    expect(screen.queryByText(/insert/i)).toBeNull();
    expect(screen.queryByText(/download/i)).toBeNull();
  });

  test("submits search with Enter", async () => {
    searchCreatorStore.mockResolvedValueOnce({ results: [asset], nextCursor: null });

    render(<CreatorStoreSearch />);
    await userEvent.type(screen.getByLabelText("Search Creator Store"), "tree{enter}");

    await waitFor(() => expect(searchCreatorStore).toHaveBeenCalledTimes(1));
    expect(searchCreatorStore.mock.calls[0][0].query).toBe("tree");
  });

  test("validates short queries before calling the backend", () => {
    render(<CreatorStoreSearch />);
    fireEvent.change(screen.getByLabelText("Search Creator Store"), { target: { value: "a" } });
    fireEvent.click(screen.getByRole("button", { name: /^Search$/ }));

    expect(searchCreatorStore).not.toHaveBeenCalled();
    expect(screen.getByText("Enter at least two characters to search.")).toBeTruthy();
  });

  test("allows Model and Mesh filters to be changed", async () => {
    searchCreatorStore.mockResolvedValueOnce({ results: [asset], nextCursor: null });

    render(<CreatorStoreSearch />);
    fireEvent.change(screen.getByLabelText("Search Creator Store"), { target: { value: "tree" } });
    fireEvent.click(screen.getByLabelText("Mesh"));
    fireEvent.click(screen.getByRole("button", { name: /^Search$/ }));

    await waitFor(() => expect(searchCreatorStore).toHaveBeenCalled());
    expect(searchCreatorStore.mock.calls[0][0].assetTypes).toEqual(["Model"]);
  });

  test("renders an empty state", async () => {
    searchCreatorStore.mockResolvedValueOnce({ results: [], nextCursor: null });

    render(<CreatorStoreSearch />);
    fireEvent.change(screen.getByLabelText("Search Creator Store"), { target: { value: "zzzz" } });
    fireEvent.click(screen.getByRole("button", { name: /^Search$/ }));

    expect(await screen.findByText("No Creator Store assets found.")).toBeTruthy();
  });

  test("renders backend errors and reauthorization action", async () => {
    const err = new Error("Roblox reauthorization is required");
    err.code = "ROBLOX_REAUTHORIZATION_REQUIRED";
    err.missingScopes = ["creator-store-product:read"];
    searchCreatorStore.mockRejectedValueOnce(err);
    beginRobloxReauthorization.mockResolvedValueOnce({ authorizationUrl: "https://roblox.example/auth" });

    render(<CreatorStoreSearch />);
    fireEvent.change(screen.getByLabelText("Search Creator Store"), { target: { value: "tree" } });
    fireEvent.click(screen.getByRole("button", { name: /^Search$/ }));

    expect(await screen.findByText("Creator Store access needs additional Roblox permission.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reauthorize Roblox" }));

    await waitFor(() => expect(beginRobloxReauthorization).toHaveBeenCalledWith({
      bundles: ["core", "creator_store_read"],
      returnPath: "/ai?roblox=creator-store",
    }));
  });

  test("loads more results with the next cursor", async () => {
    searchCreatorStore
      .mockResolvedValueOnce({ results: [asset], nextCursor: "next-1" })
      .mockResolvedValueOnce({
        results: [{ ...asset, assetId: "456", name: "Tree Mesh", assetType: "Mesh" }],
        nextCursor: null,
      });

    render(<CreatorStoreSearch />);
    fireEvent.change(screen.getByLabelText("Search Creator Store"), { target: { value: "tree" } });
    fireEvent.click(screen.getByRole("button", { name: /^Search$/ }));
    expect(await screen.findByText("Low Poly Tree")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Tree Mesh")).toBeTruthy();
    expect(searchCreatorStore.mock.calls[1][0].cursor).toBe("next-1");
  });

  test("opens details and copies asset ID", async () => {
    searchCreatorStore.mockResolvedValueOnce({ results: [asset], nextCursor: null });
    getCreatorStoreAsset.mockResolvedValueOnce({
      asset: {
        ...asset,
        description: "Full details",
        creator: { id: "45", name: "Builder", type: "User" },
      },
    });

    render(<CreatorStoreSearch />);
    fireEvent.change(screen.getByLabelText("Search Creator Store"), { target: { value: "tree" } });
    fireEvent.click(screen.getByRole("button", { name: /^Search$/ }));
    expect(await screen.findByText("Low Poly Tree")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "View details for Low Poly Tree" }));
    expect(await screen.findByText("Full details")).toBeTruthy();
    expect(screen.getByText("Builder (User)")).toBeTruthy();
    expect(screen.getByText("ID 123")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Copy asset ID" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("123"));
  });
});
