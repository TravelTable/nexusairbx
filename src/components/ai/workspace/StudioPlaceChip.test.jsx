import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import StudioPlaceChip from "./StudioPlaceChip";

const target = {
  id: "studio_target_local",
  label: "LocalPlace.rbxl",
};

function renderPicker(onSelectStudioPlace) {
  render(
    <StudioPlaceChip
      connected
      studioEnabled
      options={[target]}
      onSelectPlace={onSelectStudioPlace}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: /choose a studio place/i }));
}

test("keeps the picker open when async place selection fails", async () => {
  const onSelectStudioPlace = jest.fn(async () => false);
  renderPicker(onSelectStudioPlace);

  fireEvent.click(screen.getByRole("button", { name: "LocalPlace.rbxl" }));

  await waitFor(() => expect(onSelectStudioPlace).toHaveBeenCalledWith(target));
  expect(screen.getByRole("region", { name: "Studio project selection" })).not.toBeNull();
});

test("keeps the picker open when a selection handler omits a success result", async () => {
  const onSelectStudioPlace = jest.fn(async () => undefined);
  renderPicker(onSelectStudioPlace);

  fireEvent.click(screen.getByRole("button", { name: "LocalPlace.rbxl" }));

  await waitFor(() => expect(onSelectStudioPlace).toHaveBeenCalledWith(target));
  expect(screen.getByRole("region", { name: "Studio project selection" })).not.toBeNull();
});

test("closes the picker only after explicit async selection success", async () => {
  const onSelectStudioPlace = jest.fn(async () => true);
  renderPicker(onSelectStudioPlace);

  fireEvent.click(screen.getByRole("button", { name: "LocalPlace.rbxl" }));

  await waitFor(() => {
    expect(screen.queryByRole("region", { name: "Studio project selection" })).toBeNull();
  });
});
