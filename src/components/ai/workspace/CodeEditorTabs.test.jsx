import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CodeEditorTabs from "./CodeEditorTabs";

describe("CodeEditorTabs", () => {
  test("renders dirty indicators per tab and closes only the selected tab", () => {
    const onSelectFile = jest.fn();
    const onCloseFile = jest.fn();

    render(
      <CodeEditorTabs
        files={[
          { id: "a", name: "InventoryService", path: "ServerScriptService/InventoryService", kind: "server", dirty: true },
          { id: "b", name: "TradingService", path: "ServerScriptService/TradingService", kind: "server", dirty: false },
        ]}
        activeFileId="a"
        onSelectFile={onSelectFile}
        onCloseFile={onCloseFile}
      />
    );

    expect(screen.getByTitle("Unsaved changes")).toBeTruthy();

    fireEvent.click(screen.getByTitle("Close TradingService"));
    expect(onCloseFile).toHaveBeenCalledWith("b");
    expect(onSelectFile).not.toHaveBeenCalled();
  });
});
