import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import UiCreatorLanding from "./UiCreatorLanding";

test("landing uses the shared composer and a dotted replicate drop zone", () => {
  const onFileUpload = jest.fn();
  const onTemplate = jest.fn();
  render(
    <UiCreatorLanding
      composer={<textarea aria-label="UI prompt" />}
      onFileUpload={onFileUpload}
      onTemplate={onTemplate}
      templates={[{ title: "Shop Menu", prompt: "Build a shop" }]}
    />
  );

  expect(screen.getByRole("heading", { name: /What can I help you ship/i })).toBeVisible();
  const drop = screen.getByLabelText("Drop a screenshot to replicate");
  expect(drop).toHaveAttribute("data-dropzone", "dashed");
  fireEvent.drop(drop, {
    dataTransfer: { files: [new File(["img"], "shop.png", { type: "image/png" })] },
  });
  expect(onFileUpload).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Shop Menu" }));
  expect(onTemplate).toHaveBeenCalledWith(expect.objectContaining({ title: "Shop Menu" }));
});
