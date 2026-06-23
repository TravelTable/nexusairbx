import {
  formatStructuredGameProfile,
  parseStructuredGameProfile,
  resolveGameSpecForPrompt,
} from "./gameProfile";

describe("resolveGameSpecForPrompt", () => {
  test("returns empty string when structured profile is disabled", () => {
    const raw = JSON.stringify({
      isStructured: true,
      enabled: false,
      genre: "Tycoon",
      theme: "Neon city",
      customNotes: "Use bright UI",
    });
    expect(resolveGameSpecForPrompt(raw)).toBe("");
  });

  test("formats enabled structured profile", () => {
    const raw = JSON.stringify({
      isStructured: true,
      enabled: true,
      genre: "Tycoon",
      theme: "Neon city",
      platforms: ["mobile"],
      colors: { primary: "#111111", secondary: "#222222" },
      systems: ["economy"],
      customNotes: "Keep it simple",
    });
    const result = resolveGameSpecForPrompt(raw);
    expect(result).toMatch(/\[GAME CONTEXT\]/);
    expect(result).toMatch(/Genre: Tycoon/);
    expect(result).toMatch(/Theme: Neon city/);
  });

  test("passes through legacy plain-text gameSpec", () => {
    expect(resolveGameSpecForPrompt("Genre: horror")).toBe("Genre: horror");
  });

  test("parseStructuredGameProfile ignores non-structured JSON", () => {
    expect(parseStructuredGameProfile(JSON.stringify({ foo: "bar" }))).toBeNull();
  });

  test("formatStructuredGameProfile returns empty when enabled but empty", () => {
    expect(
      formatStructuredGameProfile({
        enabled: true,
        genre: "",
        theme: "",
        customNotes: "",
      })
    ).toBe("");
  });
});
