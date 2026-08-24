import { ConnectorError } from "./errors.js";
import type {
  JsonObject,
  McpClientLike,
  StudioCommand,
  StudioIdentityMetadata,
  StudioTarget,
  ToolCallResult,
} from "./types.js";

export class StudioTargetManager {
  targets: StudioTarget[] = [];
  activeStudioId: string | null = null;
  desiredStudioId: string | null = null;
  placeId = "";
  placeName = "";
  universeId = "";
  placeSignature = "";
  confirmedAt: number | null = null;
  private identityProbeAvailable: boolean;
  private targetLockTail: Promise<void> = Promise.resolve();
  private targetLockWaiters = 0;

  constructor(
    private readonly mcp: McpClientLike,
    identityProbeAvailable = false,
    private readonly perCallStudioTargeting = false,
  ) {
    this.identityProbeAvailable = identityProbeAvailable;
  }

  setIdentityProbeAvailable(available: boolean): void {
    this.identityProbeAvailable = available;
  }

  acceptBackendResponse(value: JsonObject): boolean {
    const session = object(value.session);
    const directPresent = Object.hasOwn(value, "desiredStudioId");
    const nestedPresent = session !== null && Object.hasOwn(session, "desiredStudioId");
    const next = directPresent
      ? nullableBounded(value.desiredStudioId, 160)
      : nestedPresent
        ? nullableBounded(session?.desiredStudioId, 160)
        : this.desiredStudioId;
    const changed = next !== this.desiredStudioId;
    this.desiredStudioId = next;
    return changed;
  }

  async refresh(signal?: AbortSignal): Promise<void> {
    await this.withTargetLock(() => this.refreshUnlocked(signal), signal);
  }

  async refreshIfIdle(signal?: AbortSignal): Promise<boolean> {
    if (this.targetLockWaiters > 0) return false;
    await this.refresh(signal);
    return true;
  }

  async ensureMutationTarget(command?: StudioCommand, signal?: AbortSignal): Promise<void> {
    await this.withTargetLock(async () => {
      await this.refreshUnlocked(signal);
      this.assertMutationTarget(command);
    }, signal);
  }

  async withMutationTarget<T>(
    command: StudioCommand,
    action: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    return this.withTargetLock(async () => {
      await this.refreshUnlocked(signal);
      this.assertMutationTarget(command);
      return action();
    }, signal);
  }

  private async refreshUnlocked(signal?: AbortSignal): Promise<void> {
    try {
      const listed = await this.mcp.callTool("list_roblox_studios", {}, signal);
      assertTargetToolSucceeded(listed, "Studio target discovery failed.");
      this.targets = parseTargets(listed);
      if (new Set(this.targets.map((target) => target.studioId)).size !== this.targets.length) {
        throw new ConnectorError("STUDIO_TARGET_AMBIGUOUS", "Roblox Studio MCP returned duplicate target identifiers.");
      }
      const wanted = this.targets.length === 1 ? this.targets[0]?.studioId : this.desiredStudioId;
      if (!wanted || !this.targets.some((target) => target.studioId === wanted)) {
        this.clearActiveIdentity();
        return;
      }
      const selected = await this.mcp.callTool("set_active_studio", { studio_id: wanted }, signal);
      assertTargetToolSucceeded(selected, "Roblox Studio refused the requested target.");
      const stateResult = await this.mcp.callTool("get_studio_state", {}, signal);
      assertTargetToolSucceeded(stateResult, "Roblox Studio target attestation failed.");
      const state = parseState(stateResult);
      assertSelectedStudioState(state, wanted, this.targets.length, this.perCallStudioTargeting);
      const target = this.targets.find((item) => item.studioId === wanted);
      let probe = emptyIdentity();
      let confirmedState = state;
      if (this.identityProbeAvailable) {
        try {
          const probeResult = await this.mcp.callTool("execute_luau", {
            code: STUDIO_IDENTITY_PROBE,
            datamodel_type: "Edit",
          }, signal);
          assertTargetToolSucceeded(probeResult, "Roblox Studio identity probe failed.");
          probe = parseState(probeResult);
        } catch (error) {
          if (signal?.aborted) throw error;
          // A complete identity returned by the target/state tools remains usable.
          // Otherwise metadata and capabilities below fail closed.
        }
        const reselected = await this.mcp.callTool("set_active_studio", { studio_id: wanted }, signal);
        assertTargetToolSucceeded(reselected, "Roblox Studio refused target re-confirmation.");
        const confirmedResult = await this.mcp.callTool("get_studio_state", {}, signal);
        assertTargetToolSucceeded(confirmedResult, "Roblox Studio target re-confirmation failed.");
        confirmedState = parseState(confirmedResult);
        assertSelectedStudioState(confirmedState, wanted, this.targets.length, this.perCallStudioTargeting);
        assertCompatibleIdentity("place", state.placeId, confirmedState.placeId);
        assertCompatibleIdentity("universe", state.universeId, confirmedState.universeId);
      }
      assertCompatibleIdentity("place", confirmedState.placeId || target?.placeId || "", probe.placeId);
      assertCompatibleIdentity("universe", confirmedState.universeId || target?.universeId || "", probe.universeId);
      assertCompatibleIdentity("place signature", confirmedState.placeSignature || target?.placeSignature || "", probe.placeSignature);
      this.activeStudioId = wanted;
      this.placeId = probe.placeId || confirmedState.placeId || target?.placeId || "";
      this.placeName = probe.placeName || confirmedState.placeName || target?.placeName || "";
      this.universeId = probe.universeId || confirmedState.universeId || target?.universeId || "";
      this.placeSignature = probe.placeSignature || confirmedState.placeSignature || target?.placeSignature || "";
      this.targets = this.targets.map((item) => item.studioId === wanted ? {
        ...item,
        label: this.placeName || item.label,
        placeId: this.placeId,
        placeName: this.placeName,
        universeId: this.universeId,
        placeSignature: this.placeSignature,
      } : item);
      this.confirmedAt = Date.now();
    } catch (error) {
      this.targets = [];
      this.clearActiveIdentity();
      throw error;
    }
  }

