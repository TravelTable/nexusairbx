import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import AssetGenerationForm, { DEFAULT_ASSET_GENERATION_FORM } from "./AssetGenerationForm";

function ControlledAssetGenerationForm(props) {
  const [form, setForm] = useState(DEFAULT_ASSET_GENERATION_FORM);
  return <AssetGenerationForm {...props} value={form} onChange={setForm} />;
}

describe("AssetGenerationForm", () => {
  test("defaults to an eight-asset pack without imposing a hard maximum", () => {
    render(<ControlledAssetGenerationForm />);

    expect(screen.getByRole("radio", { name: /^Pack\b/i }).checked).toBe(true);
    const count = screen.getByRole("spinbutton", { name: /Asset count/i });
    expect(count.value).toBe("8");
    expect(count.hasAttribute("max")).toBe(false);
    expect(screen.getByText(/Eight is the soft default/i)).not.toBeNull();
  });

  test("exposes every supported workflow and disables server-declared unsupported modes", () => {
    render(<ControlledAssetGenerationForm unsupportedModes={["similar"]} />);

    expect(screen.getByRole("radio", { name: /^Single\b/i }).disabled).toBe(false);
    expect(screen.getByRole("radio", { name: /^Pack\b/i }).disabled).toBe(false);
    expect(screen.getByRole("radio", { name: /^Extend\b/i }).disabled).toBe(false);
    expect(screen.getByRole("radio", { name: /^Similar\b/i }).disabled).toBe(true);
    expect(screen.getByRole("radio", { name: /^Replace\b/i }).disabled).toBe(false);
  });

  test("submits Prompt 1 canonical artwork and background values", () => {
    render(<ControlledAssetGenerationForm />);

    const artworkMode = screen.getByRole("combobox", { name: /Artwork mode/i });
    expect(artworkMode.value).toBe("transparent_game_ui_icon");
    expect(Array.from(artworkMode.options).map((option) => option.value)).toEqual([
      "transparent_game_ui_icon",
      "badge_artwork",
      "game_pass_artwork",
      "template_based_artwork",
      "not_artwork",
    ]);

    const backgroundMode = screen.getByRole("combobox", { name: /Background/i });
    expect(Array.from(backgroundMode.options).map((option) => option.value)).toEqual([
      "transparent",
      "background_enabled",
      "not_applicable",
    ]);
  });

  test("uses a saved NexusRBX asset as the optional style reference", () => {
    render(<ControlledAssetGenerationForm assets={[{ assetId: "asset_one", name: "Sword" }]} />);

    const reference = screen.getByRole("combobox", { name: /Style reference asset/i });
    expect(Array.from(reference.options).map((option) => option.value)).toEqual(["", "asset_one"]);
    expect(screen.queryByRole("button", { name: /Add a visual reference/i })).toBeNull();
  });

  test("limits variation requests to the backend-supported maximum", () => {
    render(<ControlledAssetGenerationForm assets={[{ assetId: "asset_one", name: "Sword" }]} />);

    fireEvent.click(screen.getByRole("radio", { name: /^Similar\b/i }));
    const count = screen.getByRole("spinbutton", { name: /Variation count/i });
    expect(count.value).toBe("3");
    expect(count.getAttribute("max")).toBe("3");

    fireEvent.change(count, { target: { value: "9" } });
    expect(count.value).toBe("3");
  });

  test("fails closed when Prompt 2 writes are unavailable", () => {
    render(<ControlledAssetGenerationForm disabled />);

    expect(screen.getByRole("radio", { name: /^Pack\b/i }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /Generation unavailable/i }).disabled).toBe(true);
  });
});
