import React from "react";
import { render, screen } from "@testing-library/react";

import RobloxUiPreview from "./RobloxUiPreview";

const baseProps = {
  position: { x: { scale: 0, offset: 0 }, y: { scale: 0, offset: 0 } },
  size: { x: { scale: 0, offset: 280 }, y: { scale: 0, offset: 140 } },
  anchorPoint: { x: 0, y: 0 },
  backgroundColor: "#302931",
  backgroundTransparency: 0,
  visible: true,
  clipsDescendants: false,
  rotation: 0,
  uiScale: 1,
  zIndex: 1,
};

test("preserves fixed child widths inside list layouts so phone previews scroll instead of shrinking", () => {
  const document = {
    revision: "revision-1",
    canvas: { backgroundColor: "#101014" },
    assets: [],
    screens: [{
      id: "main",
      nodes: [
        {
          id: "items",
          name: "Items",
          className: "ScrollingFrame",
          parentId: null,
          order: 1,
          props: { ...baseProps, size: { x: { scale: 1, offset: 0 }, y: { scale: 1, offset: 0 } } },
          style: {},
          layout: { type: "list", direction: "horizontal", padding: 20, horizontalAlignment: "Left", verticalAlignment: "Top" },
          interactions: {},
        },
        {
          id: "card",
          name: "Shop Card",
          className: "Frame",
          parentId: "items",
          order: 2,
          props: baseProps,
          style: {},
          layout: null,
          interactions: {},
        },
      ],
      timelines: [],
    }],
  };

  render(
    <RobloxUiPreview
      document={document}
      device={{ width: 375, height: 812, safe: { top: 0, right: 0, bottom: 0, left: 0 } }}
      mode="preview"
      selectedId={null}
      onSelect={jest.fn()}
      onNodeChange={jest.fn()}
    />,
  );

  expect(screen.getByLabelText("Shop Card")).toHaveStyle({
    width: "calc(0% + 280px)",
    flexShrink: "0",
  });
});
