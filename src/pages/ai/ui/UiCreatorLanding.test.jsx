import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import UiCreatorLanding from "./UiCreatorLanding";

const image = {
  localId: "ref-1",
  name: "shop-desktop.png",
  type: "image/png",
  isImage: true,
  kind: "image",
  status: "ready",
  previewUrl: "blob:shop",
  width: 1440,
  height: 900,
};

function renderLanding(props = {}) {
  return render(
    <UiCreatorLanding
      composer={<textarea aria-label="UI prompt" placeholder={props.placeholder || "Describe your UI…"} />}
      onFileUpload={props.onFileUpload || jest.fn()}
      onTemplate={props.onTemplate || jest.fn()}
      onBuild={props.onBuild || jest.fn()}
      onRemoveReferences={props.onRemoveReferences || jest.fn()}
      onRemoveReference={props.onRemoveReference || jest.fn()}
      referenceMode={props.referenceMode || "replicate"}
      onReferenceMode={props.onReferenceMode || jest.fn()}
      referenceTarget={props.referenceTarget || "desktop"}
      onReferenceTarget={props.onReferenceTarget || jest.fn()}
      referenceBehaviour={props.referenceBehaviour || "infer"}
      onReferenceBehaviour={props.onReferenceBehaviour || jest.fn()}
      referenceRoles={props.referenceRoles || { "ref-1": "primary" }}
      onReferenceRole={props.onReferenceRole || jest.fn()}
      templates={[{ title: "Shop Menu", prompt: "Build a shop" }]}
      {...props}
    />
  );
}

test("landing uses the shared composer and a dotted replicate drop zone", () => {
  const onFileUpload = jest.fn();
  const onTemplate = jest.fn();
  renderLanding({ onFileUpload, onTemplate, attachments: [] });

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

test("a dropped screenshot becomes an inspectable reference card instead of a thumbnail", () => {
  const onBuild = jest.fn();
  const onReferenceMode = jest.fn();
  renderLanding({
    attachments: [image],
    onBuild,
    onReferenceMode,
    placeholder: "What should I change from this reference?",
  });

  expect(screen.queryByLabelText("Drop a screenshot to replicate")).not.toBeInTheDocument();
  const card = screen.getByLabelText("Reference");
  expect(card).toHaveAttribute("data-reference-card", "true");
  const preview = screen.getByRole("img", { name: "shop-desktop.png" });
  expect(preview).toBeVisible();
  expect(preview).toHaveAttribute("src", "blob:shop");
  expect(preview).toHaveClass("uc-reference-card__preview-image");
  expect(screen.getByText("1440 × 900")).toBeVisible();
  expect(screen.getByText("Screenshot")).toBeVisible();
  expect(screen.getByRole("group", { name: "Match" })).toBeVisible();
  expect(screen.getByRole("group", { name: "Target" })).toBeVisible();
  expect(screen.getByRole("group", { name: "Behaviour" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Inspired by" }));
  expect(onReferenceMode).toHaveBeenCalledWith("inspiration");
  fireEvent.click(screen.getByRole("button", { name: "Build from reference" }));
  expect(onBuild).toHaveBeenCalled();
  expect(screen.getByRole("textbox", { name: "UI prompt" })).toHaveAttribute(
    "placeholder",
    "What should I change from this reference?"
  );
  expect(screen.getByText(/Leave blank to reproduce/i)).toBeVisible();
});

test("multiple screenshots become an editable reference set", () => {
  const onReferenceRole = jest.fn();
  renderLanding({
    attachments: [
      image,
      {
        localId: "ref-2",
        name: "shop-mobile.png",
        type: "image/png",
        isImage: true,
        kind: "image",
        status: "ready",
        previewUrl: "blob:mobile",
        width: 390,
        height: 844,
      },
    ],
    referenceRoles: { "ref-1": "primary", "ref-2": "mobile" },
    onReferenceRole,
  });

  expect(screen.getByText("Reference set")).toBeVisible();
  expect(screen.getByDisplayValue("Primary")).toBeVisible();
  expect(screen.getByDisplayValue("Mobile state")).toBeVisible();
  fireEvent.change(screen.getByDisplayValue("Mobile state"), { target: { value: "modal" } });
  expect(onReferenceRole).toHaveBeenCalledWith("ref-2", "modal");
  expect(screen.getByRole("button", { name: "Add reference" })).toBeVisible();
});

test("analysis confirms the screenshot then collapses to a compact reading", () => {
  jest.useFakeTimers();
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: String(query).includes("prefers-reduced-motion"),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
  renderLanding({
    attachments: [image],
    findings: ["Desktop interface detected", "Navigation/sidebar", "Dark theme"],
  });
  expect(screen.getByText("Reference understood · 3 UI regions")).toBeVisible();
  expect(screen.queryByText("Analyzing reference…")).not.toBeInTheDocument();
  jest.useRealTimers();
});
