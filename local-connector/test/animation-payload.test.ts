import test from "node:test";
import assert from "node:assert/strict";
import { validateAnimationPayload } from "../src/animation-payload.js";
import type { JsonObject } from "../src/types.js";
const clip = (): JsonObject => ({ name: "Attack", durationMs: 1000, priority: "Action", contentHash: "a".repeat(64), rigPath: "Workspace/Hero", keyframes: [
  { timeMs: 0, joints: { UpperTorso: { rotation: [0, 0, 0, 1] } } },
  { timeMs: 1000, joints: { UpperTorso: { rotation: [0, 0, 0, 1] } } },
], markers: [{ name: "Impact", timeMs: 453, value: "blade" }] });
test("connector accepts authored sparse animation with exact marker timings", () => {
  assert.doesNotThrow(() => validateAnimationPayload("create_animation_sequence", clip()));
});
test("connector boundary rejects malformed transforms, priorities and markers", () => {
  const cases = [ { priority: "Action99" }, { durationMs: 10001 }, { rigPath: "Workspace/../Other" },
    { markers: [{ name: "Impact", timeMs: 1001 }] }, { markers: [{ name: "Impact", timeMs: 4, value: {} }] },
    { keyframes: [{ timeMs: 0, joints: { Tail: { rotation: [0, 0, 0, 1] } } }, { timeMs: 1000, joints: { UpperTorso: { rotation: [0, 0, 0, 1] } } }] },
  ];
  for (const change of cases) assert.throws(() => validateAnimationPayload("create_animation_sequence", { ...clip(), ...change } as JsonObject));
});
test("inspection accepts one target and registration requires a local clip", () => {
  assert.doesNotThrow(() => validateAnimationPayload("inspect_animation_asset", { assetId: "12345" }));
  assert.throws(() => validateAnimationPayload("inspect_animation_asset", { assetId: "12345", sequencePath: "Workspace/Clip" }));
  assert.throws(() => validateAnimationPayload("preview_animation", { action: "register" }));
});

test("preview sessions restrict module roots, rig roots, resources, controls and lifetimes", () => {
  const attach: JsonObject = { action: "attach_set", basePath: "ReplicatedStorage/NexusAnimations/Sword_v1", rigPath: "Workspace/Hero",
    resources: [{ resourceId: "attack", sequencePath: "Workspace/Hero/AnimSaves/Attack" }], lifetimeSeconds: 120 };
  assert.doesNotThrow(() => validateAnimationPayload("preview_animation", attach));
  for (const change of [{ basePath: "Workspace/Module" }, { basePath: "ReplicatedStorage/NexusAnimations/Sword/../Other" }, { rigPath: "ServerStorage/Rig" },
    { resources: [] }, { lifetimeSeconds: 301 }, { resources: [{ resourceId: "attack", assetId: "0" }] },
    { resources: [{ resourceId: "attack", assetId: "1" }, { resourceId: "attack", assetId: "2" }] }]) {
    assert.throws(() => validateAnimationPayload("preview_animation", { ...attach, ...change } as JsonObject));
  }
  for (const operation of ["pause", "resume"]) assert.doesNotThrow(() => validateAnimationPayload("preview_animation", { ...attach, action: "control", operation }));
  assert.throws(() => validateAnimationPayload("preview_animation", { ...attach, action: "control", operation: "speed", layerId: "action", speed: 0 }));
});
