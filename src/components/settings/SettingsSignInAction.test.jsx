import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import SettingsSignInAction from "./SettingsSignInAction";

test("links signed-out settings users to the canonical sign-in route", () => {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SettingsSignInAction />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/signin");
});
