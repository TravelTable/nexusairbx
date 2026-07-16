import { render, screen } from "@testing-library/react";

import SiteShell from "./SiteShell";

jest.mock("./SiteHeader", () => function MockSiteHeader() {
  return <header>Website navigation</header>;
});

describe("SiteShell", () => {
  test("does not render the website header on auth routes", () => {
    render(
      <SiteShell variant="auth">
        <main>Authentication page</main>
      </SiteShell>
    );

    expect(screen.getByText("Authentication page")).toBeTruthy();
    expect(screen.queryByText("Website navigation")).toBeNull();
  });

  test("keeps the website header on other routes", () => {
    render(
      <SiteShell variant="marketing">
        <main>Marketing page</main>
      </SiteShell>
    );

    expect(screen.getByText("Website navigation")).toBeTruthy();
  });
});
