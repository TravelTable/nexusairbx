import { sanitizeMermaidChart } from "./sanitizeMermaid";

describe("sanitizeMermaidChart", () => {
  test("converts subroutine path nodes to quoted rectangles", () => {
    const input = "flowchart LR\n  User --> Orch[/api/ai/orchestrate]";
    const output = sanitizeMermaidChart(input);
    expect(output).toContain('Orch["/api/ai/orchestrate"]');
    expect(output).not.toContain("[/api/");
  });

  test("quotes square bracket labels with parentheses", () => {
    const input = "flowchart LR\n  A[Server (authoritative)] --> B[Client]";
    const output = sanitizeMermaidChart(input);
    expect(output).toContain('A["Server (authoritative)"]');
  });

  test("converts round nodes with nested parentheses to quoted rectangles", () => {
    const input = "flowchart LR\n  A(Server (auth)) --> B";
    const output = sanitizeMermaidChart(input);
    expect(output).toContain('A["Server (auth)"]');
  });

  test("leaves simple edge labels unchanged", () => {
    const input = "flowchart LR\n  A -->|not a build| B";
    expect(sanitizeMermaidChart(input)).toBe(input);
  });

  test("leaves valid diagrams unchanged", () => {
    const input = "flowchart LR\n  A-->B\n  UI[\"ShopGui\"] -->|FireServer| RE[\"PurchaseRemote\"]";
    expect(sanitizeMermaidChart(input)).toBe(input);
  });

  test("preserves cylinder database nodes", () => {
    const input = "flowchart LR\n  SS --> DS[(PlayerData)]";
    expect(sanitizeMermaidChart(input)).toBe(input);
  });
});
