import { homepageFooterLinks, homepagePrompt } from "./homepageLanding";

describe("homepageFooterLinks", () => {
  test("sends the Pricing navigation link to the public pricing page", () => {
    expect(homepageFooterLinks.find(({ label }) => label === "Pricing")).toEqual({
      label: "Pricing",
      href: "/pricing",
    });
  });

  test("frames the entry point around a complete Roblox game", () => {
    expect(homepagePrompt.label).toBe("What Roblox game do you want to make?");
    expect(homepagePrompt.submitLabel).toBe("Start building");
    expect(homepagePrompt.placeholder).toMatch(/game, player loop, or system/i);
  });

  test("links the footer to the redesigned creator story", () => {
    expect(homepageFooterLinks).toEqual(expect.arrayContaining([
      { label: "Product", href: "/#product" },
      { label: "How it works", href: "/#workflow" },
      { label: "Project context", href: "/#context" },
      { label: "Project proof", href: "/#proof" },
      { label: "FAQ", href: "/#faq" },
    ]));
  });
});
