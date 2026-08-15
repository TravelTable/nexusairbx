import fs from "fs";
import path from "path";
import { render, screen } from "@testing-library/react";

import NexusLoader from "./NexusLoader";

describe("NexusLoader", () => {
  test("renders a flat currentColor Nexus mark at Lucide-compatible sizes", () => {
    const { container } = render(<NexusLoader className="h-4 w-4 text-current animate-spin" />);

    const loader = screen.getByRole("status", { name: "Loading" });
    expect(loader.style.width).toBe("16px");
    expect(loader.style.height).toBe("16px");
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelectorAll('[stroke="currentColor"]')).toHaveLength(3);
    expect(container.querySelector("linearGradient, radialGradient, filter")).toBeNull();
  });

  test("stays out of the accessibility tree when used as a decorative icon", () => {
    render(<NexusLoader aria-hidden="true" />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  test("defines a still reduced-motion frame without glow effects", () => {
    const css = fs.readFileSync(path.join(__dirname, "NexusLoader.css"), "utf8");
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/\.nexus-loader__progress\s*\{[\s\S]*?animation:\s*none/);
    expect(css).not.toMatch(/gradient|drop-shadow|filter\s*:/i);
  });
});
