import fs from "fs";
import path from "path";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("keeps the search-focused hero static and evidence-led", () => {
  const component = read("src/components/homepage/HomepageV2Content.jsx");
  const styles = read("src/components/homepage/HomepageCinematic.module.css");

  expect(component).toContain('<h1 id="homepage-hero-heading" className={styles.heroHeading}>');
  expect(component).toContain('AI Roblox Script Generator <span>and Studio Agent</span>');
  expect(component).toContain('src="/assets/nexusrbx-workspace-evidence.png"');
  expect(component).toContain('const PROOF_RECORDS = [');
  expect(component).not.toContain("AnimatedHeroPromise");
  expect(component).not.toContain("HERO_WORDS");
  expect(component).not.toContain("setInterval");
  expect(styles).toMatch(/font-family:\s*var\(--nx-font-display\)/);
  expect(styles).toMatch(/font-size:\s*clamp\(3rem,\s*5\.8vw,\s*5\.3rem\)/);
  expect(styles).not.toMatch(/hero-letter-(?:in|out)/);
  expect(styles).not.toMatch(/filter:\s*blur/);
});
