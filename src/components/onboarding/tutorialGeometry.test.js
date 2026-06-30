import {
  getStepSelectors,
  resolveTourTarget,
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

  it("returns no target when every selector is missing or hidden", () => {
    const hidden = document.createElement("button");
    hidden.dataset.tour = "hidden";
    hidden.style.visibility = "hidden";
    mockRect(hidden, { top: 20, left: 20, width: 120, height: 40 });
    document.body.append(hidden);

    const target = resolveTourTarget({
      targets: ['[data-tour="missing"]', '[data-tour="hidden"]'],
    });

    expect(target.element).toBeNull();
    expect(target.selector).toBeNull();
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

  it("deduplicates selector lists while preserving fallback order", () => {
    expect(
      getStepSelectors({
        target: '[data-tour="primary"]',
        targets: ['[data-tour="primary"]', '[data-tour="fallback"]', '[data-tour="primary"]'],
      })
    ).toEqual(['[data-tour="primary"]', '[data-tour="fallback"]']);
  });
});
