import { findLiteralMatches } from "./codeSearch";

describe("findLiteralMatches", () => {
  test("treats regular-expression characters as literal text", () => {
    expect(findLiteralMatches("local value = a+b (test)", "a+b (")).toEqual([
      { start: 14, end: 19 },
    ]);
  });

  test("finds matches without changing the original text", () => {
    const code = '<img src=x onerror="alert(1)">';
    expect(findLiteralMatches(code, "IMG")).toEqual([{ start: 1, end: 4 }]);
    expect(code).toContain("onerror");
  });

  test("caps pathological match counts", () => {
    expect(findLiteralMatches("aaaaaaaaaa", "a", 3)).toHaveLength(3);
  });
});

