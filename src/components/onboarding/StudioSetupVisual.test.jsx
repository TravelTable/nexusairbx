import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import StudioSetupVisual, { STUDIO_SETUP_VISUALS } from "./StudioSetupVisual";

describe("StudioSetupVisual", () => {
  test("defines exactly the five maintained Studio setup screenshot slots", () => {
    expect(
      STUDIO_SETUP_VISUALS.map(({ id, filename, src }) => ({
        id,
        filename,
        src,
      })),
    ).toEqual([
      {
        id: "install-plugin",
        filename: "install-plugin.webp",
        src: "/onboarding/studio/install-plugin.webp",
      },
      {
        id: "open-plugin",
        filename: "open-plugin.webp",
        src: "/onboarding/studio/open-plugin.webp",
      },
      {
        id: "enter-pair-code",
        filename: "enter-pair-code.webp",
        src: "/onboarding/studio/enter-pair-code.webp",
      },
      {
        id: "allow-http",
        filename: "allow-http.webp",
        src: "/onboarding/studio/allow-http.webp",
      },
      {
        id: "connected-state",
        filename: "connected-state.webp",
        src: "/onboarding/studio/connected-state.webp",
      },
    ]);

    STUDIO_SETUP_VISUALS.forEach((visual) => {
      expect(visual.alt.length).toBeGreaterThan(30);
      expect(visual.instruction.length).toBeGreaterThan(30);
      expect(visual.aspectRatio).toBe("8 / 5");
      expect(visual.crop).toEqual(
        expect.objectContaining({
          objectFit: "cover",
          objectPosition: expect.any(String),
        }),
      );
      expect(visual.fallbackLabel).toBe(
        "Screenshot unavailable — follow the written setup step.",
      );
    });
  });

  test("renders the honest fallback without requesting an absent asset", () => {
    const visual = STUDIO_SETUP_VISUALS[0];
    render(<StudioSetupVisual visualId={visual.id} />);

    expect(visual.assetAvailable).toBe(false);
    expect(screen.queryByRole("img", { name: visual.alt })).not.toBeInTheDocument();
    expect(document.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByText("Setup reference, not live Studio state")).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: `${visual.alt} ${visual.fallbackLabel}`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: `${visual.alt} ${visual.fallbackLabel}`,
      }).parentElement,
    ).toHaveAttribute("data-aspect-ratio", "8 / 5");
    expect(screen.getByText(visual.fallbackLabel)).toBeInTheDocument();
  });

});
