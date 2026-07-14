import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { normalizePairingDraft, PairingCodeInput } from "./PairingCodeInput";

let container: HTMLDivElement | null = null;

afterEach(() => {
  container?.remove();
  container = null;
});

function renderInput(props: { disabled?: boolean; invalid?: boolean } = {}) {
  container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  function Harness() {
    const [value, setValue] = useState("");
    return <PairingCodeInput value={value} onChange={setValue} {...props} />;
  }
  act(() => root.render(<Harness />));
  return Array.from(container.querySelectorAll("input"));
}

describe("PairingCodeInput", () => {
  it("normalizes full codes to six uppercase alphanumeric characters", () => {
    expect(normalizePairingDraft("ab-12 cd!9")).toBe("AB12CD");
  });

  it("pastes a complete code and moves focus to the final cell", () => {
    const inputs = renderInput();
    const paste = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(paste, "clipboardData", { value: { getData: () => "ab-12 cd" } });
    act(() => inputs[0].dispatchEvent(paste));
    expect(inputs.map((input) => input.value).join("")).toBe("AB12CD");
    expect(document.activeElement).toBe(inputs[5]);
  });

  it("exposes disabled and invalid states to keyboard and assistive technology", () => {
    const inputs = renderInput({ disabled: true, invalid: true });
    expect(inputs.every((input) => input.disabled)).toBe(true);
    expect(inputs.every((input) => input.getAttribute("aria-invalid") === "true")).toBe(true);
  });
});
