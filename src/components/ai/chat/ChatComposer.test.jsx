import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TokenBar } from "../AiComponents";
import ChatComposer from "./ChatComposer";

jest.mock("../workspace/StudioControls", () => function StudioControlsStub() {
  return <div>Studio controls</div>;
});

jest.mock("../workspace/StudioPlaceChip", () => function StudioPlaceChipStub() {
  return <button type="button">Studio place</button>;
});

jest.mock("../workspace/RobloxCloudControls", () => function RobloxCloudControlsStub() {
  return <div>Roblox controls</div>;
});

jest.mock("../workspace/AssetLibraryModal", () => function AssetLibraryModalStub() {
  return null;
});

jest.mock("./AnimatedPromptPlaceholder", () => function AnimatedPromptPlaceholderStub() {
  return null;
});

jest.mock("./ComposerCommandMenu", () => function ComposerCommandMenuStub() {
  return <div>Command menu</div>;
});

jest.mock("../../../hooks/useMotionPresence", () => ({
  useMotionPresence: (open) => ({ present: open, entering: open }),
}));

const baseProps = {
  prompt: "",
  setPrompt: jest.fn(),
  attachments: [],
  setAttachments: jest.fn(),
  onSubmit: jest.fn(),
  onFileUpload: jest.fn(),
  onModeChange: jest.fn(),
  mode: "agent",
  view: "chat",
  onViewChange: jest.fn(),
  studioEnabled: true,
  studioPlaceOptions: [],
  robloxImageUploads: [],
  robloxProjectAssets: [],
  planKey: "free",
  unlimitedTokens: true,
};

function renderComposer(overrides = {}) {
  return render(<ChatComposer {...baseProps} {...overrides} />);
}

describe("ChatComposer compact interactions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.requestAnimationFrame = (callback) => {
      callback();
      return 1;
    };
  });

  test("preserves integration hooks and starts with settings collapsed", () => {
    renderComposer();

    expect(document.getElementById("tour-prompt-box").getAttribute("data-tour")).toBe("prompt-input");
    expect(document.getElementById("chat-composer-file-upload")).toBeTruthy();
    expect(document.getElementById("tour-generate-button").getAttribute("data-tour")).toBe("generate-btn");
    expect(screen.queryByRole("dialog", { name: "Studio and Roblox settings" })).toBeNull();
    expect(screen.getByTitle("Show Studio and Roblox controls").getAttribute("aria-expanded")).toBe("false");
  });

  test("opens settings in a bounded panel and closes on Escape or outside click", async () => {
    renderComposer();
    const settingsButton = screen.getByTitle("Show Studio and Roblox controls");

    fireEvent.click(settingsButton);
    const panel = await screen.findByRole("dialog", { name: "Studio and Roblox settings" });
    expect(settingsButton.getAttribute("aria-expanded")).toBe("true");
    expect(panel.style.maxHeight).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Studio and Roblox settings" })).toBeNull());
    expect(document.activeElement).toBe(settingsButton);

    fireEvent.click(settingsButton);
    await screen.findByRole("dialog", { name: "Studio and Roblox settings" });
    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Studio and Roblox settings" })).toBeNull());
  });

  test("forwards file selection and preserves send disablement", () => {
    const onFileUpload = jest.fn();
    const { rerender } = renderComposer({ onFileUpload });
    const input = document.getElementById("chat-composer-file-upload");
    const file = new File(["print('hi')"], "main.lua", { type: "text/plain" });
    const inputClick = jest.spyOn(input, "click");

    fireEvent.click(screen.getByRole("button", { name: "Upload image to Roblox or attach a code/text file" }));
    expect(inputClick).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileUpload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Send prompt" }).disabled).toBe(true);

    rerender(<ChatComposer {...baseProps} prompt="Build a shop" />);
    expect(screen.getByRole("button", { name: "Send prompt" }).disabled).toBe(false);

    rerender(<ChatComposer {...baseProps} prompt="Build a shop" disabled />);
    expect(screen.getByRole("button", { name: "Send prompt" }).disabled).toBe(true);
  });

  test("Enter submits while Shift+Enter and IME composition do not", () => {
    const onSubmit = jest.fn();
    renderComposer({ prompt: "Build it", onSubmit });
    const textarea = screen.getByRole("textbox", { name: "Prompt input" });

    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.compositionStart(textarea);
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.compositionEnd(textarea);

    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test("textarea grows to 144px and then scrolls internally", () => {
    const { rerender } = renderComposer({ prompt: "short" });
    const textarea = screen.getByRole("textbox", { name: "Prompt input" });
    Object.defineProperty(textarea, "scrollHeight", { configurable: true, value: 320 });

    rerender(<ChatComposer {...baseProps} prompt="long\ncontent" />);
    expect(textarea.style.height).toBe("144px");
    expect(textarea.style.overflowY).toBe("auto");

    Object.defineProperty(textarea, "scrollHeight", { configurable: true, value: 20 });
    rerender(<ChatComposer {...baseProps} prompt="short again" />);
    expect(textarea.style.height).toBe("44px");
    expect(textarea.style.overflowY).toBe("hidden");
  });
});

describe("TokenBar compact states", () => {
  test("renders unlimited and healthy usage without a progress track", () => {
    const { rerender } = render(<TokenBar compact unlimitedTokens devOverride plan="free" />);
    expect(screen.getByText("Dev unlimited")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();

    rerender(<TokenBar compact plan="free" isFreeUsagePlan dailyUsage={{ percentUsed: 40 }} />);
    expect(screen.getByText("40%")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  test("retains a progress warning at 85 percent", () => {
    render(<TokenBar compact plan="free" isFreeUsagePlan dailyUsage={{ percentUsed: 85 }} />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("85");
    expect(screen.getByText("Upgrade to Pro")).toBeTruthy();
  });

  test("keeps loading and unavailable states compact", () => {
    const { rerender } = render(<TokenBar compact plan="free" usageLoading />);
    expect(screen.getByText("checking...")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();

    rerender(<TokenBar compact plan="free" usageUnavailable />);
    expect(screen.getByText("unavailable")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
