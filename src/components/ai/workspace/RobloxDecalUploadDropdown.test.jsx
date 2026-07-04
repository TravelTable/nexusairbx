import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RobloxDecalUploadDropdown from "./RobloxDecalUploadDropdown";
import { uploadRobloxDecalBatchStream } from "../../../lib/robloxDecalUploadApi";
import { ensureRobloxCapabilities } from "../../../lib/robloxOAuthApi";

jest.mock("@hugeicons/react", () => ({
  HugeiconsIcon: () => <svg aria-hidden="true" data-testid="folder-upload-icon" />,
}));

jest.mock("@hugeicons/core-free-icons", () => ({
  FolderUploadIcon: {},
}));

jest.mock("../../../lib/robloxOAuthApi", () => {
  const actual = jest.requireActual("../../../lib/robloxOAuthApi");
  return {
    ...actual,
    ensureRobloxCapabilities: jest.fn(),
  };
});

jest.mock("../../../lib/robloxDecalUploadApi", () => ({
  uploadRobloxDecalBatchStream: jest.fn(),
}));

jest.mock("../../shadcn/dialog", () => {
  const React = require("react");
  const DialogContext = React.createContext({ open: false, onOpenChange: null });

  function Dialog({ open, onOpenChange, children }) {
    return React.createElement(
      DialogContext.Provider,
      { value: { open, onOpenChange } },
      children
    );
  }

  function DialogContent({ children, onInteractOutside, onPointerDownOutside, onEscapeKeyDown }) {
    const context = React.useContext(DialogContext);
    if (!context.open) return null;
    return React.createElement(
      "div",
      {
        role: "dialog",
        onMouseDown: (event) => {
          if (event.target === event.currentTarget) onInteractOutside?.(event);
        },
        onKeyDown: (event) => {
          if (event.key === "Escape") onEscapeKeyDown?.(event);
        },
      },
      children,
      React.createElement(
        "button",
        {
          type: "button",
          "aria-label": "Close",
          onClick: () => context.onOpenChange?.(false),
        },
        "Close"
      )
    );
  }

  return {
    Dialog,
    DialogContent,
    DialogHeader: ({ children }) => <div>{children}</div>,
    DialogTitle: ({ children }) => <div>{children}</div>,
    DialogDescription: ({ children }) => <div>{children}</div>,
  };
});

function file(name, type = "image/png", body = "image") {
  return new File([body], name, { type });
}

function roblox(overrides = {}) {
  return {
    connected: true,
    selectedCreator: { type: "User", id: "123" },
    status: {
      connected: true,
      capabilities: {
        roblox_upload_asset: { authorized: true, missingScopes: [] },
      },
      connection: {
        selectedCreator: { type: "User", id: "123" },
      },
    },
    refresh: jest.fn(),
    ...overrides,
  };
}

async function openUploadDialog(props = {}) {
  render(
    <RobloxDecalUploadDropdown
      user={{ uid: "user-1" }}
      planKey="free"
      roblox={roblox()}
      notify={jest.fn()}
      {...props}
    />
  );
  await userEvent.click(screen.getByRole("button", { name: /upload roblox decals/i }));
}

beforeAll(() => {
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = jest.fn(() => "blob:test");
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = jest.fn();
  }
});

beforeEach(() => {
  jest.clearAllMocks();
  ensureRobloxCapabilities.mockResolvedValue({ authorized: true });
});

