import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import StudioPlaceChip from "./StudioPlaceChip";

const target = {
  id: "studio_target_local",
  label: "LocalPlace.rbxl",
  placeId: "123",
  universeId: "456",
};

function renderPicker(onSelectStudioPlace) {
  render(
    <StudioPlaceChip
      connected
      studioEnabled
      options={[target]}
      onSelectPlace={onSelectStudioPlace}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: /choose a studio place/i }),
  );
}

test("keeps the Studio place selector touch-sized below desktop", () => {
  render(
    <StudioPlaceChip
      connected
      studioEnabled
      options={[target]}
      onSelectPlace={jest.fn()}
    />,
  );

  expect(
    screen.getByRole("button", { name: /choose a studio place/i }).className,
  ).toContain("min-h-11");
});

test("opens the existing Studio connection options from the disconnected state", () => {
  const onRequestConnect = jest.fn();
  render(
    <StudioPlaceChip
      studioEnabled
      connected={false}
      onRequestConnect={onRequestConnect}
    />,
  );

  const trigger = screen.getByRole("button", {
    name: /Studio disconnected\. Open connection options/i,
  });
  expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
  expect(trigger.getAttribute("aria-controls")).toBe(
    "studio-connection-dialog",
  );

  fireEvent.click(trigger);
  expect(onRequestConnect).toHaveBeenCalledWith(trigger);
  expect(screen.getByText("Connect")).toBeTruthy();
});

test("keeps connected place selection ahead of the recovery callback", () => {
  const onRequestConnect = jest.fn();
  const onPickerOpenChange = jest.fn();

  function ConnectedHarness() {
    const [pickerOpen, setPickerOpen] = React.useState(false);
    return (
      <StudioPlaceChip
        connected
        studioEnabled
        options={[target]}
        pickerOpen={pickerOpen}
        onPickerOpenChange={(nextOpen) => {
          onPickerOpenChange(nextOpen);
          setPickerOpen(nextOpen);
        }}
        onRequestConnect={onRequestConnect}
        onSelectPlace={jest.fn()}
      />
    );
  }

  render(<ConnectedHarness />);
  fireEvent.click(
    screen.getByRole("button", { name: /choose a studio place/i }),
  );

  expect(onPickerOpenChange).toHaveBeenCalledWith(true);
  expect(onRequestConnect).not.toHaveBeenCalled();
  expect(
    screen.getByRole("region", { name: "Studio project selection" }),
  ).toBeTruthy();
});

test("keeps the picker open when async place selection fails", async () => {
  const onSelectStudioPlace = jest.fn(async () => false);
  renderPicker(onSelectStudioPlace);

  fireEvent.click(screen.getByRole("button", { name: "LocalPlace.rbxl" }));

  await waitFor(() => expect(onSelectStudioPlace).toHaveBeenCalledWith(target));
  expect(
    screen.getByRole("region", { name: "Studio project selection" }),
  ).not.toBeNull();
});

test("keeps the picker open when a selection handler omits a success result", async () => {
  const onSelectStudioPlace = jest.fn(async () => undefined);
  renderPicker(onSelectStudioPlace);

  fireEvent.click(screen.getByRole("button", { name: "LocalPlace.rbxl" }));

  await waitFor(() => expect(onSelectStudioPlace).toHaveBeenCalledWith(target));
  expect(
    screen.getByRole("region", { name: "Studio project selection" }),
  ).not.toBeNull();
});

test("closes the picker only after explicit async selection success", async () => {
  const onSelectStudioPlace = jest.fn(async () => true);
  renderPicker(onSelectStudioPlace);

  fireEvent.click(screen.getByRole("button", { name: "LocalPlace.rbxl" }));

  await waitFor(() => {
    expect(
      screen.queryByRole("region", { name: "Studio project selection" }),
    ).toBeNull();
  });
});

test("allows an unpublished local place to be selected", () => {
  const onSelectStudioPlace = jest.fn();
  render(
    <StudioPlaceChip
      connected
      studioEnabled
      options={[{ id: "studio_target_draft", label: "Draft.rbxl" }]}
      onSelectPlace={onSelectStudioPlace}
    />,
  );

  fireEvent.click(
    screen.getByRole("button", { name: /choose a studio place/i }),
  );
  expect(screen.getByText(/pick the open place before the agent starts/i)).toBeTruthy();
  const localPlace = screen.getByRole("button", { name: /Draft\.rbxl/i });
  expect(localPlace.disabled).toBe(false);
  fireEvent.click(localPlace);
  expect(onSelectStudioPlace).toHaveBeenCalledWith(expect.objectContaining({ id: "studio_target_draft" }));
});
