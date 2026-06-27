const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isMacOsMetadataArtifact,
  isMarketplaceEligible,
  evaluateIconIndexability,
} = require("./iconIndexability");

test("isMacOsMetadataArtifact detects macOS zip resource forks", () => {
  assert.equal(
    isMacOsMetadataArtifact({
      name: ". WoolFabric Icon",
      tags: ["__macosx", "woolfabric"],
    }),
    true,
  );
  assert.equal(
    isMacOsMetadataArtifact({
      name: "WoolFabric Icon",
      tags: ["woolfabric"],
    }),
    false,
  );
});

test("isMarketplaceEligible rejects corrupt macOS metadata icons", () => {
  assert.equal(
    isMarketplaceEligible({
      name: ". UraniumOre Icon",
      imageUrl: "https://storage.googleapis.com/example/icon.png",
      tags: ["__macosx"],
    }),
    false,
  );
  assert.equal(
    isMarketplaceEligible({
      name: "Key Outline 64",
      imageUrl: "https://storage.googleapis.com/example/icon.png",
      tags: ["key"],
    }),
    true,
  );
});

test("evaluateIconIndexability excludes macOS metadata artifacts", () => {
  const result = evaluateIconIndexability({
    id: "omFibOqM24B7fVibHfan",
    name: ". WoolFabric Icon",
    style: "Outline",
    category: "UI Element",
    imageUrl: "https://storage.googleapis.com/example/icon.png",
    tags: ["__macosx"],
  });

  assert.equal(result.indexable, false);
  assert.ok(result.reasons.includes("macos_metadata_artifact"));
});
