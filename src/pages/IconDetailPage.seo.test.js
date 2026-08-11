import fs from "fs";
import path from "path";

const source = fs.readFileSync(path.join(process.cwd(), "src/pages/IconDetailPage.jsx"), "utf8");

test("keeps authenticated icon details private and landmarked in every state", () => {
  expect(source).toContain("<NoIndexMeta");
  expect(source).not.toContain("rel=\"canonical\"");
  expect(source).not.toContain("property=\"og:url\"");
  expect(source.match(/<main\b/g)).toHaveLength(3);
});

test("uses truthful Creator Store copy and local tokenized preview backgrounds", () => {
  expect(source).toContain("Back to Creator Store");
  expect(source).toContain("Copy Studio snippet");
  expect(source).toContain("replace its image URL with your Roblox asset ID");
  expect(source).not.toMatch(/transparenttextures|tr\.rbxcdn|bg-\[#|bg-gray-/);
  expect(source).not.toContain("Post to Roblox");
});
