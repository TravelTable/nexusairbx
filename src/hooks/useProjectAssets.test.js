import { act, renderHook, waitFor } from "@testing-library/react";
import { useProjectAssets } from "./useProjectAssets";
import {
  getGeneratedAssetUploadStatus,
  getProjectAssetUploadSettings,
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

  test("stops upload-status polling after a permission error", async () => {
    const permissionError = new Error("Asset access denied");
    permissionError.status = 403;
    permissionError.code = "ASSET_ACCESS_DENIED";
    permissionError.requestId = "req_403";

    listProjectAssets.mockResolvedValue({ assets: [] });
    getProjectAssetUploadSettings.mockResolvedValue({ enabled: false });
    getGeneratedAssetUploadStatus.mockRejectedValue(permissionError);

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
});
