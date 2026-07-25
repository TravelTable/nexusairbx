import { getProjectBinding, PROJECT_RESOLUTION_STATES } from "./projectBindingsApi";
import { authedFetch } from "./billing";

jest.mock("./billing", () => ({
  authedFetch: jest.fn(),
}));

describe("getProjectBinding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns a soft MISSING result for empty project ids", async () => {
    await expect(getProjectBinding("  ")).resolves.toEqual({
      ok: true,
      state: PROJECT_RESOLUTION_STATES.MISSING,
      project: null,
      recoveryAction: null,
    });
    expect(authedFetch).not.toHaveBeenCalled();
  });

  test("maps 404 bindings to MISSING instead of throwing", async () => {
    authedFetch.mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: () => null },
      text: async () => JSON.stringify({
        ok: false,
        code: "OWNERSHIP_MISMATCH",
        error: "The requested resource is not available.",
      }),
    });

    await expect(getProjectBinding("e8e3528b-0fda-4e8e-af99-9015b7485316")).resolves.toEqual({
      ok: true,
      state: PROJECT_RESOLUTION_STATES.MISSING,
      project: null,
      recoveryAction: null,
      projectId: "e8e3528b-0fda-4e8e-af99-9015b7485316",
    });
  });
});
