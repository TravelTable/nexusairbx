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

  test("passes through a soft MISSING 200 response", async () => {
    authedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify({
        ok: true,
        state: PROJECT_RESOLUTION_STATES.MISSING,
        project: null,
        recoveryAction: null,
      }),
      json: async () => ({
        ok: true,
        state: PROJECT_RESOLUTION_STATES.MISSING,
        project: null,
        recoveryAction: null,
      }),
    });

    await expect(getProjectBinding("64962329-304b-4e78-92f9-bbc5ca9ce625")).resolves.toEqual({
      ok: true,
      state: PROJECT_RESOLUTION_STATES.MISSING,
      project: null,
      recoveryAction: null,
    });
  });
});