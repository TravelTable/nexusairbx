import { ConnectorError } from "./errors.js";
import type { JsonObject, McpClientLike, StudioCommand, StudioTarget, ToolCallResult } from "./types.js";

export class StudioTargetManager {
  targets: StudioTarget[] = [];
  activeStudioId: string | null = null;
  desiredStudioId: string | null = null;
  placeId = "";
  placeName = "";
  universeId = "";
  placeSignature = "";
  confirmedAt: number | null = null;

  constructor(private readonly mcp: McpClientLike) {}

  acceptBackendResponse(value: JsonObject): boolean {
    const direct = typeof value.desiredStudioId === "string" ? value.desiredStudioId : null;
    const session = object(value.session);
    const nested = typeof session?.desiredStudioId === "string" ? session.desiredStudioId : null;
    const next = direct || nested || this.desiredStudioId;
    const changed = next !== this.desiredStudioId;
    this.desiredStudioId = next;
    return changed;
  }

  async refresh(signal?: AbortSignal): Promise<void> {
    const listed = await this.mcp.callTool("list_roblox_studios", {}, signal);
    assertTargetToolSucceeded(listed, "Studio target discovery failed.");
    this.targets = parseTargets(listed);
    if (new Set(this.targets.map((target) => target.studioId)).size !== this.targets.length) {
      throw new ConnectorError("STUDIO_TARGET_AMBIGUOUS", "Roblox Studio MCP returned duplicate target identifiers.");
    }
    const wanted = this.targets.length === 1 ? this.targets[0]?.studioId : this.desiredStudioId;
    if (!wanted || !this.targets.some((target) => target.studioId === wanted)) {
      this.activeStudioId = null;
      this.placeId = "";
      this.placeName = "";
      this.universeId = "";
      this.placeSignature = "";
      this.confirmedAt = null;
      return;
    }
    const selected = await this.mcp.callTool("set_active_studio", { studio_id: wanted }, signal);
    assertTargetToolSucceeded(selected, "Roblox Studio refused the requested target.");
    const stateResult = await this.mcp.callTool("get_studio_state", {}, signal);
    assertTargetToolSucceeded(stateResult, "Roblox Studio target attestation failed.");
    const state = parseState(stateResult);
    if (this.targets.length > 1 && !state.studioId) {
      throw new ConnectorError("STUDIO_TARGET_ATTESTATION_INCOMPLETE", "Roblox Studio did not confirm which window is active.");
    }
    if (state.studioId && state.studioId !== wanted) throw new ConnectorError("STUDIO_TARGET_MISMATCH", "Roblox Studio selected a different window.");
    this.activeStudioId = wanted;
    const target = this.targets.find((item) => item.studioId === wanted);
    this.placeId = state.placeId || target?.placeId || "";
    this.placeName = state.placeName || target?.placeName || "";
    this.universeId = state.universeId || target?.universeId || "";
    this.placeSignature = state.placeSignature || target?.placeSignature || "";
    this.confirmedAt = Date.now();
  }

  async ensureMutationTarget(command?: StudioCommand, signal?: AbortSignal): Promise<void> {
    await this.refresh(signal);
    if (!this.activeStudioId) {
      throw new ConnectorError(this.targets.length > 1 ? "STUDIO_TARGET_SELECTION_REQUIRED" : "STUDIO_TARGET_UNAVAILABLE",
        this.targets.length > 1 ? "Choose the Studio window before making changes." : "No confirmed Roblox Studio window is available.");
    }
    this.validateCommandTarget(command);
  }

  metadata(): JsonObject {
    return {
      studioTargets: this.targets,
      activeStudioId: this.activeStudioId,
      placeId: this.placeId,
      placeName: this.placeName,
      universeId: this.universeId,
      placeSignature: this.placeSignature,
      targetConfirmedAt: this.confirmedAt,
    };
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
    const expectedPlaceSignature = firstBounded([command.expectedPlaceSignature, nested?.placeSignature, nested?.place_signature], 256);

    if (expectedStudioId && expectedStudioId !== this.activeStudioId) {
      throw new ConnectorError("STUDIO_TARGET_MISMATCH", "The active Studio window does not match the command target.");
    }
    assertIdentityMatch("place", expectedPlaceId, this.placeId);
    assertIdentityMatch("universe", expectedUniverseId, this.universeId);
    assertIdentityMatch("place signature", expectedPlaceSignature, this.placeSignature);
  }
}

function parseTargets(result: ToolCallResult): StudioTarget[] {
  const root = parseResult(result);
  const raw = Array.isArray(root) ? root : object(root)?.studios || object(root)?.instances || [];
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 20).flatMap((item, index) => {
    const value = object(item);
    const studioId = bounded(value?.studio_id ?? value?.studioId ?? value?.id, 160);
    if (!studioId) return [];
    const placeName = bounded(value?.place_name ?? value?.placeName ?? value?.name, 160);
    const placeId = bounded(value?.place_id ?? value?.placeId, 40);
    const universeId = bounded(value?.universe_id ?? value?.universeId, 40);
    const placeSignature = bounded(value?.place_signature ?? value?.placeSignature, 256);
    return [{ studioId, label: placeName || `Roblox Studio ${index + 1}`, placeId, placeName, universeId, placeSignature }];
  });
}

function parseState(result: ToolCallResult): { studioId: string; placeId: string; placeName: string; universeId: string; placeSignature: string } {
  const root = object(parseResult(result)) || {};
  const nested = object(root.studio) || object(root.state) || root;
  return {
    studioId: bounded(nested.studio_id ?? nested.studioId ?? nested.id, 160),
    placeId: bounded(nested.place_id ?? nested.placeId, 40),
    placeName: bounded(nested.place_name ?? nested.placeName ?? nested.experienceName ?? nested.name, 160),
    universeId: bounded(nested.universe_id ?? nested.universeId, 40),
    placeSignature: bounded(nested.place_signature ?? nested.placeSignature, 256),
  };
}

function parseResult(result: ToolCallResult): unknown {
  if (result.structuredContent !== undefined) return result.structuredContent;
  const texts = Array.isArray(result.content) ? result.content.flatMap((item) => typeof object(item)?.text === "string" ? [object(item)!.text] : []) : [];
  try { return JSON.parse(texts.join("\n")); } catch { return {}; }
}
function object(value: unknown): Record<string, unknown> | null { return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function bounded(value: unknown, max: number): string { return typeof value === "string" ? value.trim().slice(0, max) : typeof value === "number" ? String(value).slice(0, max) : ""; }
function firstBounded(values: unknown[], max: number): string { for (const value of values) { const next = bounded(value, max); if (next) return next; } return ""; }
function assertTargetToolSucceeded(result: ToolCallResult, message: string): void { if (result.isError === true) throw new ConnectorError("STUDIO_TARGET_UNAVAILABLE", message); }
function assertIdentityMatch(label: string, expected: string, actual: string): void {
  if (!expected) return;
  if (!actual) throw new ConnectorError("STUDIO_TARGET_ATTESTATION_INCOMPLETE", `Roblox Studio did not attest the target ${label}.`);
  if (expected !== actual) throw new ConnectorError("STUDIO_TARGET_MISMATCH", `The active Studio ${label} does not match the command target.`);
}
