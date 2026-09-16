import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useModelCatalog, resetModelCatalogForTests } from "./useModelCatalog";

jest.mock("../config", () => ({ BACKEND_URL: "https://api.example.test" }));
jest.mock("../lib/workspaceRuntime", () => ({ desktopWorkspace: () => null }));
const liveModel = { id: "provider/live", name: "Live", pricingConfigured: true, availableToPaid: true };
const response = (models, meta = { source: "gateway" }) => ({ ok: true, json: async () => ({ models, meta }) });

beforeEach(() => { resetModelCatalogForTests(); localStorage.clear(); global.fetch = jest.fn(); });
afterEach(() => { cleanup(); resetModelCatalogForTests(); });

test("never authorizes stored fallback models when the live request fails", async () => {
  localStorage.setItem("nexus:model-catalog:v2", JSON.stringify({ models: [liveModel], fetchedAt: Date.now() }));
  fetch.mockRejectedValue(new Error("offline"));
  const { result } = renderHook(useModelCatalog);
  expect(result.current.models).toEqual([]);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.models).toEqual([]);
  expect(result.current.source).toBe("unavailable");
});

test("deduplicates requests and shares the authoritative filtered catalog across pickers", async () => {
  fetch.mockResolvedValue(response([liveModel, { ...liveModel, id: "unpriced", pricingConfigured: false }]));
  const first = renderHook(useModelCatalog);
  const second = renderHook(useModelCatalog);
  await waitFor(() => expect(first.result.current.models).toHaveLength(1));
  expect(second.result.current.models).toEqual([liveModel]);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("a successful empty live catalog removes old entries", async () => {
  fetch.mockResolvedValueOnce(response([liveModel])).mockResolvedValueOnce(response([]));
  const { result } = renderHook(useModelCatalog);
  await waitFor(() => expect(result.current.models).toHaveLength(1));
  await act(async () => { await result.current.refresh(); });
  expect(result.current.models).toEqual([]);
  expect(result.current.error).toBeNull();
});

test("refresh failure withholds stale selectable rows everywhere", async () => {
  fetch.mockResolvedValueOnce(response([liveModel])).mockRejectedValueOnce(new Error("offline"));
  const first = renderHook(useModelCatalog);
  const second = renderHook(useModelCatalog);
  await waitFor(() => expect(first.result.current.models).toHaveLength(1));
  await act(async () => { await first.result.current.refresh(); });
  expect(first.result.current.models).toEqual([]);
  expect(second.result.current.models).toEqual([]);
});

test("legacy server fallback catalogs never become selectable", async () => {
  fetch.mockResolvedValue(response([liveModel], { source: "fallback" }));
  const { result } = renderHook(useModelCatalog);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.models).toEqual([]);
  expect(result.current.error).toBeTruthy();
});
