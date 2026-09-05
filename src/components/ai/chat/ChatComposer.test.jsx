import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  studioConnected: true,
  studioConnectionType: "plugin_bridge",
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

  test("preserves integration hooks and removes the legacy workspace-options button", () => {
    renderComposer();

    expect(screen.getByRole("textbox", { name: "Prompt input" }).getAttribute("data-tour")).toBe("prompt-input");
    expect(screen.getByLabelText("Attach files")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send prompt" }).getAttribute("data-tour")).toBe("generate-btn");
    expect(
      screen.queryByRole("dialog", { name: "Workspace options" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Open workspace options" })).toBeNull();
    expect(screen.getByRole("button", { name: "Build options" })).toHaveAttribute("aria-pressed", "false");
  });

  test("separates same-operation recovery from a new retry attempt", () => {
    const onSendNext = jest.fn();
    const { rerender } = renderComposer({
      operationState: {
        paused: true,
        lastStatus: "Recovering",
        queue: [{ id: "operation-1", status: "Recovering", prompt: "Build a lobby" }],
      },
      onSendNext,
      onResumeQueue: jest.fn(),
    });

    fireEvent.click(screen.getByRole("button", { name: "Reconnect / Resume" }));
    expect(onSendNext).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Resume queue" })).not.toBeInTheDocument();

    rerender(
      <ChatComposer
        {...baseProps}
        operationState={{
          paused: true,
          lastStatus: "Failed",
          queue: [{ id: "operation-2", status: "Failed", prompt: "Build a lobby" }],
        }}
        onSendNext={onSendNext}
        onResumeQueue={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Retry as new attempt" })).toBeInTheDocument();
  });

  test("keeps primary composer actions touch-sized below desktop", () => {
    renderComposer();

    const upload = screen.getByRole("button", {
      name: "Upload image to Roblox or attach a code/text file",
    });
    const mode = screen.getByTitle("Choose conversation mode");
    const send = screen.getByRole("button", { name: "Send prompt" });

    for (const control of [upload, mode, send]) {
      expect(control.className).toContain("h-11");
    }
    expect(upload.className).toContain("w-11");
    expect(send.className).toContain("w-11");
    expect(screen.queryByRole("button", { name: "Open workspace options" })).toBeNull();
    expect(screen.queryByTitle("Plan before making changes")).toBeNull();
    expect(screen.getByRole("button", { name: "Usage" })).toBeInTheDocument();
  });

  test("supports complete keyboard navigation and focus restoration in the mode listbox", async () => {
    const onModeChange = jest.fn();
    renderComposer({ onModeChange });
    const trigger = screen.getByTitle("Choose conversation mode");

    fireEvent.click(trigger);
    expect(
      screen.getByRole("listbox", { name: "Conversation mode" }),
    ).toBeTruthy();
    const agent = screen.getByRole("option", { name: /Agent Builds autonomously/i });
    const plan = screen.getByRole("option", { name: /Plan Discusses the approach/i });
    const ask = screen.getByRole("option", { name: /Ask Talks through the project/i });
    await waitFor(() => expect(agent).toHaveFocus());

    fireEvent.keyDown(agent, { key: "ArrowDown" });
    expect(plan).toHaveFocus();
    fireEvent.keyDown(plan, { key: "ArrowDown" });
    expect(ask).toHaveFocus();
    fireEvent.keyDown(ask, { key: "End" });
    expect(agent).toHaveFocus();
    fireEvent.keyDown(agent, { key: "Home" });
    expect(plan).toHaveFocus();
    fireEvent.keyDown(plan, { key: "ArrowUp" });
    expect(agent).toHaveFocus();
    fireEvent.keyDown(agent, { key: "ArrowDown" });
    expect(plan).toHaveFocus();
    fireEvent.keyDown(plan, { key: "Enter" });

    expect(onModeChange).toHaveBeenCalledWith("plan");
    expect(
      screen.queryByRole("listbox", { name: "Conversation mode" }),
    ).toBeNull();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /Agent Builds autonomously/i })).toHaveFocus(),
    );
    fireEvent.keyDown(
      screen.getByRole("option", { name: /Agent Builds autonomously/i }),
      { key: "Escape" },
    );
    expect(
      screen.queryByRole("listbox", { name: "Conversation mode" }),
    ).toBeNull();
    expect(trigger).toHaveFocus();

    fireEvent.keyDown(trigger, { key: "ArrowUp" });
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /Agent Builds autonomously/i })).toHaveFocus(),
    );
  });

  test("explains Agent, Plan, and Ask behavior in the composer", () => {
    const { rerender } = renderComposer();
    expect(screen.getByText(/What should Nexus do\?/).textContent).toContain("Acts automatically");

    rerender(<ChatComposer {...baseProps} mode="plan" />);
    expect(screen.getByText(/What should Nexus plan\?/).textContent).toContain("no changes until you proceed");

    rerender(<ChatComposer {...baseProps} mode="ask" />);
    expect(screen.getByText(/What do you want to know\?/).textContent).toContain(
      "Answers with project context · no changes"
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
      mode: "ask",
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

  test("opens build options from the dock and closes on Escape or outside click", async () => {
    renderComposer();
    const settingsButton = screen.getByRole("button", { name: "Build options" });

    fireEvent.click(settingsButton);
    const panel = await screen.findByRole("dialog", { name: "Build options" });
    expect(settingsButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Build options" })).toBeTruthy();
    expect(panel.className).toContain("absolute");
    expect(panel.className).toContain("bottom-[58px]");
    expect(panel.className).not.toContain("inset-y-0");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Build options" })).toBeNull(),
    );

    fireEvent.click(settingsButton);
    await screen.findByRole("dialog", { name: "Build options" });
    fireEvent.pointerDown(document.body);
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Build options" })).toBeNull(),
    );
  });

  test("collapses prompt context after three items and opens the context manager", () => {
    const attachments = Array.from({ length: 5 }, (_, index) => ({
      name: `Script${index + 1}.lua`,
    }));
    renderComposer({ studioEnabled: false, studioConnected: false, attachments });

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

  test("reveals usage inside the dock build options", () => {
    renderComposer();

    expect(screen.queryByRole("region", { name: "Usage details" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Build options" }));
    expect(screen.getByRole("region", { name: "Usage details" })).toBeTruthy();
    expect(screen.getByText("Unlimited")).toBeTruthy();
  });

  test("forwards file selection and preserves send disablement", () => {
    const onFileUpload = jest.fn();
    const { rerender } = renderComposer({ onFileUpload });
    const input = screen.getByLabelText("Attach files");
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

  test("allows Agent submission through either execution-ready Studio provider", () => {
    const onSubmit = jest.fn();
    const { rerender } = renderComposer({
      prompt: "Build a fly GUI",
      onSubmit,
      studioEnabled: true,
      studioConnected: true,
      studioConnectionType: "plugin_bridge",
    });
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Prompt input" }), {
      key: "Enter",
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);

    rerender(
      <ChatComposer
        {...baseProps}
        prompt="Build a fly GUI"
        onSubmit={onSubmit}
        studioEnabled
        studioConnected
        studioConnectionType="mcp_local"
        studioConnectionState="mcp"
      />,
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Studio ready")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Prompt input" }), {
      key: "Enter",
    });
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  test("explains when a connected legacy plugin must be updated before building", () => {
    renderComposer({
      prompt: "Build a running game",
      studioEnabled: true,
      studioConnected: false,
      studioConnectionType: "plugin_bridge",
      studioConnectionState: "plugin_update_required",
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Update the Studio plugin to apply changes."
    );
    expect(screen.getByText("Studio plugin update required")).toBeInTheDocument();
  });

  test("opens Studio connection from the disconnected recovery action", () => {
    const onStudioConnectionOpen = jest.fn();
    renderComposer({
      prompt: "Build a fly GUI",
      studioEnabled: true,
      studioConnected: false,
      onStudioConnectionOpen,
    });

    expect(screen.getByRole("alert").textContent).toContain(
      "Connect Studio to apply changes.",
    );

    const recoveryAction = screen.getByRole("button", {
      name: "Connect Studio",
    });
    expect(recoveryAction.getAttribute("aria-haspopup")).toBe("dialog");
    expect(recoveryAction.getAttribute("aria-controls")).toBe(
      "studio-connection-dialog",
    );
    fireEvent.click(recoveryAction);
    expect(onStudioConnectionOpen).toHaveBeenLastCalledWith(recoveryAction);
    expect(onStudioConnectionOpen).toHaveBeenCalledTimes(1);
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

  test("consumes a submission failure after the chat flow has rendered it", async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error("Studio agent reached its runtime limit"));
    renderComposer({ prompt: "Build a running game", onSubmit });

    fireEvent.click(screen.getByRole("button", { name: "Send prompt" }));
    await act(async () => Promise.resolve());

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

  test("shows brief success feedback when generation completes", () => {
    jest.useFakeTimers();
    try {
      const { rerender } = renderComposer({ isGenerating: true, onStop: jest.fn() });
      rerender(<ChatComposer {...baseProps} isGenerating={false} />);

      const composer = screen.getByRole("textbox", { name: "Prompt input" }).closest("[data-tour='prompt-composer']");
      expect(composer.dataset.state).toBe("success");

      act(() => jest.advanceTimersByTime(1400));
      expect(composer.dataset.state).toBe("idle");
    } finally {
      jest.useRealTimers();
    }
  });

  test("textarea starts slim, expands to 176px, and then scrolls internally", () => {
    const { rerender } = renderComposer({ prompt: "short" });
    const textarea = screen.getByRole("textbox", { name: "Prompt input" });
    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      value: 320,
    });

    rerender(<ChatComposer {...baseProps} prompt="long\ncontent" />);
    expect(textarea.style.height).toBe("176px");
    expect(textarea.style.overflowY).toBe("auto");
    expect(textarea.closest("[data-tour='prompt-composer']").dataset.expanded).toBe("true");

    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      value: 20,
    });
    rerender(<ChatComposer {...baseProps} prompt="short again" />);
    expect(textarea.style.height).toBe("40px");
    expect(textarea.style.overflowY).toBe("hidden");
    expect(textarea.closest("[data-tour='prompt-composer']").dataset.expanded).toBe("false");
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
