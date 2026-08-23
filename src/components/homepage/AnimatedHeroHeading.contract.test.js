import fs from "fs";
import path from "path";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("preserves the protected homepage heading contract", () => {
  const component = read("src/components/homepage/HomepageV2Content.jsx");
  const styles = read("src/components/homepage/HomepageCinematic.module.css");

  expect(component).toContain('const HERO_WORDS = ["playable", "testable", "reviewable", "real"]');
  expect(component).toContain('const HERO_LETTER_COLORS = ["#eca8d6", "#b591f3", "#81c3f9", "#a2d8a4", "#f8ba48"]');
  expect(component).toContain('window.setInterval(() => setMorphing(true), 3000)');
  expect(component).toContain('}, 1150)');
  expect(component).toContain('`${index * 42}ms`');
  expect(component).toContain('aria-label={`Build your Roblox game. Make it ${currentWord}.`}');
  expect(component).toContain("prefers-reduced-motion: reduce");
  expect(styles).toMatch(/font-family:\s*"Instrument Sans Variable",\s*"Instrument Sans",\s*system-ui,\s*sans-serif\s*!important/);
  expect(styles).toMatch(/font-size:\s*clamp\(1\.75rem,\s*5vw,\s*5\.5rem\)/);
  expect(styles).toMatch(/animation:\s*hero-letter-out 420ms/);
  expect(styles).toMatch(/animation:\s*hero-letter-in 620ms/);
  expect(styles).toMatch(/filter:\s*blur\(20px\)/);
  expect(styles).toMatch(/\.morphWord\s*>\s*span\s*\{\s*animation:\s*none\s*!important/);
});