  private assertMutationTarget(command?: StudioCommand): void {
    if (!this.activeStudioId) {
      throw new ConnectorError(this.targets.length > 1 ? "STUDIO_TARGET_SELECTION_REQUIRED" : "STUDIO_TARGET_UNAVAILABLE",
        this.targets.length > 1 ? "Choose the Studio window before making changes." : "No confirmed Roblox Studio window is available.");
    }
    if (!this.targetIdentityComplete) {
      throw new ConnectorError(
        "STUDIO_TARGET_ATTESTATION_INCOMPLETE",
        "Roblox Studio did not attest a complete target identity.",
      );
    }
    this.validateCommandTarget(command);
  }

  get targetIdentityComplete(): boolean {
    return this.exactIdentity() !== null;
  }

  metadata(): StudioIdentityMetadata {
    const identity = this.exactIdentity();
    return {
      studioTargets: this.targets,
      activeStudioId: identity?.studioId ?? null,
      studioId: identity?.studioId ?? null,
      placeId: identity?.placeId ?? null,
      placeName: identity?.placeName ?? null,
      universeId: identity?.universeId ?? null,
      placeSignature: identity?.placeSignature ?? null,
      targetIdentityComplete: identity !== null,
      targetConfirmedAt: identity === null ? null : this.confirmedAt,
    };
  }

  identityKey(): string {
    const metadata = this.metadata();
    return JSON.stringify({
      studioId: metadata.studioId,
      placeId: metadata.placeId,
      placeName: metadata.placeName,
      universeId: metadata.universeId,
      placeSignature: metadata.placeSignature,
      studioTargets: [...this.targets]
        .sort((left, right) => left.studioId.localeCompare(right.studioId))
        .map(({ studioId, placeId, placeName, universeId, placeSignature }) => ({
          studioId,
          placeId,
          placeName,
          universeId,
          placeSignature,
        })),
    });
  }

  private exactIdentity(): {
    studioId: string;
    placeId: string;
    placeName: string;
    universeId: string;
    placeSignature: string;
  } | null {
    const publishedIdentity = isPublishedRobloxId(this.placeId)
      && isPublishedRobloxId(this.universeId);
    const localIdentity = this.placeId === "0" && this.universeId === "0";
    if (!this.activeStudioId
      || (this.desiredStudioId !== null && this.desiredStudioId !== this.activeStudioId)
      || (!publishedIdentity && !localIdentity)
      || !this.placeName
      || !this.placeSignature) return null;
    return {
      studioId: this.activeStudioId,
      placeId: this.placeId,
      placeName: this.placeName,
      universeId: this.universeId,
      placeSignature: this.placeSignature,
    };
  }

