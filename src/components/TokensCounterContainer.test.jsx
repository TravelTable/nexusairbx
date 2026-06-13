import { render, screen } from "@testing-library/react";
import TokensCounterContainer from "./TokensCounterContainer";

describe("TokensCounterContainer", () => {
  test("renders unlimited header state for dev override accounts", () => {
    render(
      <TokensCounterContainer
        tokens={{
          sub: { remaining: 100, limit: 200 },
          payg: { remaining: 50 },
        }}
        flags={{ unlimitedTokens: true, devOverride: true, isAdmin: true }}
        variant="header"
      />
    );

    expect(screen.getByText("Dev:")).toBeTruthy();
    expect(screen.getByText("Unlimited")).toBeTruthy();
    expect(screen.queryByText("100/200")).toBeNull();
  });
});