describe("RobloxDecalUploadDropdown", () => {
  test("opens from the header icon and shows the plan cap", async () => {
    await openUploadDialog({ planKey: "pro_plus" });

    expect(screen.getByText("Upload decals")).toBeTruthy();
    expect(screen.getByText(/Pro Plus: 50 per batch/i)).toBeTruthy();
    expect(screen.getByText(/No decal images selected/i)).toBeTruthy();
  });

  test("stays open after selecting files", async () => {
    await openUploadDialog();

    fireEvent.change(screen.getByLabelText(/choose decal images/i), {
      target: { files: [file("decal.png")] },
    });

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Upload decals")).toBeTruthy();
    expect(screen.getByRole("button", { name: /upload 1 decal/i })).toBeTruthy();
  });

  test("shows skipped-file messaging for unsupported selections", async () => {
    await openUploadDialog();

    fireEvent.change(screen.getByLabelText(/choose decal images/i), {
      target: { files: [file("script.lua", "text/plain", "print('x')")] },
    });

    expect(screen.getByText(/1 file skipped/i)).toBeTruthy();
    expect(screen.getByText(/Only PNG, JPG, BMP, and TGA files/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /upload 0 decals/i }).disabled).toBe(true);
  });

  test("enforces the free plan batch limit before upload", async () => {
    await openUploadDialog({ planKey: "free" });

    fireEvent.change(screen.getByLabelText(/choose decal images/i), {
      target: {
        files: Array.from({ length: 6 }, (_, index) => file(`decal-${index}.png`)),
      },
    });

    expect(screen.getByText(/Free can upload 5 decals at a time/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /upload 6 decals/i }).disabled).toBe(true);
    expect(uploadRobloxDecalBatchStream).not.toHaveBeenCalled();
  });

  test("allows unlimited decal batches for dev override accounts", async () => {
    uploadRobloxDecalBatchStream.mockResolvedValue({
      batchId: "batch-dev",
      plan: "TEAM",
      limit: null,
      accepted: 6,
      rejected: 0,
      results: Array.from({ length: 6 }, (_, index) => ({
        clientId: `c${index}`,
        fileName: `decal-${index}.png`,
        displayName: `Decal ${index}`,
        status: "succeeded",
        assetId: String(9000 + index),
        contentUri: `rbxassetid://${9000 + index}`,
      })),
    });

    await openUploadDialog({ planKey: "free", devOverride: true });

    expect(screen.getByText(/Dev: Unlimited per batch/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/choose decal images/i), {
      target: {
        files: Array.from({ length: 6 }, (_, index) => file(`decal-${index}.png`)),
      },
    });

    expect(screen.queryByText(/can upload 5 decals at a time/i)).toBeNull();
    expect(screen.getByRole("button", { name: /upload 6 decals/i }).disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /upload 6 decals/i }));
    await waitFor(() => expect(uploadRobloxDecalBatchStream).toHaveBeenCalledTimes(1));
  });

  test("shows only five inline items and a show more button for larger selections", async () => {
    await openUploadDialog({ planKey: "pro" });

    fireEvent.change(screen.getByLabelText(/choose decal images/i), {
      target: {
        files: Array.from({ length: 7 }, (_, index) => file(`decal-${index}.png`)),
      },
    });

    expect(screen.getAllByLabelText(/display name for decal-/i)).toHaveLength(5);
    expect(screen.getByRole("button", { name: /show 2 more/i })).toBeTruthy();
  });

  test("opens the all-items dialog from show more", async () => {
    await openUploadDialog({ planKey: "pro" });

    fireEvent.change(screen.getByLabelText(/choose decal images/i), {
      target: {
        files: Array.from({ length: 7 }, (_, index) => file(`decal-${index}.png`)),
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /show 2 more/i }));

    expect(screen.getAllByRole("dialog")).toHaveLength(2);
    expect(screen.getByText(/7 images selected/i)).toBeTruthy();
    expect(screen.getByTestId("decal-all-items-list")).toBeTruthy();
  });

  test("uploads reviewed decals with streamed progress and renders returned asset uri", async () => {
    uploadRobloxDecalBatchStream.mockImplementation(async ({ items, onProgress }) => {
      const result = {
        clientId: items[0].clientId,
        fileName: "decal.png",
        displayName: "Decal",
        status: "succeeded",
        assetId: "9001",
        contentUri: "rbxassetid://9001",
        operationId: "op-1",
      };
      onProgress?.(result);
      return {
        batchId: "batch-1",
        plan: "FREE",
        limit: 5,
        accepted: 1,
        rejected: 0,
        results: [result],
      };
    });
    await openUploadDialog();

    fireEvent.change(screen.getByLabelText(/choose decal images/i), {
      target: { files: [file("decal.png")] },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload 1 decal/i }));

    await waitFor(() => expect(uploadRobloxDecalBatchStream).toHaveBeenCalledTimes(1));
    await screen.findByText("rbxassetid://9001");
    expect(screen.getByText(/1 decal uploaded/i)).toBeTruthy();
  });

  test("passes projectId and refreshes attached project assets after upload", async () => {
    const onAttached = jest.fn().mockResolvedValue(undefined);
    uploadRobloxDecalBatchStream.mockImplementation(async ({ items, projectId, onProgress }) => {
      const result = {
        clientId: items[0].clientId,
        fileName: "decal.png",
        displayName: "Decal",
        status: "succeeded",
        assetId: "9001",
        contentUri: "rbxassetid://9001",
      };
      onProgress?.(result);
      return {
        batchId: "batch-2",
        projectId,
        attachedAssets: [{ assetId: "9001", assetType: "Decal", name: "Decal" }],
        results: [result],
      };
    });

    await openUploadDialog({ projectId: "chat-abc", onAttached });

    fireEvent.change(screen.getByLabelText(/choose decal images/i), {
      target: { files: [file("decal.png")] },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload 1 decal/i }));

    await waitFor(() => expect(uploadRobloxDecalBatchStream).toHaveBeenCalledTimes(1));
    expect(uploadRobloxDecalBatchStream.mock.calls[0][0].projectId).toBe("chat-abc");
    await waitFor(() => expect(onAttached).toHaveBeenCalledTimes(1));
  });

  test("supports retrying failed-only uploads after a partial failure", async () => {
    uploadRobloxDecalBatchStream
      .mockImplementationOnce(async ({ items, onProgress }) => {
        const results = [
          { clientId: items[0].clientId, fileName: "one.png", displayName: "One", status: "succeeded", assetId: "9001", contentUri: "rbxassetid://9001" },
          { clientId: items[1].clientId, fileName: "two.png", displayName: "Two", status: "failed", error: "Rejected", code: "ROBLOX_ASSET_UPLOAD_FAILED" },
        ];
        results.forEach((result) => onProgress?.(result));
        return { batchId: "batch-1", results };
      })
      .mockImplementationOnce(async ({ items, onProgress }) => {
        const result = { clientId: items[0].clientId, fileName: "two.png", displayName: "Two", status: "succeeded", assetId: "9002", contentUri: "rbxassetid://9002" };
        onProgress?.(result);
        return { batchId: "batch-2", results: [result] };
      });
    await openUploadDialog({ planKey: "pro" });

    fireEvent.change(screen.getByLabelText(/choose decal images/i), {
      target: { files: [file("one.png"), file("two.png")] },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload 2 decals/i }));
    await screen.findByText(/Rejected/i);

    fireEvent.click(screen.getByRole("button", { name: /retry failed/i }));

    await waitFor(() => expect(uploadRobloxDecalBatchStream).toHaveBeenCalledTimes(2));
    await screen.findByText("rbxassetid://9002");
    expect(uploadRobloxDecalBatchStream.mock.calls[1][0].files).toHaveLength(1);
  });

  test("clears stale reauthorization state when server confirms upload capability", async () => {
    const notify = jest.fn();
    const { rerender } = render(
      <RobloxDecalUploadDropdown
        user={{ uid: "user-1" }}
        planKey="free"
        roblox={roblox({
          status: {
            connected: true,
            capabilities: {
              roblox_upload_asset: { authorized: false, missingScopes: ["asset:read"] },
            },
            connection: {
              selectedCreator: { type: "User", id: "123" },
            },
          },
        })}
        notify={notify}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /upload roblox decals/i }));
    expect(screen.getByText(/Roblox needs additional permission/i)).toBeTruthy();

    rerender(
      <RobloxDecalUploadDropdown
        user={{ uid: "user-1" }}
        planKey="free"
        roblox={roblox({
          status: {
            connected: true,
            capabilities: {
              granted: [{ id: "roblox_upload_asset", available: true, missingScopes: [] }],
              missing: [],
            },
            connection: {
              selectedCreator: { type: "User", id: "123" },
            },
          },
        })}
        notify={notify}
      />
    );

    expect(screen.queryByText(/Roblox needs additional permission/i)).toBeNull();

    fireEvent.change(screen.getByLabelText(/choose decal images/i), {
      target: { files: [file("decal.png")] },
    });

    expect(screen.getByRole("button", { name: /upload 1 decal/i }).disabled).toBe(false);
  });
});
