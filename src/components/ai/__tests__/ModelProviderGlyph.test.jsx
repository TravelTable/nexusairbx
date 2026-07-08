import React from "react";
import { render } from "@testing-library/react";
import ModelProviderGlyph, { iconUrl } from "../ModelProviderGlyph";

test("renders openai glyph image", () => {
  const { container } = render(<ModelProviderGlyph provider="openai" size={16} type="mono" />);
  const img = container.querySelector("img");
  expect(img).toBeTruthy();
  expect(img.getAttribute("src")).toBe(iconUrl("openai", "mono"));
});

test("uses color asset for deepseek when available", () => {
  expect(iconUrl("deepseek", "color")).toContain("deepseek-color.svg");
  const { container } = render(<ModelProviderGlyph provider="deepseek" size={16} type="color" />);
  expect(container.querySelector("img").getAttribute("src")).toContain("deepseek-color");
});

test("maps nexus provider to deepseek icon", () => {
  const { container } = render(<ModelProviderGlyph provider="nexus" size={14} type="mono" />);
  expect(container.querySelector("img").getAttribute("src")).toContain("deepseek.svg");
});