  private clearActiveIdentity(): void {
    this.activeStudioId = null;
    this.placeId = "";
    this.placeName = "";
    this.universeId = "";
    this.placeSignature = "";
    this.confirmedAt = null;
  }

  private async withTargetLock<T>(action: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const previous = this.targetLockTail;
    let release = (): void => {};
    this.targetLockTail = new Promise<void>((resolve) => { release = resolve; });
    this.targetLockWaiters += 1;
    await previous;
    try {
      if (signal?.aborted) throw signal.reason ?? new DOMException("The operation was aborted", "AbortError");
      return await action();
    } finally {
      this.targetLockWaiters -= 1;
      release();
    }
  }

  private validateCommandTarget(command?: StudioCommand): void {
    if (!command) return;
    if (command.connectionType && command.connectionType !== "mcp_local") {
      throw new ConnectorError("STUDIO_CONNECTION_TYPE_MISMATCH", "The Studio command was routed to a different connection type.");
    }
    const nested = object(command.studioTarget);
    const expectedStudioId = bounded(nested?.studioId ?? nested?.studio_id, 160);
    const expectedPlaceId = firstBounded([command.expectedPlaceId, command.placeId, nested?.placeId, nested?.place_id], 40);
    const expectedUniverseId = firstBounded([command.expectedUniverseId, command.universeId, nested?.universeId, nested?.universe_id], 40);
    const expectedPlaceSignature = firstBounded([command.expectedPlaceSignature, nested?.placeSignature, nested?.place_signature], 128);

    if (expectedStudioId && expectedStudioId !== this.activeStudioId) {
      throw new ConnectorError("STUDIO_TARGET_MISMATCH", "The active Studio window does not match the command target.");
    }
    assertIdentityMatch("place", expectedPlaceId, this.placeId);
    assertIdentityMatch("universe", expectedUniverseId, this.universeId);
    assertIdentityMatch("place signature", expectedPlaceSignature, this.placeSignature);
  }
}

function parseTargets(result: ToolCallResult): StudioTarget[] {
  const parsed = parseResult(result);
  const root = Array.isArray(parsed) ? parsed : unwrapResultRecord(parsed);
  const raw = Array.isArray(root) ? root : object(root)?.studios || object(root)?.instances || [];
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 20).flatMap((item, index) => {
    const value = object(item);
    const studioId = bounded(value?.studio_id ?? value?.studioId ?? value?.id, 160);
    if (!studioId) return [];
    const placeName = bounded(value?.place_name ?? value?.placeName ?? value?.name, 160);
    const placeId = bounded(value?.place_id ?? value?.placeId, 40);
    const universeId = bounded(value?.universe_id ?? value?.universeId, 40);
    const placeSignature = bounded(value?.place_signature ?? value?.placeSignature, 128);
    return [{ studioId, label: placeName || `Roblox Studio ${index + 1}`, placeId, placeName, universeId, placeSignature }];
  });
}

function parseState(result: ToolCallResult): { studioId: string; placeId: string; placeName: string; universeId: string; placeSignature: string } {
  const root = unwrapResultRecord(parseResult(result));
  const nested = object(root.studio) || object(root.state) || root;
  return {
    studioId: bounded(nested.studio_id ?? nested.studioId ?? nested.id, 160),
    placeId: bounded(nested.place_id ?? nested.placeId, 40),
    placeName: bounded(nested.place_name ?? nested.placeName ?? nested.experienceName ?? nested.name, 160),
    universeId: bounded(nested.universe_id ?? nested.universeId, 40),
    placeSignature: bounded(nested.place_signature ?? nested.placeSignature, 128),
  };
}

function unwrapResultRecord(value: unknown): Record<string, unknown> {
  let current = object(value) || {};
  for (let depth = 0; depth < 3; depth += 1) {
    const nested = object(current.result) || object(current.data) || object(current.value);
    if (!nested) break;
    current = nested;
  }
  return current;
}

function emptyIdentity(): ReturnType<typeof parseState> {
  return { studioId: "", placeId: "", placeName: "", universeId: "", placeSignature: "" };
}

