import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import NotificationToast from "./NotificationToast";

describe("NotificationToast", () => {
  test("uses one polite status for non-error feedback", () => {
    render(<NotificationToast message="Saved" type="success" duration={100000} />);

    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("Saved");
    expect(toast).toHaveAttribute("aria-live", "polite");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("uses assertive alert semantics for errors", () => {
    render(<NotificationToast message="Save failed" type="error" duration={100000} />);

    const toast = screen.getByRole("alert");
    expect(toast).toHaveTextContent("Save failed");
    expect(toast).toHaveAttribute("aria-live", "assertive");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("does not steal focus when a primary action appears", () => {
    const Harness = ({ showToast }) => (
      <div>
        <button type="button">Keep focus</button>
        {showToast ? (
          <NotificationToast
            message="Action available"
            duration={100000}
            cta={{ label: "Review", onClick: jest.fn(), primary: true }}
          />
        ) : null}
      </div>
    );
    const { rerender } = render(<Harness showToast={false} />);
    const focusedButton = screen.getByRole("button", { name: "Keep focus" });
    focusedButton.focus();

    rerender(<Harness showToast />);

    expect(focusedButton).toHaveFocus();
  });
});
