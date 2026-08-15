import fs from "fs";
import path from "path";
import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import NexusDisplayIcon, {
  getNexusDisplayIconPath,
  NEXUS_DISPLAY_ICON_NAMES,
} from "./NexusDisplayIcon";

const ROOT_ICON_DIRECTORY = path.join(process.cwd(), "public", "assets", "nexus-display-icons");
const PUBLIC_FRONTEND_ICON_DIRECTORY = path.join(
  process.cwd(),
  "public-frontend",
  "public",
  "assets",
  "nexus-display-icons",
);

describe("NexusDisplayIcon", () => {
  test("renders a stable asset path with explicit dimensions", () => {
    render(<NexusDisplayIcon name="studio-connect" alt="Connect Nexus to Studio" size={64} />);

    const icon = screen.getByRole("img", { name: "Connect Nexus to Studio" });
    expect(icon).toHaveAttribute("src", "/assets/nexus-display-icons/studio-connect.svg");
    expect(icon).toHaveAttribute("width", "64");
    expect(icon).toHaveAttribute("height", "64");
    expect(icon).toHaveAttribute("data-nexus-display-icon", "studio-connect");
  });

  test("keeps the ten-file flat 2D contract identical across both public roots", () => {
    expect(NEXUS_DISPLAY_ICON_NAMES).toEqual([
      "ask",
      "build",
      "edit",
      "debug",
      "plan",
      "studio-connect",
      "assets",
      "snapshot",
      "publish",
      "complete",
    ]);

    for (const name of NEXUS_DISPLAY_ICON_NAMES) {
      const filename = `${name}.svg`;
      const rootSource = fs.readFileSync(path.join(ROOT_ICON_DIRECTORY, filename), "utf8");
      const publicFrontendSource = fs.readFileSync(
        path.join(PUBLIC_FRONTEND_ICON_DIRECTORY, filename),
        "utf8",
      );

      expect(getNexusDisplayIconPath(name)).toBe(`/assets/nexus-display-icons/${filename}`);
      expect(publicFrontendSource).toBe(rootSource);
      expect(rootSource).toContain('viewBox="0 0 96 96"');
      expect(rootSource).toContain('fill="#F7F4ED"');
      expect(rootSource).toContain('stroke="currentColor"');
      expect(rootSource.match(/#7C3AED/g)).toHaveLength(1);
      expect(rootSource).not.toMatch(/<text|gradient|filter=|sparkle|wand|extrud|\b3d\b/i);
      expect(Buffer.byteLength(rootSource)).toBeLessThan(1600);
    }

    expect(fs.readdirSync(ROOT_ICON_DIRECTORY).sort()).toEqual(
      NEXUS_DISPLAY_ICON_NAMES.map((name) => `${name}.svg`).sort(),
    );
  });
});
