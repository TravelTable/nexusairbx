import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProNudgeModal from "./ProNudgeModal";
import SignInNudgeModal from "./SignInNudgeModal";
import StarterPromoModal from "./StarterPromoModal";

jest.mock("../lib/billing", () => ({
  startSubscriptionCheckout: jest.fn(),
}));

jest.mock("../lib/productAnalytics", () => ({
  trackProductEvent: jest.fn(),
}));

const cases = [
  {
    name: "Pro upgrade",
    dialogName: "Unlock Pro Access",
    closeName: "Close upgrade prompt",
    renderModal: (isOpen, onClose) => (
      <ProNudgeModal isOpen={isOpen} onClose={onClose} />
    ),
  },
  {
    name: "sign in",
    dialogName: "Sign in to save and continue your work",
    closeName: "Dismiss sign-in prompt",
    renderModal: (isOpen, onClose) => (
      <SignInNudgeModal isOpen={isOpen} onClose={onClose} />
    ),
  },
  {
    name: "Starter offer",
    dialogName: "Unlock what Free users hit first",
    closeName: "Close Starter offer",
    renderModal: (isOpen, onClose) => (
      <StarterPromoModal
        isOpen={isOpen}
        onClose={onClose}
        onDismiss={onClose}
        onDismissLong={onClose}
      />
    ),
  },
];

describe.each(cases)("$name nudge modal", ({ name, dialogName, closeName, renderModal }) => {
  test("is named, receives initial focus, closes on Escape, and restores focus", async () => {
    const onClose = jest.fn();

    function Harness() {
      const [isOpen, setIsOpen] = React.useState(false);
      const close = () => {
        onClose();
        setIsOpen(false);
      };

      return (
        <>
          <button type="button" onClick={() => setIsOpen(true)}>
            Open {name}
          </button>
          {renderModal(isOpen, close)}
        </>
      );
    }

    render(
      <MemoryRouter
        initialEntries={["/ai"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Harness />
      </MemoryRouter>
    );

    const launch = screen.getByRole("button", { name: `Open ${name}` });
    launch.focus();
    fireEvent.click(launch);

    expect(screen.getByRole("dialog", { name: dialogName })).toBeInTheDocument();
    const close = screen.getByRole("button", { name: closeName });
    await waitFor(() => expect(close).toHaveFocus());

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(launch).toHaveFocus());
  });
});
