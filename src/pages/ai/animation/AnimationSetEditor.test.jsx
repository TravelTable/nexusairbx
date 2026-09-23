import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AnimationSetEditor from "./AnimationSetEditor";
import * as api from "lib/animationSetApi";

jest.mock("lib/animationSetApi", () => ({
  applyAnimationSetAccessProbe: jest.fn(), applyAnimationSetResourceInspection: jest.fn(), controlAnimationSetPreview: jest.fn(), getAnimationSetPreviewReceipt: jest.fn(), importAnimationResource: jest.fn(), inspectAnimationSetResource: jest.fn(), probeAnimationSetResourceAccess: jest.fn(),
  compileAnimationSet: jest.fn(), getAnimationSet: jest.fn(), getAnimationSetDeployment: jest.fn(), listAnimationSets: jest.fn(), planAnimationSet: jest.fn(),
  saveAnimationSet: jest.fn(), searchAnimationResources: jest.fn(), sendAnimationSetToStudio: jest.fn(), validateAnimationSet: jest.fn(),
}));
jest.mock("lib/animationApi", () => ({ getAnimation: jest.fn() }));
jest.mock("components/ui/NexusSelect", () => ({ children, ...props }) => <select {...props}>{children}</select>);
jest.mock("./R15Preview", () => ({ animation, currentTime }) => <div data-testid="set-preview" data-resource={animation?.id} data-time={currentTime} />);

function fixture(overrides = {}) {
  return {
    id: "set_one", version: 1, schemaVersion: 1, kind: "animation_set", name: "Sword set", projectId: "project_one",
    actor: "player", runtimeBackend: "tracks", rig: { type: "R15", requiredJoints: [] },
    layers: [{ id: "action", initialState: "ready", maxTracks: 2 }],
    resources: [{ id: "swing", name: "Sword swing", semanticRole: "attack", scope: "private", rigType: "R15", durationMs: 1000,
      loop: false, priority: "Action", source: { kind: "imported" }, robloxAssetId: "123456", assetState: "permission_required",
      access: { status: "unknown" }, markerEvidence: { status: "authored" }, keyframes: [{ timeMs: 0, joints: {} }, { timeMs: 1000, joints: {} }],
      markers: [{ name: "HitStart", timeMs: 200, value: "" }, { name: "Impact", timeMs: 350, value: "" }, { name: "HitEnd", timeMs: 500, value: "" }],
    }],
    states: [
      { id: "ready", layerId: "action", resourceId: null, speed: 1, interruptible: true, windows: [], events: [] },
      { id: "attack", layerId: "action", resourceId: "swing", speed: 1, fadeInMs: 80, fadeOutMs: 100, maxDurationMs: 1200, interruptible: false,
        windows: [{ id: "damage", kind: "hit", startMarker: "HitStart", endMarker: "HitEnd" }], events: [{ marker: "Impact", kind: "sound", resourceId: "impact_sound" }] },
    ],
    transitions: [{ id: "attack_in", from: "ready", to: "attack", trigger: "event", event: "attack", blendMs: 80, priority: 1 }, { id: "attack_out", from: "attack", to: "ready", trigger: "ended", blendMs: 100, priority: 0 }],
    bindings: { sounds: [{ id: "impact_sound", studioPath: "Workspace.Sounds.Impact" }], vfx: [], gameplay: [], camera: [] },
    ...overrides,
  };
}

