import { filterMarketplaceIcons, isMacOsMetadataArtifact, isMarketplaceEligible } from "./iconMarket";

describe("iconMarket", () => {
  it("filters macOS zip metadata artifacts", () => {
    const icons = [
      {
        id: "bad",
        name: ". WoolFabric Icon",
        imageUrl: "https://storage.googleapis.com/example/icon.png",
        tags: ["__macosx"],
      },
      {
        id: "good",
        name: "Key Outline 64",
        imageUrl: "https://storage.googleapis.com/example/key.png",
        tags: ["key"],
      },
    ];

    expect(filterMarketplaceIcons(icons)).toEqual([icons[1]]);
    expect(isMacOsMetadataArtifact(icons[0])).toBe(true);
    expect(isMarketplaceEligible(icons[1])).toBe(true);
  });
});
