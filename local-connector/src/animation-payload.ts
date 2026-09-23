import { ConnectorError } from "./errors.js";
import type { JsonObject } from "./types.js";

const priorities = new Set(["Core", "Idle", "Movement", "Action", "Action2", "Action3", "Action4"]);
const joints = new Set(["LowerTorso", "UpperTorso", "Head", "LeftUpperArm", "LeftLowerArm", "LeftHand", "RightUpperArm", "RightLowerArm", "RightHand", "LeftUpperLeg", "LeftLowerLeg", "LeftFoot", "RightUpperLeg", "RightLowerLeg", "RightFoot"]);
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const fail = (message: string): never => { throw new ConnectorError("INVALID_ANIMATION_PAYLOAD", message); };
const path = (value: unknown, required = false) => {
  if (!required && (value === undefined || value === "")) return;
  if (typeof value !== "string" || value.length > 500 || !/^(Workspace|ReplicatedStorage|ServerStorage)\/[^\x00-\x1f\\]+$/.test(value) || value.split("/").some(p => !p || p === "." || p === "..")) fail("Animation path is invalid.");
};

export function validateAnimationPayload(operation: string, p: JsonObject): void {
  if (operation === "probe_animation_asset") {
    path(p.rigPath, true);
    if (typeof p.rigPath !== "string" || !p.rigPath.startsWith("Workspace/") || typeof p.assetId !== "string" || !/^[1-9]\d{0,19}$/.test(p.assetId)) fail("Probe needs a Workspace rig and published asset ID.");
    return;
  }
  if (operation === "inspect_animation_rig") { path(p.rigPath); return; }
  if (operation === "inspect_animation_asset") {
    path(p.sequencePath);
    if (p.sequencePath && p.assetId) fail("Inspect only one clip path or asset ID.");
    if (!p.sequencePath && (typeof p.assetId !== "string" || !/^[1-9]\d{0,19}$/.test(p.assetId))) fail("A valid published asset ID or clip path is required.");
    return;
  }
  if (operation === "preview_animation") {
    if (p.action === "register") { path(p.sequencePath, true); return; }
    if (!["attach_set", "control", "stop", "inspect"].includes(String(p.action))) fail("Unsupported preview action.");
    path(p.basePath, true); path(p.rigPath, true);
    if (typeof p.basePath !== "string" || !/^ReplicatedStorage\/NexusAnimations\/[A-Za-z0-9_]{1,120}$/.test(p.basePath)
      || typeof p.rigPath !== "string" || !p.rigPath.startsWith("Workspace/")) fail("Preview needs a compiled NexusAnimations folder and Workspace rig.");
    const identifier = (value: unknown) => { if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(value)) fail("Invalid preview identifier."); };
    if (p.action === "attach_set") {
      if (!Array.isArray(p.resources) || p.resources.length < 1 || p.resources.length > 64) fail("Preview needs 1–64 resources.");
      const seen = new Set();
      for (const entry of p.resources as JsonObject[]) {
        if (!object(entry)) fail("Invalid preview resource.");
        identifier(entry.resourceId);
        if (seen.has(entry.resourceId)) fail("Duplicate preview resource ID.");
        seen.add(entry.resourceId);
        if (Boolean(entry.sequencePath) === Boolean(entry.assetId)) fail("Preview resource needs one clip path or asset ID.");
        if (entry.sequencePath) path(entry.sequencePath, true);
        else if (typeof entry.assetId !== "string" || !/^[1-9]\d{0,19}$/.test(entry.assetId)) fail("Invalid preview asset ID.");
      }
      if (p.lifetimeSeconds !== undefined && (typeof p.lifetimeSeconds !== "number" || !Number.isFinite(p.lifetimeSeconds) || p.lifetimeSeconds < 15 || p.lifetimeSeconds > 300)) fail("Preview lifetime must be 15–300 seconds.");
    }
    if (p.action === "control") {
      if (!["request", "state", "speed", "pause", "resume"].includes(String(p.operation))) fail("Unsupported preview control.");
      if (p.operation === "request") identifier(p.event);
      if (p.operation === "state") identifier(p.stateId);
      if (p.operation === "speed") {
        identifier(p.layerId);
        if (typeof p.speed !== "number" || !Number.isFinite(p.speed) || p.speed < 0.1 || p.speed > 4) fail("Preview speed must be 0.1–4.");
      }
    }
    return;
  }
  path(p.rigPath);
  if (typeof p.name !== "string" || !p.name.trim() || p.name.length > 80 || /[\x00-\x1f/\\]/.test(p.name)) fail("Animation name is invalid.");
  if (typeof p.durationMs !== "number" || !Number.isInteger(p.durationMs) || p.durationMs < 500 || p.durationMs > 10000) fail("Animation duration must be 500–10000ms.");
  const durationMs = p.durationMs as number;
  if (p.priority !== undefined && !priorities.has(String(p.priority))) fail("Invalid animation priority.");
  if (typeof p.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(p.contentHash)) fail("A content hash is required.");
  if (p.expectedSequenceHash && !/^[a-f0-9]{8,64}$/.test(String(p.expectedSequenceHash))) fail("Invalid sequence fingerprint.");
  if (!Array.isArray(p.keyframes) || p.keyframes.length < 2 || p.keyframes.length > 61) fail("Animation needs 2–61 keyframes.");
  const keyframes = p.keyframes as JsonObject[];
  let previous = -1;
  for (const frame of keyframes) {
    if (!object(frame) || typeof frame.timeMs !== "number" || !Number.isInteger(frame.timeMs) || frame.timeMs <= previous || frame.timeMs > durationMs || !object(frame.joints)) fail("Invalid keyframe time or channels.");
    previous = frame.timeMs as number;
    const entries = Object.entries(frame.joints as JsonObject);
    if (!entries.length || entries.length > 15) fail("Invalid joint count.");
    for (const [name, transform] of entries) {
      if (!joints.has(name) || !object(transform) || Object.keys(transform).some(k => k !== "rotation")) fail("Unsupported joint transform.");
      const q = (transform as JsonObject).rotation;
      if (!Array.isArray(q) || q.length !== 4 || q.some(n => typeof n !== "number" || !Number.isFinite(n)) || Math.abs(Math.hypot(...q as number[]) - 1) > 0.001) fail("Rotation must be a normalized quaternion.");
    }
    if (frame.easingStyle !== undefined && !["Linear", "Constant", "Elastic", "Cubic", "Bounce"].includes(String(frame.easingStyle))) fail("Invalid pose easing.");
    if (frame.easingDirection !== undefined && !["In", "Out", "InOut"].includes(String(frame.easingDirection))) fail("Invalid easing direction.");
  }
  if (keyframes[0]?.timeMs !== 0 || previous !== p.durationMs) fail("Keyframes must include both animation endpoints.");
  if (p.markers !== undefined && (!Array.isArray(p.markers) || p.markers.length > 128)) fail("At most 128 markers are allowed.");
  for (const marker of (p.markers || []) as JsonObject[]) {
    if (!object(marker) || typeof marker.name !== "string" || !/^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(marker.name)
      || typeof marker.timeMs !== "number" || !Number.isInteger(marker.timeMs) || marker.timeMs < 0 || marker.timeMs > durationMs
      || (marker.value !== undefined && (typeof marker.value !== "string" || marker.value.length > 500))) fail("Invalid animation marker.");
  }
}
