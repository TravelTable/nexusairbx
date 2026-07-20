import {
  COMPOSER_COMMANDS,
  applyComposerMention,
  filterComposerCommands,
  getActiveComposerMention,
} from "./composerCommands";

describe("composerCommands", () => {
  test("exposes the workspace @ command set", () => {
    expect(COMPOSER_COMMANDS.map((command) => command.id)).toEqual([
      "studio",
      "asset",
      "file",
      "controls",
      "improve",
    ]);
  });

  test("filters commands by query", () => {
    expect(filterComposerCommands("ass").map((command) => command.id)).toEqual(["asset"]);
    expect(filterComposerCommands("@stu").map((command) => command.id)).toEqual(["studio"]);
  });

  test("detects active @ mentions at the caret", () => {
    expect(getActiveComposerMention("build @stu", 10)).toEqual({
      start: 6,
      end: 10,
      query: "stu",
    });
    expect(getActiveComposerMention("build now", 9)).toBeNull();
  });

  test("applies a mention replacement", () => {
    const mention = getActiveComposerMention("fix @a", 7);
    expect(applyComposerMention("fix @a", mention, "asset")).toBe("fix @asset ");
  });
});
