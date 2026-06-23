import React from "react";
import { render, screen } from "@testing-library/react";
import FreeUsageMeter from "./FreeUsageMeter";

describe("FreeUsageMeter", () => {
  it("renders daily percentage usage without token or dollar copy", () => {
    render(
      <FreeUsageMeter
        dailyUsage={{
          percentUsed: 43,
          percentRemaining: 57,
          resetsAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          boostActive: false,
        }}
      />
    );

    expect(screen.getByText("Daily Free Usage")).toBeTruthy();
    expect(screen.getByText("43% used")).toBeTruthy();
    expect(screen.getByText("57% remaining")).toBeTruthy();
    expect(screen.queryByText(/tokens/i)).toBeNull();
    expect(screen.queryByText(/\$/)).toBeNull();
  });

  it("shows warning states at 70, 90 and 100 percent", () => {
    const { rerender } = render(<FreeUsageMeter dailyUsage={{ percentUsed: 70, percentRemaining: 30 }} />);
    expect(screen.getByText("You've used 70% of today's Free usage.")).toBeTruthy();

    rerender(<FreeUsageMeter dailyUsage={{ percentUsed: 90, percentRemaining: 10 }} />);
    expect(screen.getByText("You're almost out of Free usage today.")).toBeTruthy();

    rerender(<FreeUsageMeter dailyUsage={{ percentUsed: 100, percentRemaining: 0 }} />);
    expect(screen.getByText("Daily Free usage reached.")).toBeTruthy();
  });

  it("renders rolling fair-use blocked state", () => {
    render(<FreeUsageMeter dailyUsage={{ percentUsed: 20, percentRemaining: 80 }} fairUse={{ blocked: true }} />);
    expect(screen.getByText("You've reached the Free plan's fair-use limit.")).toBeTruthy();
  });
});
