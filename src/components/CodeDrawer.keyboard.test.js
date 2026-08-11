import { shouldPreserveNativeCopy } from "./codeDrawerKeyboard";

describe("CodeDrawer copy shortcut guard", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("preserves native copy inside editable controls", () => {
    const input = document.createElement("input");
    expect(shouldPreserveNativeCopy({ target: input })).toBe(true);
  });

  test("preserves native copy when the user selected visible text", () => {
    jest.spyOn(window, "getSelection").mockReturnValue({ toString: () => "selected text" });
    expect(shouldPreserveNativeCopy({ target: document.createElement("div") })).toBe(true);
  });

  test("allows the drawer shortcut when there is no editable target or selection", () => {
    jest.spyOn(window, "getSelection").mockReturnValue({ toString: () => "" });
    expect(shouldPreserveNativeCopy({ target: document.createElement("button") })).toBe(false);
  });
});
