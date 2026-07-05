import {
  buildExampleContextRequest,
  normalizeSelectedExampleIds,
} from "./exampleContextRequest";

describe("exampleContextRequest", () => {
  it("normalizes selected example IDs with dedupe and caps", () => {
    const ids = normalizeSelectedExampleIds([
      "ItemShopUI",
      "itemshopui",
      "",
      "Remote Events",
      "DataStore",
    ], { maxIds: 2 });

    expect(ids).toEqual(["itemshopui", "remote events"]);
  });

  it("builds a disabled request by default", () => {
    expect(buildExampleContextRequest()).toEqual({
      useExamples: false,
      selectedExampleIds: [],
    });
  });

  it("builds an enabled request with selected IDs", () => {
    expect(buildExampleContextRequest({
      useExamples: true,
      selectedExampleIds: ["ItemShopUI"],
    })).toEqual({
      useExamples: true,
      selectedExampleIds: ["itemshopui"],
    });
  });
});
