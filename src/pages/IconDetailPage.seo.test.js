import fs from "fs";
import path from "path";

const source = fs.readFileSync(path.join(process.cwd(), "src/pages/IconDetailPage.jsx"), "utf8");

test("keeps authenticated icon details private and landmarked in every state", () => {
  expect(source).toContain("<NoIndexMeta");
  expect(source).not.toContain("rel=\"canonical\"");
  expect(source).not.toContain("property=\"og:url\"");
  expect(source.match(/<main\b/g)).toHaveLength(3);
});
