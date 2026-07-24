import { isUsableRobloxPlaceId, normalizeRobloxPlaceId } from "./robloxPlaceId";

describe("normalizeRobloxPlaceId", () => {
  test.each([null, undefined, "", "   ", 0, "0", " 0 "])(
    "rejects invalid place identity %p",
    (value) => {
      expect(normalizeRobloxPlaceId(value)).toBeNull();
      expect(isUsableRobloxPlaceId(value)).toBe(false);
    }
  );

  test("normalizes valid string and numeric place ids", () => {
    expect(normalizeRobloxPlaceId(" 12345 ")).toBe("12345");
    expect(normalizeRobloxPlaceId(98765)).toBe("98765");
    expect(isUsableRobloxPlaceId("12345")).toBe(true);
  });

  test("bounds persisted place ids", () => {
    expect(normalizeRobloxPlaceId("123456", 4)).toBe("1234");
  });
});
