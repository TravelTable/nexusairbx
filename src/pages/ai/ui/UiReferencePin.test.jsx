import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import UiReferencePin from "./UiReferencePin";

test("the pinned reference stays visible and opens the original screenshot", () => {
  render(
    <UiReferencePin
      mode="replicate"
      image={{ src: "blob:shop", alt: "shop-desktop.png", name: "shop-desktop.png" }}
    />
  );

  expect(screen.getByLabelText("Pinned reference")).toHaveTextContent("Reference · Replicate closely");
  fireEvent.click(screen.getByRole("button", { name: "View" }));
  expect(screen.getByRole("dialog", { name: "Reference screenshot" })).toBeVisible();
  expect(screen.getByRole("img", { name: "shop-desktop.png" })).toHaveAttribute("src", "blob:shop");
});
