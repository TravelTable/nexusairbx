import React from "react";
import { render, screen } from "@testing-library/react";
import { LayerTree } from "./UiCreatorWorkspace";
import { indexUiNodes } from "../../../lib/robloxUiPreview";

test("the real layer tree supports removal and undo without reading deleted items", () => {
  const node = { id: "frame", name: "Test frame", className: "Frame", order: 0 };
  const index = (nodes) => indexUiNodes({ screens: [{ nodes }] });
  const props = { onSelect: jest.fn(), onMove: jest.fn() };
  const { rerender } = render(<LayerTree {...props} index={index([node])} selectedId="frame" />);
  expect(screen.getByRole("button", { name: "Test frame Frame" })).toBeInTheDocument();
  rerender(<LayerTree {...props} index={index([])} selectedId={null} />);
  expect(screen.queryByRole("button", { name: "Test frame Frame" })).not.toBeInTheDocument();
  rerender(<LayerTree {...props} index={index([node])} selectedId="frame" />);
  expect(screen.getByRole("button", { name: "Test frame Frame" })).toBeInTheDocument();
});
