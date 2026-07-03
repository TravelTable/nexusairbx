import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import CreatorStoreResultCard from "./CreatorStoreResultCard";

jest.mock("../../lib/creatorStoreThumbnail", () => ({
  buildCreatorStoreThumbnailCandidates: () => [
    "https://cdn.test/broken.png",
    "https://backend.test/api/roblox/thumbnail?assetId=456&size=420x420",
  ],
}));

describe("CreatorStoreResultCard", () => {
  test("tries the next thumbnail candidate when the first image fails", () => {
    render(
      <CreatorStoreResultCard
        asset={{ assetId: "123", name: "Tree", assetType: "Model" }}
        onViewDetails={jest.fn()}
      />
    );

    const image = screen.getByAltText("Tree thumbnail");
    expect(image.getAttribute("src")).toBe("https://cdn.test/broken.png");
    fireEvent.error(image);
    expect(screen.getByAltText("Tree thumbnail").getAttribute("src"))
      .toBe("https://backend.test/api/roblox/thumbnail?assetId=456&size=420x420");
  });
});
