import {
  computeAnchoredMenuPosition,
} from "./workspaceMenuPosition";

describe("workspaceMenuPosition", () => {
  test("right-aligns under the trigger and caps height", () => {
    const buttonRect = { left: 500, right: 620, top: 12, bottom: 44, width: 120, height: 32 };

    const fixed = computeAnchoredMenuPosition(buttonRect, {
      viewportWidth: 1280,
      viewportHeight: 800,
      menuWidth: 304,
      menuMaxHeight: 420,
    });
    expect(fixed.strategy).toBe("fixed");
    expect(fixed.width).toBe(304);
    expect(fixed.left).toBe(316);
    expect(fixed.top).toBe(52);
    expect(fixed.maxHeight).toBeLessThanOrEqual(420);

    const absolute = computeAnchoredMenuPosition(buttonRect, {
      hostRect: { left: 0, top: 0, right: 1024, bottom: 640 },
      hostClientWidth: 1280,
      hostClientHeight: 800,
      hostScale: 0.8,
      menuWidth: 304,
      menuMaxHeight: 420,
    });
    expect(absolute.strategy).toBe("absolute");
    expect(absolute.left).toBeCloseTo((620 / 0.8) - 304, 5);
    expect(absolute.top).toBeCloseTo((44 / 0.8) + 8, 5);
    expect(absolute.maxHeight).toBeLessThanOrEqual(420);
  });

  test("supports start alignment under the trigger", () => {
    const buttonRect = { left: 500, right: 620, top: 12, bottom: 44, width: 120, height: 32 };
    const start = computeAnchoredMenuPosition(buttonRect, {
      viewportWidth: 1280,
      viewportHeight: 800,
      menuWidth: 176,
      menuMaxHeight: 280,
      align: "start",
    });
    expect(start.left).toBe(500);
    expect(start.top).toBe(52);
  });
});
