import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import NexusRBXFooter from "./NexusRBXFooter";

describe("NexusRBXFooter", () => {
  test("links GitHub visitors to the NexusRBX repository", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NexusRBXFooter />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "GitHub" }).getAttribute("href"))
      .toBe("https://github.com/TravelTable/nexusairbx");
  });
});
