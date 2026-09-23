// Live acceptance uses the production compiler, protocol and local connector.
// Fixtures live only under Workspace/NexusAnimationProof; never save/publish.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { RobloxStudioMcpClient } from "../local-connector/dist/mcp-client.js";
import { LocalStudio } from "../local-connector/dist/local-studio.js";
import { snapshotAcceptanceSource } from "./animation-snapshot-acceptance.mjs";
const require = createRequire(import.meta.url);
const { sanitizeToolPayload } = require("../backend/src/lib/studioToolProtocol.js");
const { AnimationMotionCompiler } = require("../backend/src/services/animation/AnimationMotionCompiler.js");
const { heuristicPlan } = require("../backend/src/services/animation/AnimationPlannerService.js");
const { planAnimationSet } = require("../backend/src/services/animation/AnimationSetTemplates.js");
const { compileAnimationSet, toLua } = require("../backend/src/services/animation/AnimationSetCompiler.js");
const { AnimationSetRepository } = require("../backend/src/services/animation/AnimationSetRepository.js");
const { AnimationSetDeploymentService } = require("../backend/src/services/animation/AnimationSetDeploymentService.js");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const studioExe = process.env.NEXUS_STUDIO_MCP;
if (!studioExe) throw new Error("Set NEXUS_STUDIO_MCP to the installed StudioMCP.exe.");
const logger = { debug() {}, info() {}, warn(message) { console.error(message); }, error(message) { console.error(message); } };
const client = new RobloxStudioMcpClient({ command: studioExe, args: [], connectorVersion: "0.3.6-animation-proof", requestTimeoutMs: 30000, toolTimeoutMs: 60000, logger });
const memory = new Map();
const local = new LocalStudio(client, { getCommand: id => memory.get(id), putCommand: (id, hash, state, result) => memory.set(id, { hash, state, result }) });
const textOf = result => result.content?.filter(c => c.type === "text").map(c => c.text).join("\n") || "";
const report = { at: new Date().toISOString(), scope: process.env.NEXUS_ANIMATION_SNAPSHOT_ONLY === "1" ? "snapshot_recovery" : process.env.NEXUS_ANIMATION_PREVIEW_ONLY === "1" ? "preview_lifecycle" : "full_edit_and_optional_play", sequenceChecks: [], limitations: ["Local Studio preview does not establish published asset access or multiplayer replication."] };
const previousReport = process.env.NEXUS_ANIMATION_REUSE_SEQUENCES === "1"
  ? JSON.parse(await fs.readFile(path.join(root, "tmp/animation-proof/resources.json"), "utf8").catch(() => fs.readFile(path.join(root, "tmp/animation-proof/latest.json"), "utf8"))) : null;