async function plan() {
  fireEvent.change(screen.getByLabelText("Animation set brief"), { target: { value: "Sword combat set" } });
  fireEvent.click(screen.getByRole("button", { name: "Plan set" }));
  await screen.findByRole("heading", { name: "Sword set" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Validate" })).not.toBeDisabled());
}

async function chooseAttack() {
  fireEvent.click(screen.getByRole("button", { name: "attack Sword swing" }));
  await waitFor(() => expect(screen.getByLabelText("Resource name")).toHaveValue("Sword swing"));
}

beforeEach(() => {
  jest.clearAllMocks();
  api.listAnimationSets.mockResolvedValue([]);
  api.planAnimationSet.mockResolvedValue(fixture());
  api.saveAnimationSet.mockImplementation(async (set) => ({ ...set, version: set.version + 1 }));
  api.validateAnimationSet.mockResolvedValue({ valid: true, errors: [], warnings: [] });
  api.compileAnimationSet.mockResolvedValue({ source: "return {}", mode: "preview" });
  api.sendAnimationSetToStudio.mockResolvedValue({ status: "queued", commandId: "cmd_1", mode: "preview" });
  api.getAnimationSetDeployment.mockResolvedValue({ id: "deployment_1", status: "awaiting_review", verified: false });
});

test("plans a persisted project set, edits markers, and saves before validating", async () => {
  render(<AnimationSetEditor projectId="project_one" />);
  await plan();
  expect(api.planAnimationSet).toHaveBeenCalledWith({ prompt: "Sword combat set", projectId: "project_one", actor: "player", rigType: "R15" });
  await chooseAttack();
  fireEvent.click(screen.getByText("Markers", { selector: "summary" }));
  fireEvent.change(screen.getByLabelText("Marker 1 time (ms)"), { target: { value: "240" } });
  fireEvent.change(screen.getByLabelText("Playback speed"), { target: { value: "1.5" } });
  fireEvent.click(screen.getByRole("button", { name: "Validate" }));
  await waitFor(() => expect(api.validateAnimationSet).toHaveBeenCalledWith("set_one", { mode: "preview" }));
  expect(api.saveAnimationSet).toHaveBeenCalledWith(expect.objectContaining({ version: 1,
    resources: [expect.objectContaining({ markers: expect.arrayContaining([expect.objectContaining({ name: "HitStart", timeMs: 240 })]) })],
    states: expect.arrayContaining([expect.objectContaining({ id: "attack", speed: 1.5 })]),
  }));
  expect(api.saveAnimationSet.mock.invocationCallOrder[0]).toBeLessThan(api.validateAnimationSet.mock.invocationCallOrder[0]);
  expect(screen.getByText(/Structure valid/)).toBeInTheDocument();
});

test("resource replacement retains the state slot and reports missing marker contracts", async () => {
  api.searchAnimationResources.mockResolvedValue([{ id: "library_swing", name: "Heavy sword", rigType: "R15", semanticRole: "attack", scope: "shared", source: { kind: "library" }, robloxAssetId: "999", assetState: "ready", durationMs: 1500, markers: [] }]);
  api.validateAnimationSet.mockResolvedValue({ valid: false, errors: [{ code: "MISSING_MARKER", path: "states.attack.windows.damage", message: "HitStart does not exist in this resource." }], warnings: [] });
  render(<AnimationSetEditor projectId="project_one" />);
  await plan(); await chooseAttack();
  fireEvent.change(screen.getByLabelText("Search reusable animations"), { target: { value: "heavy sword" } });
  fireEvent.click(screen.getByRole("button", { name: "Search resources" }));
  fireEvent.click(await screen.findByRole("button", { name: /Use Heavy sword/ }));
  expect(screen.queryByTestId("set-preview")).not.toBeInTheDocument();
  expect(screen.getByText("Preview this resource in Studio")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Validate" }));
  await screen.findByText("HitStart does not exist in this resource.");
  expect(api.saveAnimationSet).toHaveBeenCalledWith(expect.objectContaining({ resources: [expect.objectContaining({ id: "swing", name: "Heavy sword" })], states: expect.arrayContaining([expect.objectContaining({ id: "attack", resourceId: "swing", windows: [expect.objectContaining({ startMarker: "HitStart" })] })]) }));
});

test("version conflicts preserve local edits and prevent deployment", async () => {
  api.saveAnimationSet.mockRejectedValue(Object.assign(new Error("Conflict"), { code: "ANIMATION_VERSION_CONFLICT" }));
  render(<AnimationSetEditor />);
  await plan(); await chooseAttack();
  fireEvent.change(screen.getByLabelText("Fade in (ms)"), { target: { value: "180" } });
  fireEvent.click(screen.getByRole("button", { name: "Send Studio preview" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("alert")).toHaveTextContent("Your changes are retained");
  expect(screen.getByLabelText("Fade in (ms)")).toHaveValue(180);
  expect(api.sendAnimationSetToStudio).not.toHaveBeenCalled();
});

test("state renaming updates transition references and sends a scoped Studio preview", async () => {
  render(<AnimationSetEditor />);
  await plan(); await chooseAttack();
  fireEvent.change(screen.getByLabelText("State ID"), { target: { value: "slash" } });
  fireEvent.change(screen.getByLabelText("Target rig path"), { target: { value: "Workspace.Hero" } });
  fireEvent.click(screen.getByRole("button", { name: "Send Studio preview" }));
  await waitFor(() => expect(api.sendAnimationSetToStudio).toHaveBeenCalledWith("set_one", { mode: "preview", rigPath: "Workspace.Hero" }));
  expect(api.saveAnimationSet).toHaveBeenCalledWith(expect.objectContaining({ transitions: expect.arrayContaining([
    expect.objectContaining({ from: "ready", to: "slash" }), expect.objectContaining({ from: "slash", to: "ready" }),
  ]) }));
  expect(screen.getByText(/Application and playback remain unverified/)).toBeInTheDocument();
});

test("marker scrub and comparison use actual authored data without treating asset IDs as motion", async () => {
  const data = fixture();
  data.resources.push({ id: "remote_idle", name: "Published idle", rigType: "R15", durationMs: 1200, source: { kind: "roblox_asset" }, robloxAssetId: "456", markers: [] });
  api.planAnimationSet.mockResolvedValue(data);
  render(<AnimationSetEditor />);
  await plan(); await chooseAttack();
  fireEvent.click(screen.getByRole("button", { name: "Seek Impact at 350 milliseconds" }));
  expect(screen.getByTestId("set-preview")).toHaveAttribute("data-time", "0.35");
  fireEvent.change(screen.getByLabelText("Compare resource"), { target: { value: "remote_idle" } });
  expect(screen.queryByTestId("set-preview")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Play set preview" })).toBeDisabled();
});

test("polls staged Studio receipts and keeps applied separate from verified playback", async () => {
  api.sendAnimationSetToStudio.mockResolvedValue({ id: "deployment_1", status: "queued", verified: false });
  api.getAnimationSetDeployment.mockResolvedValue({ id: "deployment_1", status: "applied", verified: false, previewRegistrationRequired: true });
  render(<AnimationSetEditor />);
  await plan();
  fireEvent.click(screen.getByRole("button", { name: "Send Studio preview" }));
  await waitFor(() => expect(api.getAnimationSetDeployment).toHaveBeenCalledWith("set_one", "deployment_1"), { timeout: 3000 });
  expect(await screen.findByText(/Rig playback and gameplay still need verification/)).toBeInTheDocument();
  expect(screen.getByText(/No verified gameplay result yet/)).toBeInTheDocument();
});

test("imports a real file into the selected slot without losing its semantic windows", async () => {
  api.importAnimationResource.mockResolvedValue({ resource: { id: "asset_imported", name: "Authored swing", rigType: "R15", durationMs: 1400, source: { kind: "imported", assetRecordId: "asset_imported" }, markers: [] } });
  render(<AnimationSetEditor projectId="project_one" />);
  await plan(); await chooseAttack();
  const file = new File(["<roblox/>"], "Authored swing.rbxmx", { type: "application/xml" });
  fireEvent.change(screen.getByLabelText("Import animation file"), { target: { files: [file] } });
  await waitFor(() => expect(screen.getByLabelText("Resource name")).toHaveValue("Authored swing"));
  expect(api.importAnimationResource).toHaveBeenCalledWith(file, { projectId: "project_one", semanticRole: "attack", rigType: "R15", name: "Authored swing" });
  fireEvent.click(screen.getByRole("button", { name: "Save set" }));
  await waitFor(() => expect(api.saveAnimationSet).toHaveBeenCalledWith(expect.objectContaining({
    resources: [expect.objectContaining({ id: "swing", source: { kind: "imported", assetRecordId: "asset_imported" } })],
    states: expect.arrayContaining([expect.objectContaining({ id: "attack", resourceId: "swing", windows: [expect.objectContaining({ startMarker: "HitStart" })] })]),
  })));
});

test("Studio controls show actual receipt results without treating queueing as playback", async () => {
  api.sendAnimationSetToStudio.mockResolvedValue({ id: "deployment_1", status: "applied", previewAttached: true, verified: false });
  api.controlAnimationSetPreview.mockResolvedValue({ commandId: "preview_command", status: "queued" });
  api.getAnimationSetPreviewReceipt.mockResolvedValue({ commandId: "preview_command", status: "completed", complete: true, result: { playing: true, activeStates: { action: "attack" } } });
  render(<AnimationSetEditor />);
  await plan(); await chooseAttack();
  fireEvent.click(screen.getByRole("button", { name: "Send Studio preview" }));
  fireEvent.click(await screen.findByRole("button", { name: "Play selected state in Studio" }));
  await waitFor(() => expect(api.controlAnimationSetPreview).toHaveBeenCalledWith("set_one", "deployment_1", { operation: "state", stateId: "attack" }));
  expect(await screen.findByText(/Preview command: queued/)).toBeInTheDocument();
  await waitFor(() => expect(api.getAnimationSetPreviewReceipt).toHaveBeenCalledWith("set_one", "deployment_1", "preview_command"), { timeout: 3000 });
  expect(await screen.findByText(/Preview command: completed/)).toBeInTheDocument();
  expect(screen.getByText(/No verified gameplay result yet/)).toBeInTheDocument();
});

test("published marker discovery applies only a stored Studio inspection receipt", async () => {
  api.inspectAnimationSetResource.mockResolvedValue({ commandId: "inspection_command", status: "queued" });
  api.applyAnimationSetResourceInspection.mockResolvedValue(fixture({ version: 2 }));
  render(<AnimationSetEditor />);
  await plan(); await chooseAttack();
  fireEvent.click(screen.getByRole("button", { name: "Inspect published markers in Studio" }));
  fireEvent.click(await screen.findByRole("button", { name: "Apply inspection receipt" }));
  await waitFor(() => expect(api.applyAnimationSetResourceInspection).toHaveBeenCalledWith("set_one", "swing", "inspection_command", 1));
  expect(await screen.findByText(/Imported marker evidence from the Studio receipt/)).toBeInTheDocument();
});

test("production access testing requires a real rig and applies its observed receipt", async () => {
  api.probeAnimationSetResourceAccess.mockResolvedValue({ commandId: "access_command", status: "queued", expectedVersion: 1 });
  api.applyAnimationSetAccessProbe.mockResolvedValue(fixture({ version: 2 }));
  render(<AnimationSetEditor />);
  await plan(); await chooseAttack();
  expect(screen.getByRole("button", { name: "Test experience access in Studio" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Target rig path"), { target: { value: "Workspace.Hero" } });
  fireEvent.click(screen.getByRole("button", { name: "Test experience access in Studio" }));
  fireEvent.click(await screen.findByRole("button", { name: "Apply access test receipt" }));
  await waitFor(() => expect(api.applyAnimationSetAccessProbe).toHaveBeenCalledWith("set_one", "swing", "access_command", 1));
  expect(api.probeAnimationSetResourceAccess).toHaveBeenCalledWith("set_one", "swing", "Workspace.Hero");
});

test("combo transition timing gates and buffers persist as editable state semantics", async () => {
  const data = fixture();
  data.transitions.push({ id: "combo", from: "attack", to: "attack", trigger: "event", event: "attack", priority: 0, blendMs: 100, windowId: "damage", bufferMs: 250 });
  api.planAnimationSet.mockResolvedValue(data);
  render(<AnimationSetEditor />);
  await plan(); await chooseAttack();
  fireEvent.change(screen.getByLabelText("Transition 2 input buffer (ms)"), { target: { value: "150" } });
  fireEvent.change(screen.getByLabelText("Transition 2 required window"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Save set" }));
  await waitFor(() => expect(api.saveAnimationSet).toHaveBeenCalledWith(expect.objectContaining({ transitions: expect.arrayContaining([
    expect.objectContaining({ id: "combo", windowId: null, bufferMs: 150 }),
  ]) })));
});
