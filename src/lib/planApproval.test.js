import { isExplicitPlanApproval } from "./planApproval";

describe("isExplicitPlanApproval", () => {
  test("accepts explicit approval phrases", () => {
    expect(isExplicitPlanApproval("Start build")).toBe(true);
    expect(isExplicitPlanApproval("Go ahead")).toBe(true);
    expect(isExplicitPlanApproval("Implement that plan")).toBe(true);
  });

  test("rejects casual acknowledgements", () => {
    expect(isExplicitPlanApproval("okay")).toBe(false);
    expect(isExplicitPlanApproval("cool")).toBe(false);
    expect(isExplicitPlanApproval("thanks")).toBe(false);
  });
});
