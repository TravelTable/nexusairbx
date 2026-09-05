import React from "react";
import { render } from "@testing-library/react";
import ModelProviderGlyph, { iconUrl, NEXUS_AGENT_LOGO } from "../ModelProviderGlyph";

test("renders openai glyph image", () => {
  const { container } = render(<ModelProviderGlyph provider="openai" size={16} type="mono" />);
  const img = container.querySelector("img");
  expect(img).toBeTruthy();
  expect(img.getAttribute("src")).toBe(iconUrl("openai", "mono"));
  expect(img.parentElement).toHaveClass("bg-white");
  expect(img.parentElement).toHaveStyle({ width: "16px", height: "16px" });
});

test("uses color asset for deepseek when available", () => {
  expect(iconUrl("deepseek", "color")).toContain("deepseek-color.svg");
  const { container } = render(<ModelProviderGlyph provider="deepseek" size={16} type="color" />);
  expect(container.querySelector("img").getAttribute("src")).toContain("deepseek-color");
  expect(container.querySelector("img").parentElement).not.toHaveClass("bg-white");
});

test("places every intrinsically dark provider logo on a light contrast chip", () => {
  ["openai", "anthropic", "xai"].forEach((provider) => {
    const { container, unmount } = render(
      <ModelProviderGlyph provider={provider} size={17} type="color" />
    );
    expect(container.querySelector("img").parentElement).toHaveClass("bg-white");
    unmount();
  });
});

test("uses site logo for nexus agent model", () => {
  const { container } = render(<ModelProviderGlyph provider="nexus" modelId="nexus-free-auto" size={14} type="mono" />);
  expect(container.querySelector("img").getAttribute("src")).toBe(NEXUS_AGENT_LOGO);
});
