import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Modal from "./Modal";

test("traps focus, closes on Escape, and restores the prior focus", async () => {
  const onClose = jest.fn();
  function ModalHarness() {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>Launch</button>
        {open && (
          <Modal
            title="Delete project"
            onClose={() => {
              onClose();
              setOpen(false);
            }}
          >
            <button type="button">Confirm</button>
          </Modal>
        )}
      </>
    );
  }
  render(<ModalHarness />);

  const launch = screen.getByRole("button", { name: "Launch" });
  launch.focus();
  fireEvent.click(launch);
  const close = screen.getByRole("button", { name: "Close modal" });
  const confirm = screen.getByRole("button", { name: "Confirm" });
  await waitFor(() => expect(close).toHaveFocus());

  confirm.focus();
  fireEvent.keyDown(window, { key: "Tab" });
  expect(close).toHaveFocus();

  fireEvent.keyDown(window, { key: "Escape" });
  expect(onClose).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(launch).toHaveFocus());
});
