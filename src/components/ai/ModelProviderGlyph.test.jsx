import React from "react";
import { fireEvent, render } from "@testing-library/react";
import ModelProviderGlyph, { iconUrl } from "./ModelProviderGlyph";
test("provider logos load locally and failed images have a neutral fallback", () => {
  expect(iconUrl("openai", "mono")).toBe("/assets/providers/openai-mono.svg");
  const { container } = render(<ModelProviderGlyph provider="openai" />);
  const img = container.querySelector("img");
  expect(img.getAttribute("src")).toBe("/assets/providers/openai-color.svg");
  fireEvent.error(img);
  expect(container.querySelector("img")).toBeNull();
  expect(container.querySelector("svg")).not.toBeNull();
});
