import { buildCompactActContext } from "./aiContext";

describe("buildCompactActContext", () => {
  test("caps turns and keeps goal", () => {
    const messages = [
      { role: "user", content: "one" },
      { role: "assistant", explanation: "two" },
      { role: "user", content: "three" },
      { role: "assistant", explanation: "four" },
      { role: "user", content: "five" },
      { role: "assistant", explanation: "six" },
      { role: "user", content: "seven" },
      { role: "assistant", explanation: "eight" },
    ];

    const context = buildCompactActContext(messages, "finish the task", { maxTurns: 4 });

    expect(context).toContain("[Context]");
    expect(context).toContain("[Goal]");
    expect(context).toContain("finish the task");
    expect(context).not.toContain("one");
    expect(context).toContain("eight");
  });
});
