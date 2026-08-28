import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AnimateWorkspace from "./AnimateWorkspace";
import { generateAnimation, refineAnimation, sendAnimationToStudio } from "lib/animationApi";

jest.mock("lib/animationApi", () => ({
  generateAnimation: jest.fn(),
  refineAnimation: jest.fn(),
  sendAnimationToStudio: jest.fn(),
}));

jest.mock("./animation/R15Preview", () => ({ animation, currentTime, modelUrl }) => (
  <div data-testid="r15-preview" data-variant={animation?.variant?.id || "none"} data-time={currentTime} data-model-url={modelUrl} />
));

function variant(id, label, loop = false) {
  return {
    schemaVersion: 1,
    durationMs: 2000,
    loop,
    variant: { id, label, energy: 0.7, tempo: 1 },
    quality: { jointLimitPass: true, loopClosurePass: true, keyframeCount: 9 },
    keyframes: [
      { timeMs: 0, joints: {} },
      { timeMs: 2000, joints: {} },
    ],
  };
}

function animationFixture(overrides = {}) {
  return {
    id: "anim_1",
    name: "Hero landing",
    prompt: "hero landing",
    rigType: "R15",
    version: 1,
    planner: "ai:test-model",
    modelRouting: {
      requested: "anthropic/claude-sonnet-5",
      resolved: "anthropic/claude-sonnet-5",
      fallbackUsed: false,
      attempts: [{ model: "anthropic/claude-sonnet-5", phase: "plan", status: "succeeded", latencyMs: 50 }],
      repaired: false,
      deterministicFallback: false,
    },
    selectedVariantId: "balanced",
    plan: {
      archetype: "jump",
      style: "heroic",
      mood: "confident",
      handedness: "neutral",
      phases: [
        { name: "anticipation", start: 0, end: 0.3 },
        { name: "action", start: 0.3, end: 0.7 },
        { name: "recovery", start: 0.7, end: 1 },
      ],
    },
    libraryMatches: [{ id: "clip_1" }],
    variants: [variant("balanced", "Balanced"), variant("subtle", "Subtle"), variant("expressive", "Expressive")],
    ...overrides,
  };
}

describe("AnimateWorkspace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    URL.createObjectURL = jest.fn(() => "blob:custom-r15");
    URL.revokeObjectURL = jest.fn();
  });

  test("generates three AI variants from a motion brief and switches the preview", async () => {
    generateAnimation.mockResolvedValue(animationFixture());
    const refreshBilling = jest.fn();
    render(<AnimateWorkspace modelVersion="anthropic/claude-sonnet-5" onBillingRefresh={refreshBilling} />);

    fireEvent.change(screen.getByLabelText("Animation brief"), { target: { value: "A heroic landing" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await screen.findByText(/I built 3 R15 jump variants/i);
    expect(generateAnimation).toHaveBeenCalledWith({
      prompt: "A heroic landing",
      modelVersion: "anthropic/claude-sonnet-5",
      previewModelId: "blocky-r15",
      previewModelLabel: "Blocky R15",
    });
    expect(screen.getByText("Generated with Claude Sonnet 5")).toBeTruthy();
    expect(refreshBilling).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("r15-preview").getAttribute("data-variant")).toBe("balanced");

    fireEvent.click(screen.getByRole("button", { name: /02 Subtle/i }));
    expect(screen.getByTestId("r15-preview").getAttribute("data-variant")).toBe("subtle");
  });

  test("refines the selected animation conversationally", async () => {
    generateAnimation.mockResolvedValue(animationFixture());
    refineAnimation.mockResolvedValue(animationFixture({ version: 2, name: "Heavy hero landing" }));
    render(<AnimateWorkspace modelVersion="anthropic/claude-sonnet-5" />);

    fireEvent.change(screen.getByLabelText("Animation brief"), { target: { value: "Hero landing" } });
    fireEvent.submit(screen.getByLabelText("Animation brief").closest("form"));
    await screen.findByLabelText("Refine this animation");

    fireEvent.change(screen.getByLabelText("Refine this animation"), { target: { value: "Make it heavier" } });
    fireEvent.click(screen.getByRole("button", { name: "Refine" }));

    await screen.findByText(/version 2/i);
    expect(refineAnimation).toHaveBeenCalledWith("anim_1", {
      prompt: "Make it heavier",
      modelVersion: "anthropic/claude-sonnet-5",
      previewModelId: "blocky-r15",
      previewModelLabel: "Blocky R15",
    });
    expect(screen.getByDisplayValue("Heavy hero landing")).toBeTruthy();
  });

  test("starts a fresh animation chat without deleting the saved animation", async () => {
    generateAnimation.mockResolvedValue(animationFixture());
    render(<AnimateWorkspace />);

    fireEvent.change(screen.getByLabelText("Animation brief"), { target: { value: "Hero landing" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await screen.findByText(/I built 3 R15 jump variants/i);
    window.localStorage.setItem("nexusrbx:animation-draft", "saved-draft");

    fireEvent.click(screen.getByRole("button", { name: "New animation" }));

    expect(screen.getByLabelText("Animation brief")).toBeTruthy();
    expect(screen.getByDisplayValue("New R15 animation")).toBeTruthy();
    expect(screen.getByTestId("r15-preview").getAttribute("data-variant")).toBe("none");
    expect(screen.getAllByText("0/3").length).toBeGreaterThan(0);
    expect(window.localStorage.getItem("nexusrbx:animation-draft")).toBeNull();
    expect(generateAnimation).toHaveBeenCalledTimes(1);
  });

  test("selects the default model and imports a custom R15 GLB preview", () => {
    render(<AnimateWorkspace />);
    expect(screen.getByLabelText("Preview model").value).toBe("blocky-r15");
    expect(screen.getByTestId("r15-preview").getAttribute("data-model-url")).toBe("/models/nexusrbx-r15-preview.glb");

    const file = new File([new Uint8Array([1, 2, 3])], "MyAvatar.glb", { type: "model/gltf-binary" });
    fireEvent.change(screen.getByLabelText("Import R15 GLB"), { target: { files: [file] } });

    expect(screen.getByLabelText("Preview model").value).toBe("custom-r15");
    expect(screen.getByRole("option", { name: "MyAvatar" })).toBeTruthy();
    expect(screen.getByTestId("r15-preview").getAttribute("data-model-url")).toBe("blob:custom-r15");
  });

  test("queues the selected variant for reviewed Studio apply", async () => {
    generateAnimation.mockResolvedValue(animationFixture());
    sendAnimationToStudio.mockResolvedValue({ status: "queued", commandId: "cmd_1" });
    render(<AnimateWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: STARTER_BUTTON_NAME }));
    await screen.findByText(/I built 3 R15 jump variants/i);
    fireEvent.click(screen.getByRole("button", { name: "Send to Studio" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Queued for review" })).toBeTruthy());
    expect(sendAnimationToStudio).toHaveBeenCalledWith("anim_1", expect.objectContaining({
      variantId: "balanced",
      applyMode: "manual_review",
    }));
  });
});

const STARTER_BUTTON_NAME = /A confident hero landing/i;
