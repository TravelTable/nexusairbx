import fs from "fs";
import path from "path";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("keeps the search-focused heading static while animating the supporting promise", () => {
  const component = read("src/components/homepage/HomepageV2Content.jsx");
  const styles = read("src/components/homepage/HomepageCinematic.module.css");

  expect(component).toContain('<h1 id="homepage-hero-heading" className={styles.heroHeading}>');
  expect(component).toContain('AI Roblox Script Generator <span>and Studio Agent</span>');
  expect(component).toContain("<AnimatedHeroPromise />");
  expect(component).toContain('const HERO_WORDS = ["playable", "testable", "reviewable", "real"]');
  expect(component).toContain('const HERO_LETTER_COLORS = ["#eca8d6", "#b591f3", "#81c3f9", "#a2d8a4", "#f8ba48"]');
  expect(component).toContain("window.setInterval(() => setMorphing(true), 3000)");
  expect(component).toContain("}, 1150)");
  expect(component).toContain('`${index * 42}ms`');
  expect(component).toContain('aria-label={`Build your Roblox game. Make it ${currentWord}.`}');
  expect(component).toContain("prefers-reduced-motion: reduce");
  expect(styles).toMatch(/font-family:\s*\n\s*"Instrument Sans Variable", "Instrument Sans", system-ui, sans-serif !important/);
  expect(styles).toMatch(/font-size:\s*clamp\(2\.15rem,\s*5vw,\s*5\.25rem\)/);
  expect(styles).toMatch(/animation:\s*hero-letter-out/);
  expect(styles).toMatch(/animation:\s*hero-letter-in/);
  expect(styles).toMatch(/filter:\s*blur\(20px\)/);
  expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
});
