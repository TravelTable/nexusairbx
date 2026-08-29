jest.mock("./robloxOAuthApi", () => ({
  requireRobloxOnboarding: jest.fn(),
}));

import { requireRobloxOnboarding } from "./robloxOAuthApi";
import {
  connectRobloxPath,
  PENDING_ROBLOX_SIGNUP_KEY,
  readPendingRobloxSignup,
  registerRobloxSignupRequirement,
  safeSignupReturnPath,
} from "./signupRobloxOnboarding";

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

test("accepts only local return paths", () => {
  expect(safeSignupReturnPath("/assets/42?tab=versions")).toBe("/assets/42?tab=versions");
  expect(safeSignupReturnPath("//example.com/steal")).toBe("/ai");
  expect(safeSignupReturnPath("/\\example.com/steal")).toBe("/ai");
  expect(connectRobloxPath("https://example.com/steal")).toBe("/connect-roblox?return=%2Fai");
});

test("keeps a retryable pending record until the server acknowledges the requirement", async () => {
  requireRobloxOnboarding.mockRejectedValueOnce(new Error("temporary outage"));
  const user = { uid: "new-user" };

  await expect(registerRobloxSignupRequirement(user, "/assets")).rejects.toThrow("temporary outage");
  expect(readPendingRobloxSignup(user.uid)).toEqual(expect.objectContaining({
    uid: user.uid,
    returnPath: "/assets",
  }));

  requireRobloxOnboarding.mockResolvedValueOnce({ ok: true });
  await expect(registerRobloxSignupRequirement(user, "/assets")).resolves.toBe(
    "/connect-roblox?return=%2Fassets"
  );
  expect(localStorage.getItem(PENDING_ROBLOX_SIGNUP_KEY)).toBeNull();
});
