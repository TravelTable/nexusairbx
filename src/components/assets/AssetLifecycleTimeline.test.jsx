import React from "react";
import { render, screen } from "@testing-library/react";
import AssetLifecycleTimeline from "./AssetLifecycleTimeline";

describe("AssetLifecycleTimeline", () => {
  test("keeps implementation and verification as separate lifecycle steps", () => {
    render(<AssetLifecycleTimeline status="implemented" />);

    const implement = screen.getByText("Implement").closest("li");
    const verify = screen.getByText("Verify").closest("li");
    expect(implement?.getAttribute("aria-current")).toBe("step");
    expect(verify?.hasAttribute("aria-current")).toBe(false);
    expect(verify?.textContent).toContain("Not started");
  });

  test("marks moderation waits as blocked and failed uploads as errors", () => {
    const { rerender } = render(<AssetLifecycleTimeline status="moderation_pending" />);
    expect(screen.getByText("Process").closest("li")?.classList.contains("is-blocked")).toBe(true);

    rerender(<AssetLifecycleTimeline status="upload_failed" />);
    expect(screen.getByText("Publish").closest("li")?.classList.contains("is-error")).toBe(true);
  });
});
