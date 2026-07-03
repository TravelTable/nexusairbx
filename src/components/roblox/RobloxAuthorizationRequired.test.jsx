import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import RobloxAuthorizationRequired from "./RobloxAuthorizationRequired";

describe("RobloxAuthorizationRequired", () => {
  test("renders upgrade copy and triggers authorize callback", async () => {
    const onAuthorize = jest.fn().mockResolvedValue(undefined);
    render(
      <RobloxAuthorizationRequired
        upgradeRequired
        capabilityIds={["roblox_search_creator_store"]}
        onAuthorize={onAuthorize}
      />
    );

    expect(screen.getByText(/one-time permission upgrade/i)).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /continue with roblox/i }));
    });
    expect(onAuthorize).toHaveBeenCalled();
  });
});