let target;
let playStarted = false;
async function lua(code, datamodel_type = "Edit") {
  const wrapped = `local result = (function()\n${code}\nend)()\nreturn game:GetService("HttpService"):JSONEncode(result)`;
  const result = await client.callTool("execute_luau", { code: wrapped, datamodel_type });
  if (result.isError) throw new Error(textOf(result));
  const decoded = JSON.parse(textOf(result));
  return typeof decoded === "string" ? JSON.parse(decoded) : decoded;
}
async function command(type, input) {
  const payload = sanitizeToolPayload(type, input);
  const result = await local.execute(type, payload, { studioId: target.activeStudioId, expectedTarget: { placeId: "0", universeId: "0", placeName: target.placeName } });
  if (!result.ok) throw new Error(`${type}: ${JSON.stringify(result)}`);
  return result;
}
try {
  target = await local.inspect(process.env.NEXUS_STUDIO_ID);
  if (!target.activeStudioId) { await new Promise(r => setTimeout(r, 1500)); target = await local.inspect(process.env.NEXUS_STUDIO_ID); }
  if (!target.activeStudioId || target.placeId !== "0" || target.universeId !== "0") throw new Error("Select one unpublished isolated Studio target before running acceptance.");
  report.target = target;
  const state = textOf(await client.callTool("get_studio_state", {}));
  if (!state.includes("Mode: Edit")) throw new Error("Studio must be in Edit mode before acceptance.");
  await command("get_project_manifest", { includeSource: false, maxInstances: 200 });
  report.fixture = await lua(`
local root = workspace:FindFirstChild("NexusAnimationProof")
for _, previous in ipairs(workspace:GetChildren()) do
  if string.match(previous.Name, "^NexusAnimationProof_Previous_") and previous:GetAttribute("NexusAnimationAcceptance") == true then previous.Parent = game:GetService("ServerStorage") end
end
if root and ${process.env.NEXUS_ANIMATION_FRESH_FIXTURE === "1" ? "true" : "false"} then
  assert(root:IsA("Folder") and root:GetAttribute("NexusAnimationAcceptance") == true, "Fixture name occupied")
  root.Name = "NexusAnimationProof_Previous_" .. game:GetService("HttpService"):GenerateGUID(false)
  root.Parent = game:GetService("ServerStorage")
  root = nil
end
if root then assert(root:IsA("Folder") and root:GetAttribute("NexusAnimationAcceptance") == true, "Fixture name occupied") else
  root = Instance.new("Folder"); root.Name = "NexusAnimationProof"; root:SetAttribute("NexusAnimationAcceptance", true); root.Parent = workspace
end
local function makeRig(name, npc, position)
  local rig = root:FindFirstChild(name)
  if rig then return rig end
  local description = Instance.new("HumanoidDescription")
  rig = game:GetService("Players"):CreateHumanoidModelFromDescriptionAsync(description, Enum.HumanoidRigType.R15)
  description:Destroy(); rig.Name = name
  if npc then rig:FindFirstChildOfClass("Humanoid"):Destroy(); local c = Instance.new("AnimationController"); c.Parent = rig; Instance.new("Animator", c) end
  local controller = rig:FindFirstChildOfClass("Humanoid") or rig:FindFirstChildOfClass("AnimationController")
  if not controller:FindFirstChildOfClass("Animator") then Instance.new("Animator", controller) end
  rig.Parent = root; rig.PrimaryPart = rig:FindFirstChild("HumanoidRootPart"); rig.PrimaryPart.Anchored = true; rig:SetPrimaryPartCFrame(CFrame.new(position, 4, 0))
  return rig
end
makeRig("Hero", false, 0); makeRig("NPC", true, 8)
return {hero=root.Hero:GetFullName(), npc=root.NPC:GetFullName()}
`);
  report.snapshots = await lua(await snapshotAcceptanceSource());
  if (process.env.NEXUS_ANIMATION_SNAPSHOT_ONLY !== "1") {
  const plan = heuristicPlan("A decisive sword attack with anticipation, impact and recovery", { durationMs: 1000, loop: false });
  const clip = new AnimationMotionCompiler().compile(plan, { prompt: "Sword attack acceptance" })[0];
  const markers = [{ name: "HitStart", timeMs: 300, value: "blade" }, { name: "Impact", timeMs: 400, value: "heavy" }, { name: "HitEnd", timeMs: 600, value: "blade" }];
  const rigPath = "Workspace/NexusAnimationProof/Hero";
  const sequencePath = `${rigPath}/AnimSaves/AcceptanceAttack`;
  const exists = await lua('return {exists=workspace.NexusAnimationProof.Hero:FindFirstChild("AnimSaves") ~= nil and workspace.NexusAnimationProof.Hero.AnimSaves:FindFirstChild("AcceptanceAttack") ~= nil}');
  const prior = exists.exists ? await command("inspect_animation_asset", { sequencePath }) : null;
  const applied = await command("create_animation_sequence", { ...clip, name: "AcceptanceAttack", rigPath, markers, expectedSequenceHash: prior?.sequenceHash || "" });
  const readback = await command("inspect_animation_asset", { sequencePath });
  report.markerReadback = readback.markers;
  assert.deepEqual(readback.markers, markers, "Semantic markers changed through Studio deployment.");
  if (readback.sequenceHash !== applied.sequenceHash) throw new Error("Sequence readback hash differs.");
  const preview = await command("preview_animation", { action: "register", sequencePath });
  report.sequenceChecks.push({ applied, readback, preview });
  report.rigs = [await command("inspect_animation_rig", { rigPath }), await command("inspect_animation_rig", { rigPath: "Workspace/NexusAnimationProof/NPC" })];
  const set = planAnimationSet({ prompt: "Complete adventurer animation system", name: "Acceptance", actor: "npc" });
  set.id = `proof_${Date.now()}`;
  set.bindings.sounds = [{ id: "contact_sound", studioPath: `${rigPath}/HumanoidRootPart/ContactSound` }];
  set.bindings.vfx = [{ id: "contact_vfx", studioPath: `${rigPath}/HumanoidRootPart/ContactVFX` }];
  set.bindings.gameplay.push({ id: "attack_impact" });
  for (const role of ["attack", "combo", "interaction"]) {
    const state = set.states.find(s => s.id === role);
    const marker = role === "interaction" ? "Contact" : "Impact";
    state.events.push({ marker, kind: "sound", resourceId: "contact_sound", action: "play" }, { marker, kind: "vfx", resourceId: "contact_vfx", action: "on" });
    if (role !== "interaction") state.events.push({ marker, kind: "gameplay", resourceId: "attack_impact", action: "impact" });
  }
  const artifact = compileAnimationSet(set);
  report.compilation = { contentHash: artifact.contentHash, basePath: artifact.basePath, resources: artifact.requiredResources.length };
  const animationIds = {};
  if (!previousReport) {
    process.env.ANIMATION_PERSISTENCE_MODE = "memory";
    const repository = new AnimationSetRepository();
    const record = await repository.create("acceptance", set);
    const receipts = new Map();
    const router = {
      async queueToolCommand(request) {
        const existing = [...receipts.values()].find(row => row.key === request.idempotencyKey);
        if (existing) return { commandId: existing.id };
        const id = `acceptance_${receipts.size}`;
        const result = await command(request.type, request.payload);
        receipts.set(id, { id, key: request.idempotencyKey, type: request.type, status: "succeeded", result });
        return { commandId: id, status: "succeeded" };
      },
      async getCommand(_userId, id) { return receipts.get(id); },
    };
    const deployment = new AnimationSetDeploymentService({ repository, router });
    let receipt = await deployment.start("acceptance", record.id, artifact, { id: target.activeStudioId }, { rigPath, mode: "preview", applyMode: "unrestricted_dev" });
    for (let tick = 0; tick < 100 && !["applied", "failed"].includes(receipt.status); tick += 1) receipt = await deployment.advance("acceptance", record.id, receipt.id);
    report.deployment = receipt;
    assert.equal(receipt.status, "applied", JSON.stringify(receipt.error));
    assert.equal(receipt.previewAttached, true);
    for (const row of receipts.values()) if (row.type === "preview_animation" && row.result.action === "register") {
      const applied = [...receipts.values()].find(other => other.type === "create_animation_sequence" && other.result.path === row.result.sequencePath);
      const resource = artifact.requiredResources.find(item => applied.result.path.endsWith(`/${item.sequenceName}`));
      animationIds[resource.resourceId] = row.result.animationId;
      const observed = await command("inspect_animation_asset", { sequencePath: row.result.sequencePath });
      assert.deepEqual(observed.markers, resource.sequence.markers);
      report.sequenceChecks.push({ resourceId: resource.resourceId, sequencePath: row.result.sequencePath, markerCount: observed.markers.length, animationId: row.result.animationId });
    }
    report.preview = {};
    report.preview.walk = await command("preview_animation", { action: "control", basePath: artifact.basePath, rigPath, operation: "request", event: "walk" });
    assert.equal(report.preview.walk.accepted, true);
    report.preview.observed = await command("preview_animation", { action: "inspect", basePath: artifact.basePath, rigPath });
    assert.equal(report.preview.observed.snapshot.running, true);
    report.preview.stopped = await command("preview_animation", { action: "stop", basePath: artifact.basePath, rigPath });
    assert.equal(report.preview.stopped.snapshot.connectionCount, 0);
    assert.equal(report.preview.stopped.snapshot.previewConnectionCount, 0);
  } else {
  for (const resource of artifact.requiredResources) {
    const reusable = previousReport?.sequenceChecks.find(item => item.resourceId === resource.resourceId);
    if (reusable) {
      const observed = await command("inspect_animation_asset", { sequencePath: reusable.sequencePath });
      assert.deepEqual(observed.markers, resource.sequence.markers);
      animationIds[resource.resourceId] = reusable.animationId;
      report.sequenceChecks.push({ ...reusable, reused: true });
      continue;
    }
    const applied = await command("create_animation_sequence", { ...resource.sequence, rigPath });
    const observed = await command("inspect_animation_asset", { sequencePath: applied.path });
    assert.deepEqual(observed.markers, resource.sequence.markers);
    const registered = await command("preview_animation", { action: "register", sequencePath: applied.path });
    animationIds[resource.resourceId] = registered.animationId;
    report.sequenceChecks.push({ resourceId: resource.resourceId, sequencePath: applied.path, markerCount: observed.markers.length, animationId: registered.animationId });
  }
  const folders = ["ReplicatedStorage/NexusAnimations", artifact.basePath];
  await fs.mkdir(path.join(root, "tmp/animation-proof"), { recursive: true });
  await fs.writeFile(path.join(root, "tmp/animation-proof/resources.json"), JSON.stringify({ sequenceChecks: report.sequenceChecks }, null, 2));
  for (const folder of folders) {
    const found = await lua(`local current = game; for name in string.gmatch(${toLua(folder)}, "[^/]+") do current = current and current:FindFirstChild(name) end; return {exists=current ~= nil}`);
    if (!found.exists) await command("create_instance", { path: folder, className: "Folder", createParents: false });
  }
  for (const file of artifact.files) await command("create_script", { path: file.targetPath, className: file.className, source: file.source, createOnly: true, createParents: false });
  }
  await fs.mkdir(path.join(root, "tmp/animation-proof"), { recursive: true });
  await fs.writeFile(path.join(root, "tmp/animation-proof/resources.json"), JSON.stringify({ sequenceChecks: report.sequenceChecks }, null, 2));
  if (process.env.NEXUS_ANIMATION_PREVIEW_ONLY === "1") {
    const resources = report.sequenceChecks.filter(item => item.resourceId).map(item => ({ resourceId: item.resourceId, sequencePath: item.sequencePath }));
    report.preview = {};
    report.preview.attached = await command("preview_animation", { action: "attach_set", basePath: artifact.basePath, rigPath, resources });
    report.preview.walk = await command("preview_animation", { action: "control", basePath: artifact.basePath, rigPath, operation: "request", event: "walk" });
    assert.equal(report.preview.walk.accepted, true);
    report.preview.observed = await command("preview_animation", { action: "inspect", basePath: artifact.basePath, rigPath });
    assert.equal(report.preview.observed.snapshot.running, true);
    report.preview.stopped = await command("preview_animation", { action: "stop", basePath: artifact.basePath, rigPath });
    assert.equal(report.preview.stopped.snapshot.animatorTrackCount, 0);
    assert.equal(report.preview.stopped.snapshot.connectionCount, 0);
    assert.equal(report.preview.stopped.snapshot.previewConnectionCount, 0);
  } else {
  report.playbackProbe = await lua(`
local folder = game.ReplicatedStorage.NexusAnimations[${toLua(artifact.basePath.split("/").at(-1))}]
local Runtime = require(folder.AnimationSetRuntime)
local config = require(folder.AnimationSetConfig)
local animator = workspace.NexusAnimationProof.Hero.Humanoid.Animator
local seen = {}
local active = Runtime.new(animator, config, {autoUpdate=false, animationIds=${toLua(animationIds)}, onMarker=function(m) table.insert(seen, m) end})
assert(active:Start())
task.wait(0.2)
local before = active:GetSnapshot()
local ok, reason = pcall(function() animator:StepAnimations(0.1) end)
active:Update(0.1)
task.wait(0.1)
local after = active:GetSnapshot()
active:Destroy()
return {before=before, after=after, canStep=ok, stepReason=tostring(reason), markers=seen, destroyed=active:GetSnapshot()}
`);
  assert.equal(report.playbackProbe.canStep, true, report.playbackProbe.stepReason);
  const acceptance = await fs.readFile(new URL("./animation-studio-acceptance.luau", import.meta.url), "utf8");
  report.runtime = await lua(`local folder = game.ReplicatedStorage.NexusAnimations[${toLua(artifact.basePath.split("/").at(-1))}]\nlocal animationIds = ${toLua(animationIds)}\n${acceptance}`);
  assert.equal(report.runtime.pass, true, report.runtime.error);
  if (process.env.NEXUS_ANIMATION_PLAY === "1") {
    const started = await client.callTool("start_stop_play", { is_start: true });
    if (started.isError) throw new Error(textOf(started));
    playStarted = true;
    const playAcceptance = await fs.readFile(new URL("./animation-play-acceptance.luau", import.meta.url), "utf8");
    const sequenceNames = Object.fromEntries(report.sequenceChecks.filter(item => item.resourceId).map(item => [item.resourceId, item.sequencePath.split("/").at(-1)]));
    report.play = await lua(`local folder = game:GetService("ReplicatedStorage"):WaitForChild("NexusAnimations"):WaitForChild(${toLua(artifact.basePath.split("/").at(-1))})\nlocal sequenceNames = ${toLua(sequenceNames)}\n${playAcceptance}`, "Server");
    assert.equal(report.play.pass, true, report.play.error);
  }
  }
  }
  report.pass = true;
} catch (error) { report.pass = false; report.error = String(error?.stack || error); process.exitCode = 1; }
finally {
  if (playStarted) {
    try { const stopped = await client.callTool("start_stop_play", { is_start: false }); report.playStopped = !stopped.isError; }
    catch (error) { report.playStopped = false; report.stopError = String(error); }
    if (!report.playStopped) { report.pass = false; process.exitCode = 1; report.error ||= report.stopError || "Studio did not acknowledge stopping Play."; }
  }
  await local.close();
  await fs.mkdir(path.join(root, "tmp/animation-proof"), { recursive: true });
  await fs.writeFile(path.join(root, "tmp/animation-proof/latest.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ pass: report.pass, error: report.error, target: report.target?.activeStudioId, sequences: report.sequenceChecks.length, evidence: "tmp/animation-proof/latest.json" }));
}
