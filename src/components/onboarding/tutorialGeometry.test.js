import {
  getTooltipPlacement,
  getStepSelectors,
  resolveTourTarget,
  VIEWPORT_MARGIN,
} from "./tutorialGeometry";

function mockRect(element, rect) {
  element.getBoundingClientRect = jest.fn(() => ({
    top: rect.top,
    left: rect.left,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    width: rect.width,
    height: rect.height,
    x: rect.left,
    y: rect.top,
    toJSON: () => {},
  }));
}

describe("tutorialGeometry", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("clamps tooltip placement inside the viewport near each edge", () => {
    const viewport = { width: 360, height: 280 };
    const tooltipSize = { width: 320, height: 120 };

    const cases = [
      { top: 2, left: 2, width: 40, height: 40, preferredPosition: "top" },
      { top: 230, left: 316, width: 40, height: 40, preferredPosition: "bottom" },
      { top: 120, left: 0, width: 40, height: 40, preferredPosition: "left" },
      { top: 120, left: 320, width: 40, height: 40, preferredPosition: "right" },
    ];

    cases.forEach(({ preferredPosition, ...targetRect }) => {
      const placement = getTooltipPlacement({
        targetRect: {
          ...targetRect,
          right: targetRect.left + targetRect.width,
          bottom: targetRect.top + targetRect.height,
        },
        preferredPosition,
        tooltipSize,
        viewport,
      });

      expect(placement.top).toBeGreaterThanOrEqual(VIEWPORT_MARGIN);
      expect(placement.left).toBeGreaterThanOrEqual(VIEWPORT_MARGIN);
      expect(placement.top + tooltipSize.height).toBeLessThanOrEqual(viewport.height - VIEWPORT_MARGIN);
      expect(placement.left + placement.width).toBeLessThanOrEqual(viewport.width - VIEWPORT_MARGIN);
    });
  });

  it("flips placement when the preferred side would overflow", () => {
    const placement = getTooltipPlacement({
      targetRect: {
        top: 12,
        left: 120,
        right: 200,
        bottom: 52,
        width: 80,
        height: 40,
      },
      preferredPosition: "top",
      tooltipSize: { width: 160, height: 90 },
      viewport: { width: 420, height: 320 },
    });

    expect(placement.placement).toBe("bottom");
  });

  it("resolves fallback selectors and ignores hidden targets", () => {
    const hidden = document.createElement("button");
    hidden.dataset.tour = "primary";
    hidden.style.display = "none";
    mockRect(hidden, { top: 20, left: 20, width: 120, height: 40 });

    const fallback = document.createElement("button");
    fallback.id = "fallback-target";
    mockRect(fallback, { top: 80, left: 80, width: 120, height: 40 });

    document.body.append(hidden, fallback);

    const target = resolveTourTarget({
      target: '[data-tour="primary"]',
      targets: ['[data-tour="primary"]', "#fallback-target"],
    });

    expect(target.element).toBe(fallback);
    expect(target.selector).toBe("#fallback-target");
  });

  it("prefers mobile targets below the mobile breakpoint", () => {
    expect(
      getStepSelectors(
        {
          target: '[data-tour="desktop"]',
          mobileTargets: ['[data-tour="mobile"]'],
        },
        390
      )[0]
    ).toBe('[data-tour="mobile"]');
  });
});
