jest.mock("./robloxOAuthApi", () => ({
  requireRobloxOnboarding: jest.fn(),
}));
jest.mock('./guidedLaunchApi', () => ({ startGuidedLaunch: jest.fn().mockResolvedValue({}), guidedLaunchSource: () => ({ idea: '' }), guidedLaunchPath: p => `/onboarding?return=${encodeURIComponent(p)}` }));

import { requireRobloxOnboarding } from "./robloxOAuthApi";
import { startGuidedLaunch } from "./guidedLaunchApi";
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
    "/onboarding?return=%2Fassets"
  );
  expect(localStorage.getItem(PENDING_ROBLOX_SIGNUP_KEY)).toBeNull();
});

test("falls back to the Roblox connect gate when Guided Launch is unavailable", async () => {
  // The account already exists by this point, so an unavailable guide must not
  // strand the new user on the signup form.
  requireRobloxOnboarding.mockResolvedValueOnce({ ok: true });
  startGuidedLaunch.mockRejectedValueOnce(new Error("Not Found"));

  await expect(registerRobloxSignupRequirement({ uid: "guide-down" }, "/assets")).resolves.toBe(
    "/connect-roblox?return=%2Fassets"
  );
  expect(localStorage.getItem(PENDING_ROBLOX_SIGNUP_KEY)).toBeNull();
});

test("still refuses to continue when the Roblox requirement itself cannot be recorded", async () => {
  // The requirement is the actual gate, so this one must keep propagating.
  requireRobloxOnboarding.mockRejectedValueOnce(new Error("requirement unavailable"));
  await expect(
    registerRobloxSignupRequirement({ uid: "gate-down" }, "/assets")
  ).rejects.toThrow("requirement unavailable");
  expect(startGuidedLaunch).not.toHaveBeenCalled();
});
