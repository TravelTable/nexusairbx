import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import UiGeneratedImageFeed from "./UiGeneratedImageFeed";

jest.mock("motion/react", () => ({
  motion: {
    span: ({ children, initial, animate, transition, ...props }) => <span {...props}>{children}</span>,
    div: ({ children, initial, animate, transition, ...props }) => <div {...props}>{children}</div>,
  },
}));

HTMLDialogElement.prototype.showModal = HTMLDialogElement.prototype.showModal || function showModal() {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = HTMLDialogElement.prototype.close || function close() {
  this.removeAttribute("open");
  this.dispatchEvent(new Event("close"));
};

const images = [
  { id: "one", label: "Generating matching artwork", alt: "Artwork", state: "completed", src: "data:image/png;base64,aaa" },
  { id: "two", label: "Improving the design", alt: "Edit pass", state: "completed", src: "data:image/png;base64,bbb" },
];

test("shows a loading surface instead of a fake image while artwork has no url", () => {
  render(<UiGeneratedImageFeed images={[
    { id: "one", label: "Generating matching artwork", alt: "Artwork", state: "generating", src: "" },
  ]} />);

  expect(screen.getByText("Creating image. May take a moment.")).toBeVisible();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Artwork is generating")).toBeVisible();
});

test("keeps generated images in a slider and opens a full preview", () => {
  const onPublish = jest.fn();
  render(<UiGeneratedImageFeed images={images} onPublish={onPublish} />);

  expect(screen.getByLabelText("Generated artwork")).toBeVisible();
  expect(screen.getByText("1 / 2")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Next image" }));
  expect(screen.getByText("2 / 2")).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: "Open Artwork" }));
  expect(screen.getByRole("dialog", { name: "Artwork preview" })).toBeVisible();
  expect(screen.getAllByRole("img", { name: "Artwork" }).length).toBeGreaterThan(0);

  fireEvent.click(screen.getAllByRole("button", { name: "Publish to Roblox" })[0]);
  expect(onPublish).toHaveBeenCalledWith(expect.objectContaining({ id: "one" }));
});
