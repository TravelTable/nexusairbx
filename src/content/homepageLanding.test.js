import { homepageFooterLinks } from "./homepageLanding";

describe("homepageFooterLinks", () => {
  test("sends the Pricing navigation link to the public pricing page", () => {
    expect(homepageFooterLinks.find(({ label }) => label === "Pricing")).toEqual({
      label: "Pricing",
      href: "/pricing",
    });
  });
});
