import { ConnectorError } from "./errors.js";
import type { JsonObject, McpClientLike, StudioTarget, ToolCallResult } from "./types.js";

export class StudioTargetManager {
  targets: StudioTarget[] = [];
  activeStudioId: string | null = null;
  desiredStudioId: string | null = null;
  placeId = "";
  placeName = "";
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
    this.targets = parseTargets(await this.mcp.callTool("list_roblox_studios", {}, signal));
    const wanted = this.targets.length === 1 ? this.targets[0]?.studioId : this.desiredStudioId;
    if (!wanted || !this.targets.some((target) => target.studioId === wanted)) {
      this.activeStudioId = null;
      this.placeId = "";
      this.placeName = "";
      this.confirmedAt = null;
      return;
    }
    await this.mcp.callTool("set_active_studio", { studio_id: wanted }, signal);
    const state = parseState(await this.mcp.callTool("get_studio_state", {}, signal));
    if (state.studioId && state.studioId !== wanted) throw new ConnectorError("STUDIO_TARGET_MISMATCH", "Roblox Studio selected a different window.");
    this.activeStudioId = wanted;
    const target = this.targets.find((item) => item.studioId === wanted);
    this.placeId = state.placeId || target?.placeId || "";
    this.placeName = state.placeName || target?.placeName || "";
    this.confirmedAt = Date.now();
  }

  async ensureMutationTarget(signal?: AbortSignal): Promise<void> {
    await this.refresh(signal);
    if (!this.activeStudioId) {
      throw new ConnectorError(this.targets.length > 1 ? "STUDIO_TARGET_SELECTION_REQUIRED" : "STUDIO_TARGET_UNAVAILABLE",
        this.targets.length > 1 ? "Choose the Studio window before making changes." : "No confirmed Roblox Studio window is available.");
    }
  }

  metadata(): JsonObject {
    return {
      studioTargets: this.targets,
      activeStudioId: this.activeStudioId,
      placeId: this.placeId,
      placeName: this.placeName,
      targetConfirmedAt: this.confirmedAt,
    };
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
    return [{ studioId, label: placeName || `Roblox Studio ${index + 1}`, placeId, placeName }];
  });
}

function parseState(result: ToolCallResult): { studioId: string; placeId: string; placeName: string } {
  const root = object(parseResult(result)) || {};
  const nested = object(root.studio) || object(root.state) || root;
  return {
    studioId: bounded(nested.studio_id ?? nested.studioId ?? nested.id, 160),
    placeId: bounded(nested.place_id ?? nested.placeId, 40),
    placeName: bounded(nested.place_name ?? nested.placeName ?? nested.experienceName ?? nested.name, 160),
  };
}

function parseResult(result: ToolCallResult): unknown {
  if (result.structuredContent !== undefined) return result.structuredContent;
  const texts = Array.isArray(result.content) ? result.content.flatMap((item) => typeof object(item)?.text === "string" ? [object(item)!.text] : []) : [];
  try { return JSON.parse(texts.join("\n")); } catch { return {}; }
}
function object(value: unknown): Record<string, unknown> | null { return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function bounded(value: unknown, max: number): string { return typeof value === "string" ? value.trim().slice(0, max) : typeof value === "number" ? String(value).slice(0, max) : ""; }
