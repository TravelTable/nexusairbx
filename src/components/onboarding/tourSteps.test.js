import { TOUR_STEPS } from "./tourSteps";

test("defines the five action-driven creator milestones in order", () => {
  expect(TOUR_STEPS.map((step) => step.id)).toEqual([
    "describe-idea",
    "connect-studio",
    "approve-plan",
    "review-change",
    "verify-playtest",
  ]);

  for (const step of TOUR_STEPS) {
    expect(step.title).toBeTruthy();
    expect(step.content).toBeTruthy();
    expect(step.action).toBeTruthy();
    expect(step.missingTargetHint).toBeTruthy();
  }
});
