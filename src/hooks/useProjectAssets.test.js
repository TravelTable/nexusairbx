import { act, renderHook, waitFor } from "@testing-library/react";
import { useProjectAssets } from "./useProjectAssets";
import {
  getGeneratedAssetUploadStatus,
  listProjectAssets,
} from "../lib/robloxAssetLibraryApi";

jest.mock("../lib/robloxAssetLibraryApi", () => ({
  attachProjectAssets: jest.fn(),
  getGeneratedAssetUploadStatus: jest.fn(),
  getProjectAssetUploadSettings: jest.fn(),
  listProjectAssets: jest.fn(),
  removeProjectAsset: jest.fn(),
  setProjectAssetUploadSettings: jest.fn(),
}));

describe("useProjectAssets", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("blocks the asset library only when its required listing request is denied", async () => {
    const permissionError = new Error("Asset access denied");
    permissionError.status = 403;
    permissionError.code = "ASSET_ACCESS_DENIED";
    permissionError.requestId = "req_403";

    listProjectAssets.mockRejectedValue(permissionError);

    const notify = jest.fn();
    const { result } = renderHook(() => useProjectAssets("project_1", { enabled: true, notify }));

    await waitFor(() => expect(result.current.accessBlockedError).toBe(permissionError));
    expect(notify).toHaveBeenCalledWith({
      type: "error",
      message: "Asset access denied (Request ID: req_403)",
    });

    getGeneratedAssetUploadStatus.mockClear();
    act(() => {
      jest.advanceTimersByTime(24000);
    });

    expect(getGeneratedAssetUploadStatus).not.toHaveBeenCalled();
  });

  test("uses optional upload metadata bundled with the project asset response", async () => {
    listProjectAssets.mockResolvedValue({
      assets: [{ assetId: "asset_1", name: "Sword" }],
      uploadSettings: null,
      uploadStatus: { status: "idle", records: [] },
    });

    const notify = jest.fn();
    const { result } = renderHook(() => useProjectAssets("project_1", { enabled: true, notify }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.assets).toEqual([{ assetId: "asset_1", name: "Sword" }]);
    expect(result.current.uploadSettings).toBeNull();
    expect(result.current.uploadStatus).toEqual({ status: "idle", records: [] });
    expect(result.current.accessBlockedError).toBeNull();
    expect(result.current.error).toBeNull();
    expect(notify).not.toHaveBeenCalled();
    expect(getGeneratedAssetUploadStatus).not.toHaveBeenCalled();
  });

  test("polls upload status only while uploads are active", async () => {
    listProjectAssets.mockResolvedValue({
      assets: [],
      uploadSettings: { enabled: true },
      uploadStatus: { status: "uploading", records: [] },
    });
    getGeneratedAssetUploadStatus.mockResolvedValueOnce({ status: "processing", records: [] });

    const { result } = renderHook(() => useProjectAssets("project_1", { enabled: true }));

    await waitFor(() => expect(result.current.uploadStatus.status).toBe("uploading"));
    getGeneratedAssetUploadStatus.mockClear();

    await act(async () => {
      jest.advanceTimersByTime(12000);
      await Promise.resolve();
    });

    await waitFor(() => expect(getGeneratedAssetUploadStatus).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.uploadStatus.status).toBe("processing"));
  });

  test("stops upload-status polling on terminal states", async () => {
    listProjectAssets.mockResolvedValue({
      assets: [],
      uploadSettings: { enabled: true },
      uploadStatus: { status: "uploading", records: [] },
    });
    getGeneratedAssetUploadStatus.mockResolvedValueOnce({ status: "completed", records: [] });

    const { result } = renderHook(() => useProjectAssets("project_1", { enabled: true }));

    await waitFor(() => expect(result.current.uploadStatus.status).toBe("uploading"));

    await act(async () => {
      jest.advanceTimersByTime(12000);
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.uploadStatus.status).toBe("completed"));
    getGeneratedAssetUploadStatus.mockClear();

    act(() => {
      jest.advanceTimersByTime(24000);
    });

    expect(getGeneratedAssetUploadStatus).not.toHaveBeenCalled();
  });
});
