import { act, fireEvent, render, screen } from "@testing-library/react";
import { notifyToast, SiteToastProvider } from "./toast-1";

describe("SiteToastProvider", () => {
  test("releases close-button focus before hiding a toast", () => {
    render(<SiteToastProvider><main>Workspace</main></SiteToastProvider>);

    act(() => {
      notifyToast({ message: "Plan needs attention", type: "error", duration: 60_000 });
    });

    const closeButton = document.querySelector(".nexus-site-toast__close");
    expect(closeButton).not.toBeNull();
    act(() => closeButton?.focus());
    expect(closeButton).toHaveFocus();

    fireEvent.click(closeButton);

    expect(closeButton).not.toHaveFocus();
  });

  test("releases action-button focus before dismissing a toast", () => {
    const onClick = jest.fn();
    render(<SiteToastProvider><main>Workspace</main></SiteToastProvider>);

    act(() => {
      notifyToast({
        message: "Reconnect Studio",
        type: "error",
        duration: 60_000,
        cta: { label: "Reconnect", onClick },
      });
    });

    const actionButton = screen.getByText("Reconnect").closest("button");
    expect(actionButton).not.toBeNull();
    act(() => actionButton?.focus());
    fireEvent.click(actionButton);

    expect(actionButton).not.toHaveFocus();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
