import { fireEvent, render, screen } from "@testing-library/react";
import { Zap } from "lucide-react";
import HeroSection from "./HeroSection";

function renderHero(overrides = {}) {
  const props = {
    advertisedTools: [
      {
        id: "tool",
        title: "Tool",
        description: "Tool description",
        icon: Zap,
        position: "top-0 left-0",
        delay: 0,
      },
    ],
    randomUsers: [{ letter: "A", color: "from-cyan-500 to-blue-500" }],
    handleSubmit: jest.fn((event) => event?.preventDefault?.()),
    inputValue: "Create a Roblox shop",
    handleInputChange: jest.fn(),
    loading: false,
    error: "",
    ...overrides,
  };

  render(<HeroSection {...props} />);
  return props;
}

describe("HeroSection", () => {
  test("submits once with Enter from the prompt input", () => {
    const props = renderHero();
    const input = screen.getByLabelText("Type your Roblox UI or script idea");

    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(props.handleSubmit).toHaveBeenCalledTimes(1);
    expect(props.handleSubmit.mock.calls[0][1]).toBe("enter");
  });

  test("submits once with Shift+Enter because the homepage prompt is single-line", () => {
    const props = renderHero();
    const input = screen.getByLabelText("Type your Roblox UI or script idea");

    fireEvent.keyDown(input, { key: "Enter", code: "Enter", shiftKey: true });

    expect(props.handleSubmit).toHaveBeenCalledTimes(1);
    expect(props.handleSubmit.mock.calls[0][1]).toBe("enter");
  });

  test("submits once with the Generate with AI button", () => {
    const props = renderHero();

    fireEvent.click(screen.getByRole("button", { name: "Generate with AI" }));

    expect(props.handleSubmit).toHaveBeenCalledTimes(1);
    expect(props.handleSubmit.mock.calls[0][1]).toBe("button");
  });

  test("rejects blank prompts by disabling the submit button", () => {
    renderHero({ inputValue: "   " });

    expect(screen.getByRole("button", { name: "Generate with AI" }).disabled).toBe(true);
  });

  test("disables repeat submissions while loading", () => {
    renderHero({ loading: true });

    expect(screen.getByLabelText("Type your Roblox UI or script idea").disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Generate with AI" }).disabled).toBe(true);
  });
});
