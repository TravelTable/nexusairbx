import React from "react";
import { render, screen } from "@testing-library/react";

import { Tree, TreeItemLabel } from "./tree";

describe("TreeItemLabel", () => {
  it("slots a folder chevron and an interactive label into one child", () => {
    const item = {
      isFolder: () => true,
      getItemName: () => "Panel",
    };

    render(
      <Tree tree={{ getContainerProps: () => ({}) }}>
        <TreeItemLabel item={item} asChild>
          <button type="button">Panel</button>
        </TreeItemLabel>
      </Tree>,
    );

    expect(screen.getByRole("button", { name: "Panel" })).toBeInTheDocument();
  });
});