function assertCompatibleIdentity(label: string, declared: string, probed: string): void {
  if (declared && probed && declared !== probed) {
    throw new ConnectorError("STUDIO_TARGET_MISMATCH", `Roblox Studio returned conflicting ${label} identity.`);
  }
}

function assertSelectedStudioState(
  state: ReturnType<typeof parseState>,
  wanted: string,
  targetCount: number,
  perCallStudioTargeting: boolean,
): void {
  // Current Studio MCP targets every tool call with a required studio_id but
  // returns a human-readable get_studio_state response that omits that ID.
  // In that mode the MCP client itself enforces and injects the selected ID,
  // so requiring the server to echo it would reject a correctly routed call.
  // Explicit set_active_studio providers still have to attest the active ID.
  if (!perCallStudioTargeting && targetCount > 1 && !state.studioId) {
    throw new ConnectorError("STUDIO_TARGET_ATTESTATION_INCOMPLETE", "Roblox Studio did not confirm which window is active.");
  }
  if (state.studioId && state.studioId !== wanted) {
    throw new ConnectorError("STUDIO_TARGET_MISMATCH", "Roblox Studio selected a different window.");
  }
}

const STUDIO_IDENTITY_PROBE = `-- __nexus_target_identity_probe_v1
local preferred = {
  game:GetService("ReplicatedStorage"), game:GetService("ServerScriptService"),
  game:GetService("ServerStorage"), game:GetService("StarterGui"),
  game:GetService("StarterPlayer"), game:GetService("Workspace"),
  game:GetService("Lighting")
}
local roots, seen = {}, {}
for _, instance in ipairs(preferred) do
  if instance and not seen[instance] then seen[instance] = true; table.insert(roots, instance) end
end
for _, instance in ipairs(game:GetChildren()) do
  if not seen[instance] then seen[instance] = true; table.insert(roots, instance) end
end
table.sort(roots, function(a, b)
  if a.Name ~= b.Name then return tostring(a.Name) < tostring(b.Name) end
  return tostring(a.ClassName) < tostring(b.ClassName)
end)
local parts = {}
for _, instance in ipairs(roots) do
  local ok, children = pcall(function() return instance:GetChildren() end)
  table.insert(parts, tostring(instance.Name) .. ":" .. tostring(instance.ClassName) .. ":" .. tostring(ok and #children or 0))
end
local hash = 2166136261
local text = table.concat(parts, "|")
for index = 1, #text do
  hash = bit32.bxor(hash, string.byte(text, index))
  hash = (hash * 16777619) % 4294967296
end
return {
  placeId = tostring(game.PlaceId), universeId = tostring(game.GameId),
  placeName = game.Name, placeSignature = string.format("%08x", hash)
}`;

function parseResult(result: ToolCallResult): unknown {
  if (result.structuredContent !== undefined) return result.structuredContent;
  const texts = Array.isArray(result.content) ? result.content.flatMap((item) => typeof object(item)?.text === "string" ? [object(item)!.text] : []) : [];
  try { return JSON.parse(texts.join("\n")); } catch { return {}; }
}
function object(value: unknown): Record<string, unknown> | null { return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function bounded(value: unknown, max: number): string { return typeof value === "string" ? value.trim().slice(0, max) : typeof value === "number" ? String(value).slice(0, max) : ""; }
function nullableBounded(value: unknown, max: number): string | null { return bounded(value, max) || null; }
function firstBounded(values: unknown[], max: number): string { for (const value of values) { const next = bounded(value, max); if (next) return next; } return ""; }
function isPublishedRobloxId(value: string): boolean { return /^[1-9]\d{0,39}$/.test(value); }
function assertTargetToolSucceeded(result: ToolCallResult, message: string): void { if (result.isError === true) throw new ConnectorError("STUDIO_TARGET_UNAVAILABLE", message); }
function assertIdentityMatch(label: string, expected: string, actual: string): void {
  if (!expected) return;
  if (!actual) throw new ConnectorError("STUDIO_TARGET_ATTESTATION_INCOMPLETE", `Roblox Studio did not attest the target ${label}.`);
  if (expected !== actual) throw new ConnectorError("STUDIO_TARGET_MISMATCH", `The active Studio ${label} does not match the command target.`);
}
