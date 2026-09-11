import {
  getLifecyclePresentation,
  getLifecyclePresentationFromText,
  inferLifecycleState,
  normalizeLifecycleState,
} from "./productLifecycle";

describe("product lifecycle presentation", () => {
  test.each([
    ["building", "generating"],
    ["waiting-for-approval", "waiting_user"],
    ["awaiting_studio_reconnect", "waiting_studio"],
    ["canceled", "cancelled"],
    ["applied", "applied_unverified"],
  ])("normalizes %s to %s", (value, expected) => {
    expect(normalizeLifecycleState(value)).toBe(expected);
  });

  test.each([
    ["Planning the inventory system", "planning"],
    ["Writing Studio files", "generating"],
    ["Waiting for Studio", "waiting_studio"],
    ["Verifying the result", "verifying"],
    ["Reconnecting to generation stream", "reconnecting"],
  ])("infers %s as %s", (value, expected) => {
    expect(inferLifecycleState(value)).toBe(expected);
  });

  test("does not claim verified completion without evidence", () => {
    expect(getLifecyclePresentation("complete").state).toBe("unverified_complete");
    expect(getLifecyclePresentation("complete", { verified: true }).state).toBe("complete");
  });

  test("keeps timeout and applied-without-verification outcomes specific", () => {
    expect(getLifecyclePresentation("timed_out").label).toBe("Build timed out");
    expect(getLifecyclePresentation("applied").label).toBe("Applied · verification pending");
  });

  test("presents raw stages through canonical user-facing copy", () => {
    expect(getLifecyclePresentationFromText("Planning Layout...").label).toBe("Planning the change");
  });
});
