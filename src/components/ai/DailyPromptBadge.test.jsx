import { render, screen } from "@testing-library/react";
import DailyPromptBadge from "./DailyPromptBadge";

describe("DailyPromptBadge", () => {
  test("shows dev unlimited instead of prompt estimate for override accounts", () => {
    render(
      <DailyPromptBadge
        totalRemaining={2025}
        subLimit={20000}
        unlimitedTokens
        devOverride
      />
    );

    expect(screen.getByText("Dev unlimited")).toBeTruthy();
    expect(screen.queryByText(/0 prompt/i)).toBeNull();
  });
});
