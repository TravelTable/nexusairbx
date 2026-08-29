import fs from "fs";
import path from "path";
import { render, screen } from "@testing-library/react";

import { Shimmer } from "./shimmer";

describe("Shimmer", () => {
  test("uses a lightweight CSS animation and preserves the requested element", () => {
    render(
      <Shimmer
        as="span"
        duration={1.25}
        baseColor="var(--nx-text)"
        highlightColor="var(--nx-purple-strong)"
      >
        Thinking...
      </Shimmer>
    );

    const shimmer = screen.getByText("Thinking...");
    expect(shimmer.tagName).toBe("SPAN");
    expect(shimmer.classList.contains("nexus-shimmer")).toBe(true);
    expect(shimmer.style.getPropertyValue("--nexus-shimmer-duration")).toBe("1.25s");
    expect(shimmer.style.getPropertyValue("--nexus-shimmer-base")).toBe("var(--nx-text)");
    expect(shimmer.style.getPropertyValue("--nexus-shimmer-highlight")).toBe("var(--nx-purple-strong)");
  });

  test("has a legible, non-animated reduced-motion state and no JS motion import", () => {
    const source = fs.readFileSync(path.join(__dirname, "shimmer.jsx"), "utf8");
    const css = fs.readFileSync(path.join(__dirname, "shimmer.css"), "utf8");

    expect(source).not.toMatch(/motion\/react|motion\.create/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/animation:\s*none/);
    expect(css).toMatch(/background-image:\s*none/);
  });
});
