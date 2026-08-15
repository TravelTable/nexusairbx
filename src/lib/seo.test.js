import { buildPublicMetadata, DEFAULT_OG_IMAGE } from "./seo";

describe("public social metadata", () => {
  test("uses the approved flat 2D project-world card by default", () => {
    expect(DEFAULT_OG_IMAGE).toBe(
      "https://www.nexusrbx.com/assets/nexusrbx-og-flat-world.jpg",
    );

    const metadata = buildPublicMetadata({
      title: "NexusRBX",
      description: "Build Roblox games with a reviewable Studio-connected workflow.",
    });

    expect(metadata.openGraph.images).toEqual([
      expect.objectContaining({
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
      }),
    ]);
    expect(metadata.twitter.images).toEqual([DEFAULT_OG_IMAGE]);
  });
});
