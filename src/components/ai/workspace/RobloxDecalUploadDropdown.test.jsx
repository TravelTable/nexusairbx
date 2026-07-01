import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RobloxDecalUploadDropdown from "./RobloxDecalUploadDropdown";
import { uploadRobloxDecalBatch } from "../../../lib/robloxDecalUploadApi";

jest.mock("@hugeicons/react", () => ({
  HugeiconsIcon: () => <svg aria-hidden="true" data-testid="folder-upload-icon" />,
}));

jest.mock("@hugeicons/core-free-icons", () => ({
  FolderUploadIcon: {},
}));

jest.mock("../../../lib/robloxOAuthApi", () => ({
  beginRobloxOAuth: jest.fn(),
  beginRobloxReauthorization: jest.fn(),
}));

jest.mock("../../../lib/robloxDecalUploadApi", () => ({
  uploadRobloxDecalBatch: jest.fn(),
}));

jest.mock("../../shadcn/dropdown-menu", () => {
  const React = require("react");
  const DropdownContext = React.createContext({ open: false, onOpenChange: null });

  function DropdownMenu({ open, onOpenChange, children }) {
    return React.createElement(
      DropdownContext.Provider,
      { value: { open, onOpenChange } },
      children
    );
  }

  function DropdownMenuTrigger({ children }) {
    const context = React.useContext(DropdownContext);
    const child = React.Children.only(children);
    return React.cloneElement(child, {
      "aria-expanded": context.open ? "true" : "false",
      onClick: (event) => {
        child.props.onClick?.(event);
        context.onOpenChange?.(!context.open);
      },
    });
  }

  function DropdownMenuContent({ children, className }) {
    const context = React.useContext(DropdownContext);
    if (!context.open) return null;
    return React.createElement("div", { role: "menu", className }, children);
  }

  return { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent };
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

async function openDropdown(props = {}) {
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
});

describe("RobloxDecalUploadDropdown", () => {
  test("opens from the header icon and shows the plan cap", async () => {
    await openDropdown({ planKey: "pro_plus" });

    expect(screen.getByText("Upload decals")).toBeTruthy();
    expect(screen.getByText(/Pro Plus: 50 per batch/i)).toBeTruthy();
    expect(screen.getByText(/No decal images selected/i)).toBeTruthy();
  });

  test("shows skipped-file messaging for unsupported selections", async () => {
    await openDropdown();

    fireEvent.change(screen.getByLabelText(/choose decal images/i), {
      target: { files: [file("script.lua", "text/plain", "print('x')")] },
    });

    expect(screen.getByText(/1 file skipped/i)).toBeTruthy();
    expect(screen.getByText(/Only PNG, JPG, BMP, and TGA files/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /upload 0 decals/i }).disabled).toBe(true);
  });

  test("enforces the free plan batch limit before upload", async () => {
    await openDropdown({ planKey: "free" });

    fireEvent.change(screen.getByLabelText(/choose decal images/i), {
      target: {
        files: Array.from({ length: 6 }, (_, index) => file(`decal-${index}.png`)),
      },
    });

    expect(screen.getByText(/Free can upload 5 decals at a time/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /upload 6 decals/i }).disabled).toBe(true);
    expect(uploadRobloxDecalBatch).not.toHaveBeenCalled();
  });

  test("uploads reviewed decals and renders returned asset uri", async () => {
    uploadRobloxDecalBatch.mockImplementation(async ({ items }) => ({
      batchId: "batch-1",
      plan: "FREE",
      limit: 5,
      accepted: 1,
      rejected: 0,
      results: [
        {
          clientId: items[0].clientId,
          fileName: "decal.png",
          displayName: "Decal",
          status: "succeeded",
          assetId: "9001",
          contentUri: "rbxassetid://9001",
          operationId: "op-1",
        },
      ],
    }));
    await openDropdown();

    fireEvent.change(screen.getByLabelText(/choose decal images/i), {
      target: { files: [file("decal.png")] },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload 1 decal/i }));

    await waitFor(() => expect(uploadRobloxDecalBatch).toHaveBeenCalledTimes(1));
    await screen.findByText("rbxassetid://9001");
    expect(screen.getByText(/1 decal uploaded/i)).toBeTruthy();
  });

  test("passes projectId and refreshes attached project assets after upload", async () => {
    const onAttached = jest.fn().mockResolvedValue(undefined);
    uploadRobloxDecalBatch.mockImplementation(async ({ items, projectId }) => ({
      batchId: "batch-2",
      projectId,
      attachedAssets: [{ assetId: "9001", assetType: "Decal", name: "Decal" }],
      results: [
        {
          clientId: items[0].clientId,
          fileName: "decal.png",
          displayName: "Decal",
          status: "succeeded",
          assetId: "9001",
          contentUri: "rbxassetid://9001",
        },
      ],
    }));

    await openDropdown({ projectId: "chat-abc", onAttached });

    fireEvent.change(screen.getByLabelText(/choose decal images/i), {
      target: { files: [file("decal.png")] },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload 1 decal/i }));

    await waitFor(() => expect(uploadRobloxDecalBatch).toHaveBeenCalledTimes(1));
    expect(uploadRobloxDecalBatch.mock.calls[0][0].projectId).toBe("chat-abc");
    await waitFor(() => expect(onAttached).toHaveBeenCalledTimes(1));
  });

  test("supports retrying failed-only uploads after a partial failure", async () => {
    uploadRobloxDecalBatch
      .mockImplementationOnce(async ({ items }) => ({
        batchId: "batch-1",
        results: [
          { clientId: items[0].clientId, fileName: "one.png", displayName: "One", status: "succeeded", assetId: "9001", contentUri: "rbxassetid://9001" },
          { clientId: items[1].clientId, fileName: "two.png", displayName: "Two", status: "failed", error: "Rejected", code: "ROBLOX_ASSET_UPLOAD_FAILED" },
        ],
      }))
      .mockImplementationOnce(async ({ items }) => ({
        batchId: "batch-2",
        results: [
          { clientId: items[0].clientId, fileName: "two.png", displayName: "Two", status: "succeeded", assetId: "9002", contentUri: "rbxassetid://9002" },
        ],
      }));
    await openDropdown({ planKey: "pro" });

    fireEvent.change(screen.getByLabelText(/choose decal images/i), {
      target: { files: [file("one.png"), file("two.png")] },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload 2 decals/i }));
    await screen.findByText(/Rejected/i);

    fireEvent.click(screen.getByRole("button", { name: /retry failed/i }));

    await waitFor(() => expect(uploadRobloxDecalBatch).toHaveBeenCalledTimes(2));
    await screen.findByText("rbxassetid://9002");
    expect(uploadRobloxDecalBatch.mock.calls[1][0].files).toHaveLength(1);
  });
});
