import React from "react";
import { render, screen } from "@testing-library/react";
import ImageGeneration from "./ImageGeneration";

jest.mock("motion/react", () => ({
  motion: {
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

test("preserves the generating and completed copy around the image card", () => {
  const { rerender } = render(
    <ImageGeneration state="generating">
      <img alt="Artwork" src="data:image/png;base64,aaa" />
    </ImageGeneration>
  );
  expect(screen.getByText("Creating image. May take a moment.")).toBeVisible();
  expect(screen.getByRole("img", { name: "Artwork" })).toBeVisible();

  rerender(
    <ImageGeneration state="completed">
      <img alt="Artwork" src="data:image/png;base64,aaa" />
    </ImageGeneration>
  );
  expect(screen.getByText("Image created.")).toBeVisible();
});
