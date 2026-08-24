import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TokenBar } from "../AiComponents";
import ChatComposer from "./ChatComposer";

jest.mock(
  "../workspace/StudioControls",
  () =>
    function StudioControlsStub() {
      return <div>Studio controls</div>;
    },
);

jest.mock(
  "../workspace/StudioPlaceChip",
  () =>
    function StudioPlaceChipStub({ onRequestConnect }) {
      return (
        <button
          type="button"
          onClick={(event) => onRequestConnect?.(event.currentTarget)}
        >
          {onRequestConnect ? "Studio disconnected · Connect" : "Studio place"}
        </button>
      );
    },
);

jest.mock(
  "../workspace/RobloxCloudControls",
  () =>
    function RobloxCloudControlsStub() {
      return <div>Roblox controls</div>;
    },
);

jest.mock(
  "../workspace/AssetLibraryModal",
  () =>
    function AssetLibraryModalStub() {
      return null;
    },
);

jest.mock(
  "./ComposerCommandMenu",
  () =>
    function ComposerCommandMenuStub() {
      return <div>Command menu</div>;
    },
);

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
  studioEnabled: false,
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

    expect(
      document.getElementById("tour-prompt-box").getAttribute("data-tour"),
    ).toBe("prompt-input");
    expect(document.getElementById("chat-composer-file-upload")).toBeTruthy();
    expect(
      document.getElementById("tour-generate-button").getAttribute("data-tour"),
    ).toBe("generate-btn");
    expect(
      screen.queryByRole("dialog", { name: "Workspace options" }),
    ).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Open workspace options" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
  });

  test("keeps primary composer actions touch-sized below desktop", () => {
    renderComposer();

    const upload = screen.getByRole("button", {
      name: "Upload image to Roblox or attach a code/text file",
    });
    const mode = screen.getByTitle("Choose conversation mode");
    const settings = screen.getByRole("button", {
      name: "Open workspace options",
    });
    const send = screen.getByRole("button", { name: "Send prompt" });

    for (const control of [upload, mode, settings, send]) {
      expect(control.className).toContain("h-11");
    }
    expect(upload.className).toContain("w-11");
    expect(settings.className).toContain("w-11");
    expect(send.className).toContain("w-11");
    expect(screen.queryByTitle("Plan before making changes")).toBeNull();
    expect(screen.queryByRole("button", { name: "Usage" })).toBeNull();
  });

  test("supports complete keyboard navigation and focus restoration in the mode listbox", async () => {
    const onModeChange = jest.fn();
    renderComposer({ onModeChange });
    const trigger = screen.getByTitle("Choose conversation mode");

    fireEvent.click(trigger);
    expect(
      screen.getByRole("listbox", { name: "Conversation mode" }),
    ).toBeTruthy();
    const build = screen.getByRole("option", { name: /Build Builds autonomously/i });
    const plan = screen.getByRole("option", { name: /Plan Discusses the approach/i });
    await waitFor(() => expect(document.activeElement).toBe(build));

    fireEvent.keyDown(build, { key: "ArrowDown" });
    expect(document.activeElement).toBe(plan);
    fireEvent.keyDown(plan, { key: "End" });
    expect(document.activeElement).toBe(plan);
    fireEvent.keyDown(plan, { key: "Home" });
    expect(document.activeElement).toBe(build);
    fireEvent.keyDown(build, { key: "ArrowUp" });
    expect(document.activeElement).toBe(plan);
    fireEvent.keyDown(plan, { key: "Enter" });

    expect(onModeChange).toHaveBeenCalledWith("plan");
    expect(
      screen.queryByRole("listbox", { name: "Conversation mode" }),
    ).toBeNull();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("option", { name: /Build Builds autonomously/i }),
      ),
    );
    fireEvent.keyDown(
      screen.getByRole("option", { name: /Build Builds autonomously/i }),
      { key: "Escape" },
    );
    expect(
      screen.queryByRole("listbox", { name: "Conversation mode" }),
    ).toBeNull();
    expect(document.activeElement).toBe(trigger);

    fireEvent.keyDown(trigger, { key: "ArrowUp" });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("option", { name: /Plan Discusses the approach/i }),
      ),
    );
  });

  test("explains autonomous Build and read-only Plan behavior in the composer", () => {
    const { container, rerender } = renderComposer();
    expect(container.querySelector(".nexus-composer__request-label")?.textContent).toContain(
      "What should Nexus build?",
    );
    expect(container.querySelector(".nexus-composer__request-label")?.textContent).toContain(
      "Starts automatically",
    );

    rerender(<ChatComposer {...baseProps} mode="plan" />);
    expect(container.querySelector(".nexus-composer__request-label")?.textContent).toContain(
      "What should Nexus plan?",
    );
    expect(container.querySelector(".nexus-composer__request-label")?.textContent).toContain(
      "no changes until you approve",
    );
  });

  test("uses a 16px prompt font on mobile to avoid input zoom", () => {
    renderComposer();
    const promptInput = screen.getByRole("textbox", { name: "Prompt input" });
    expect(promptInput.className).toContain("nexus-composer__input");
    expect(promptInput.className).toContain("text-[16px]");
    expect(promptInput.className).toContain("xl:text-[15px]");
  });

  test("shows continuing-from-earlier-message chip while rewind target is set", () => {
    const onCancelRewind = jest.fn();
    renderComposer({
      rewindTarget: { messageId: "u1", mode: "replace" },
      onCancelRewind,
    });

    expect(screen.getByText("Continuing from earlier message")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Cancel edit from earlier message" }),
    );
    expect(onCancelRewind).toHaveBeenCalledTimes(1);
  });

  test("shows refine mode chip, quick suggestions, and cancels on Escape", () => {
    const onCancelRefine = jest.fn();
    const onSubmit = jest.fn();
    renderComposer({
      refineTarget: {
        title: "Lobby System",
        revision: "abcdef12",
        files: [{ path: "ServerScriptService/Main", content: "print(1)" }],
      },
      onCancelRefine,
      onSubmit,
      studioConnected: false,
    });

    expect(screen.getByText(/Refining workspace:/)).toBeTruthy();
    expect(screen.getByText(/Lobby System/)).toBeTruthy();
    expect(
      screen.getByRole("group", { name: "Quick refine suggestions" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Add validation/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      null,
      "Add server-side validation and type checks for remote inputs",
      expect.objectContaining({
        draftRevision: expect.stringContaining("quick-refine:"),
      }),
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancelRefine).toHaveBeenCalledTimes(1);
  });

  test("opens advanced settings in a popover and closes on Escape or outside click", async () => {
    renderComposer();
    const settingsButton = screen.getByRole("button", {
      name: "Open workspace options",
    });

    fireEvent.click(settingsButton);
    const panel = await screen.findByRole("dialog", {
      name: "Workspace options",
    });
    expect(settingsButton.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByRole("heading", { name: "Workspace options" }),
    ).toBeTruthy();
    expect(panel.className).toContain("absolute");
    expect(panel.className).toContain("bottom-full");
    expect(panel.className).not.toContain("inset-y-0");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Workspace options" }),
      ).toBeNull(),
    );
    expect(document.activeElement).toBe(settingsButton);

    fireEvent.click(settingsButton);
    await screen.findByRole("dialog", { name: "Workspace options" });
    fireEvent.mouseDown(document.body);
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Workspace options" }),
      ).toBeNull(),
    );
  });

  test("collapses prompt context after three items and opens the context manager", () => {
    const attachments = Array.from({ length: 5 }, (_, index) => ({
      name: `Script${index + 1}.lua`,
    }));
    renderComposer({ studioEnabled: false, attachments });

    expect(
      screen.getByRole("button", { name: "Show 2 more context items" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("dialog", { name: "All prompt context" }),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Show 2 more context items" }),
    );
    expect(
      screen.getByRole("dialog", { name: "All prompt context" }),
    ).toBeTruthy();
    expect(screen.getAllByText("Script5.lua").length).toBeGreaterThan(0);
  });

  test("reveals usage only inside progressively disclosed workspace options", () => {
    renderComposer();

    expect(screen.queryByRole("region", { name: "Usage details" })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Open workspace options" }),
    );
    expect(screen.getByRole("region", { name: "Usage details" })).toBeTruthy();
    expect(screen.getByText("Unlimited")).toBeTruthy();
  });

  test("forwards file selection and preserves send disablement", () => {
    const onFileUpload = jest.fn();
    const { rerender } = renderComposer({ onFileUpload });
    const input = document.getElementById("chat-composer-file-upload");
    const file = new File(["print('hi')"], "main.lua", { type: "text/plain" });
    const inputClick = jest.spyOn(input, "click");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Upload image to Roblox or attach a code/text file",
      }),
    );
    expect(inputClick).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileUpload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Send prompt" }).disabled).toBe(
      true,
    );

    rerender(<ChatComposer {...baseProps} prompt="Build a shop" />);
    expect(screen.getByRole("button", { name: "Send prompt" }).disabled).toBe(
      false,
    );

    rerender(<ChatComposer {...baseProps} prompt="Build a shop" disabled />);
    expect(screen.getByRole("button", { name: "Send prompt" }).disabled).toBe(
      true,
    );
  });

  test("blocks Agent Build until an opaque live Studio target is selected", () => {
    const onSubmit = jest.fn();
    const onStudioPlacePickerOpenChange = jest.fn();
    const onStudioConnectionOpen = jest.fn();
    const studioPlaceOptions = [
      {
        id: "studio_target_1",
        studioTargetId: "studio_target_1",
        label: "Local project",
        placeId: null,
        universeId: null,
      },
    ];
    const { rerender } = renderComposer({
      prompt: "Build a fly GUI",
      onSubmit,
      studioEnabled: true,
      studioConnected: true,
      studioPlaceOptions,
      onStudioPlacePickerOpenChange,
      onStudioConnectionOpen,
    });

    expect(screen.getByRole("alert").textContent).toContain("Build paused");
    expect(screen.getByRole("alert").textContent).toContain("Choose which Studio place");
    expect(document.getElementById("tour-generate-button").disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Choose place" }));
    expect(onStudioPlacePickerOpenChange).toHaveBeenCalledWith(true);
    expect(onStudioConnectionOpen).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Prompt input" }), {
      key: "Enter",
    });
    expect(onSubmit).not.toHaveBeenCalled();

    rerender(
      <ChatComposer
        {...baseProps}
        prompt="Build a fly GUI"
        onSubmit={onSubmit}
        studioEnabled
        studioConnected
        studioPlaceOptions={studioPlaceOptions}
        studioPlacePreference={{
          targetId: "studio_target_1",
          placeId: null,
          label: "Local project",
        }}
      />,
    );

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Send prompt" }).disabled).toBe(false);
  });

  test("opens Studio connection directly from both disconnected recovery controls", () => {
    const onStudioConnectionOpen = jest.fn();
    const onStudioPlacePickerOpenChange = jest.fn();
    renderComposer({
      prompt: "Build a fly GUI",
      studioEnabled: true,
      studioConnected: false,
      onStudioConnectionOpen,
      onStudioPlacePickerOpenChange,
    });

    expect(screen.getByRole("alert").textContent).toContain(
      "Connect Studio and open the project you want Nexus to build in.",
    );
    expect(screen.getByRole("alert").textContent).not.toContain("published");

    const disconnectedChip = screen.getByRole("button", {
      name: "Studio disconnected · Connect",
    });
    fireEvent.click(disconnectedChip);
    expect(onStudioConnectionOpen).toHaveBeenLastCalledWith(disconnectedChip);

    const recoveryAction = screen.getByRole("button", {
      name: "Studio options",
    });
    expect(recoveryAction.getAttribute("aria-haspopup")).toBe("dialog");
    expect(recoveryAction.getAttribute("aria-controls")).toBe(
      "studio-connection-dialog",
    );
    fireEvent.click(recoveryAction);
    expect(onStudioConnectionOpen).toHaveBeenLastCalledWith(recoveryAction);
    expect(onStudioConnectionOpen).toHaveBeenCalledTimes(2);
    expect(onStudioPlacePickerOpenChange).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "Workspace options" }),
    ).toBeNull();
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

  test("morphs Send into Stop while ordinary Enter queues, Cmd/Ctrl+Enter interrupts, and Escape stops", () => {
    const onSubmit = jest.fn();
    const onStop = jest.fn();
    renderComposer({
      prompt: "Build it",
      isGenerating: true,
      onSubmit,
      onStop,
    });

    expect(screen.queryByRole("button", { name: "Send prompt" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Stop generation" }));
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Prompt input" }), {
      key: "Enter",
    });
    expect(onSubmit).toHaveBeenLastCalledWith(
      expect.anything(),
      null,
      expect.objectContaining({ interrupt: false }),
    );

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Prompt input" }), {
      key: "Enter",
      metaKey: true,
    });
    expect(onSubmit).toHaveBeenLastCalledWith(
      expect.anything(),
      null,
      expect.objectContaining({ interrupt: true }),
    );

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Prompt input" }), {
      key: "Escape",
    });
    expect(onStop).toHaveBeenCalledTimes(2);
  });

  test("textarea grows from 72px to 160px and then scrolls internally", () => {
    const { rerender } = renderComposer({ prompt: "short" });
    const textarea = screen.getByRole("textbox", { name: "Prompt input" });
    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      value: 320,
    });

    rerender(<ChatComposer {...baseProps} prompt="long\ncontent" />);
    expect(textarea.style.height).toBe("160px");
    expect(textarea.style.overflowY).toBe("auto");

    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      value: 20,
    });
    rerender(<ChatComposer {...baseProps} prompt="short again" />);
    expect(textarea.style.height).toBe("72px");
    expect(textarea.style.overflowY).toBe("hidden");
  });
});

describe("TokenBar compact states", () => {
  test("renders unlimited and healthy usage without a progress track", () => {
    const { rerender } = render(
      <TokenBar compact unlimitedTokens devOverride plan="free" />,
    );
    expect(screen.getByText("Dev unlimited")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();

    rerender(
      <TokenBar
        compact
        plan="free"
        isFreeUsagePlan
        dailyUsage={{ percentUsed: 40 }}
      />,
    );
    expect(screen.getByText("40%")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  test("retains a progress warning at 85 percent", () => {
    render(
      <TokenBar
        compact
        plan="free"
        isFreeUsagePlan
        dailyUsage={{ percentUsed: 85 }}
      />,
    );
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "85",
    );
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
