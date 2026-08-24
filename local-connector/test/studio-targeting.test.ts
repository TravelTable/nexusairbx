import assert from "node:assert/strict";
import test from "node:test";
import { StudioTargetManager } from "../src/studio-targeting.js";
import type { DiscoveredTool, JsonObject, McpClientLike, McpConnectionInfo, StudioCommand, ToolCallResult } from "../src/types.js";

class FakeMcp implements McpClientLike {
  studios: JsonObject[] = [];
  selected = "";
  stateStudioId = "";
  omitStateStudioId = false;
  selectionFails = false;
  probeIdentity: JsonObject | null = null;
  probeResult: ToolCallResult | null = null;
  probeHook: (() => void) | null = null;
  calls: Array<{ name: string; args: JsonObject }> = [];

  async connect(): Promise<McpConnectionInfo> { return {}; }
  async disconnect(): Promise<void> {}
  async listTools(): Promise<DiscoveredTool[]> { return []; }
  onToolsChanged(): void {}
  onDisconnect(): void {}
  async callTool(name: string, args: JsonObject): Promise<ToolCallResult> {
    this.calls.push({ name, args });
    if (name === "list_roblox_studios") return { structuredContent: { studios: this.studios } };
    if (name === "set_active_studio") {
      if (this.selectionFails) return { isError: true, content: [{ type: "text", text: "selection failed" }] };
      this.selected = String(args.studio_id || "");
      return { structuredContent: { ok: true } };
    }
    if (name === "get_studio_state") {
      const target = this.studios.find((studio) => studio.studio_id === (this.stateStudioId || this.selected));
      return { structuredContent: { studio_id: this.omitStateStudioId ? undefined : this.stateStudioId || this.selected, place_id: target?.place_id, place_name: target?.place_name, universe_id: target?.universe_id, place_signature: target?.place_signature } };
    }
    if (name === "execute_luau" && (this.probeResult || this.probeIdentity)) {
      this.probeHook?.();
      return this.probeResult ?? { structuredContent: this.probeIdentity };
    }
    throw new Error(`Unexpected tool ${name}`);
  }
}

test("a single open Studio is selected and its place is reported", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [{ studio_id: "studio-a", place_id: "101", place_name: "Arena" }];
  const manager = new StudioTargetManager(mcp);
  await manager.refresh();
  assert.equal(manager.activeStudioId, "studio-a");
  assert.equal(manager.placeId, "101");
  assert.equal(manager.placeName, "Arena");
  assert.deepEqual(mcp.calls[1], { name: "set_active_studio", args: { studio_id: "studio-a" } });
});

test("multiple Studios require an enumerated backend choice", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [
    { studio_id: "studio-a", place_id: "101", universe_id: "201", place_name: "Arena", place_signature: "sig-a" },
    { studio_id: "studio-b", place_id: "102", universe_id: "202", place_name: "Obby", place_signature: "sig-b" },
  ];
  const manager = new StudioTargetManager(mcp);
  await assert.rejects(() => manager.ensureMutationTarget(), (error: any) => error?.code === "STUDIO_TARGET_SELECTION_REQUIRED");
  manager.acceptBackendResponse({ session: { desiredStudioId: "studio-b" } });
  await manager.ensureMutationTarget();
  assert.equal(manager.activeStudioId, "studio-b");
  assert.equal(manager.placeName, "Obby");
});

test("a fixed identity probe enriches the exact selected Studio target", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [{ studio_id: "studio-a", place_name: "Window label" }];
  mcp.probeIdentity = {
    result: {
      placeId: "116714509720053",
      universeId: "10669840815",
      placeName: "NexusRBX Pipeline Test",
      placeSignature: "a1b2c3d4",
    },
  };
  const manager = new StudioTargetManager(mcp, true);

  await manager.refresh();

  assert.equal(manager.placeId, "116714509720053");
  assert.equal(manager.universeId, "10669840815");
  assert.equal(manager.placeSignature, "a1b2c3d4");
  assert.equal(manager.targets[0]?.placeId, "116714509720053");
  assert.equal(manager.targets[0]?.label, "NexusRBX Pipeline Test");
  assert.deepEqual(manager.metadata(), {
    studioTargets: [{
      studioId: "studio-a",
      label: "NexusRBX Pipeline Test",
      placeId: "116714509720053",
      placeName: "NexusRBX Pipeline Test",
      universeId: "10669840815",
      placeSignature: "a1b2c3d4",
    }],
    activeStudioId: "studio-a",
    studioId: "studio-a",
    placeId: "116714509720053",
    placeName: "NexusRBX Pipeline Test",
    universeId: "10669840815",
    placeSignature: "a1b2c3d4",
    targetIdentityComplete: true,
    targetConfirmedAt: manager.confirmedAt,
  });
  const probeCall = mcp.calls.find(({ name }) => name === "execute_luau");
  assert.equal(probeCall?.args.datamodel_type, "Edit");
  assert.match(String(probeCall?.args.code), /__nexus_target_identity_probe_v1/);
});

test("an unpublished local place is targetable when its Studio window and signature are attested", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [{ studio_id: "studio-local", place_name: "LocalArena.rbxl" }];
  mcp.probeIdentity = {
    result: {
      placeId: "0",
      universeId: "0",
      placeName: "LocalArena.rbxl",
      placeSignature: "local-signature",
    },
  };
  const manager = new StudioTargetManager(mcp, true);

  await manager.ensureMutationTarget({
    id: "local-command",
    type: "create_instance",
    payload: {},
    connectionType: "mcp_local",
    expectedPlaceId: "0",
    expectedUniverseId: "0",
    expectedPlaceSignature: "local-signature",
    expectedStudioWindowId: "studio-local",
    studioTarget: { expectedStudioWindowId: "studio-local" },
  });

  assert.deepEqual(manager.metadata(), {
    studioTargets: [{
      studioId: "studio-local",
      label: "LocalArena.rbxl",
      placeId: "0",
      placeName: "LocalArena.rbxl",
      universeId: "0",
      placeSignature: "local-signature",
    }],
    activeStudioId: "studio-local",
    studioId: "studio-local",
    placeId: "0",
    placeName: "LocalArena.rbxl",
    universeId: "0",
    placeSignature: "local-signature",
    targetIdentityComplete: true,
    targetConfirmedAt: manager.confirmedAt,
  });
});

test("the identity probe cannot override a conflicting declared place", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [{ studio_id: "studio-a", place_id: "101" }];
  mcp.probeIdentity = { placeId: "999", universeId: "201", placeSignature: "sig" };
  const manager = new StudioTargetManager(mcp, true);

  await assert.rejects(() => manager.refresh(), (error: any) => error?.code === "STUDIO_TARGET_MISMATCH");
  assert.equal(manager.activeStudioId, null);
  assert.deepEqual(manager.targets, []);
  assert.equal(manager.metadata().targetIdentityComplete, false);
});

test("identity probe JSON text wrappers are normalized", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [{ studio_id: "studio-a", place_name: "Window label" }];
  mcp.probeResult = { content: [{
    type: "text",
    text: JSON.stringify({ result: {
      placeId: "116714509720053",
      universeId: "10669840815",
      placeName: "NexusRBX Pipeline Test",
      placeSignature: "a1b2c3d4",
    } }),
  }] };
  const manager = new StudioTargetManager(mcp, true);

  await manager.refresh();

  assert.equal(manager.metadata().placeId, "116714509720053");
  assert.equal(manager.metadata().placeSignature, "a1b2c3d4");
});

test("a window switch during the identity probe fails post-confirmation", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [
    { studio_id: "studio-a", place_id: "101", place_name: "Arena", universe_id: "201", place_signature: "sig-a" },
    { studio_id: "studio-b", place_id: "102", place_name: "Obby", universe_id: "202", place_signature: "sig-b" },
  ];
  mcp.probeIdentity = { result: {
    placeId: "102",
    universeId: "202",
    placeName: "Obby",
    placeSignature: "sig-b",
  } };
  mcp.probeHook = () => { mcp.stateStudioId = "studio-b"; };
  const manager = new StudioTargetManager(mcp, true);
  manager.acceptBackendResponse({ desiredStudioId: "studio-a" });

  await assert.rejects(() => manager.refresh(), (error: any) => error?.code === "STUDIO_TARGET_MISMATCH");

  assert.equal(manager.activeStudioId, null);
  assert.equal(manager.metadata().targetIdentityComplete, false);
});

test("a window label alone never becomes server-consumable target identity", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [{ studio_id: "studio-a", place_name: "Unattested label" }];
  const manager = new StudioTargetManager(mcp);

  await manager.refresh();

  assert.equal(manager.activeStudioId, "studio-a");
  assert.deepEqual(manager.metadata(), {
    studioTargets: [{
      studioId: "studio-a",
      label: "Unattested label",
      placeId: "",
      placeName: "Unattested label",
      universeId: "",
      placeSignature: "",
    }],
    activeStudioId: null,
    studioId: null,
    placeId: null,
    placeName: null,
    universeId: null,
    placeSignature: null,
    targetIdentityComplete: false,
    targetConfirmedAt: null,
  });
  await assert.rejects(
    () => manager.ensureMutationTarget(),
    (error: any) => error?.code === "STUDIO_TARGET_ATTESTATION_INCOMPLETE",
  );
});

test("a stale desired window prevents a sole different window from becoming complete", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [
    { studio_id: "studio-a", place_id: "101", place_name: "Arena", universe_id: "201", place_signature: "sig-a" },
    { studio_id: "studio-b", place_id: "102", place_name: "Obby", universe_id: "202", place_signature: "sig-b" },
  ];
  const manager = new StudioTargetManager(mcp);
  manager.acceptBackendResponse({ desiredStudioId: "studio-b" });
  await manager.refresh();
  assert.equal(manager.metadata().studioId, "studio-b");

  mcp.studios = [mcp.studios[0]!];
  mcp.stateStudioId = "";
  await manager.refresh();

  assert.equal(manager.activeStudioId, "studio-a");
  assert.equal(manager.metadata().studioId, null);
  assert.equal(manager.metadata().targetIdentityComplete, false);
  await assert.rejects(
    () => manager.ensureMutationTarget(),
    (error: any) => error?.code === "STUDIO_TARGET_ATTESTATION_INCOMPLETE",
  );
});

test("multiple Studios require exact switch confirmation", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [{ studio_id: "studio-a" }, { studio_id: "studio-b" }];
  mcp.omitStateStudioId = true;
  const manager = new StudioTargetManager(mcp);
  manager.acceptBackendResponse({ desiredStudioId: "studio-b" });
  await assert.rejects(() => manager.ensureMutationTarget(), (error: any) => error?.code === "STUDIO_TARGET_ATTESTATION_INCOMPLETE");

  mcp.omitStateStudioId = false;
  mcp.selectionFails = true;
  await assert.rejects(() => manager.ensureMutationTarget(), (error: any) => error?.code === "STUDIO_TARGET_UNAVAILABLE");
});

test("per-call Studio targeting accepts a selected window when state omits the echoed id", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [
    { studio_id: "studio-a", place_name: "Arena" },
    { studio_id: "studio-b", place_name: "Obby" },
  ];
  mcp.omitStateStudioId = true;
  mcp.probeIdentity = { result: {
    placeId: "102",
    universeId: "202",
    placeName: "Obby",
    placeSignature: "sig-b",
  } };
  const manager = new StudioTargetManager(mcp, true, true);
  manager.acceptBackendResponse({ desiredStudioId: "studio-b" });

  await manager.ensureMutationTarget();

  assert.equal(manager.activeStudioId, "studio-b");
  assert.equal(manager.metadata().targetIdentityComplete, true);
  assert.equal(manager.metadata().placeName, "Obby");
});

test("a command cannot mutate a different place, universe, signature, or connection type", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [{ studio_id: "studio-a", place_id: "101", place_name: "Arena", universe_id: "201", place_signature: "sig-a" }];
  const manager = new StudioTargetManager(mcp);
  const base: StudioCommand = { id: "command", type: "create_instance", payload: {}, connectionType: "mcp_local" };

  await manager.ensureMutationTarget({ ...base, expectedPlaceId: "101", expectedUniverseId: "201", expectedPlaceSignature: "sig-a" });
  await assert.rejects(() => manager.ensureMutationTarget({ ...base, expectedPlaceId: "999" }), (error: any) => error?.code === "STUDIO_TARGET_MISMATCH");
  await assert.rejects(() => manager.ensureMutationTarget({ ...base, connectionType: "plugin_bridge" }), (error: any) => error?.code === "STUDIO_CONNECTION_TYPE_MISMATCH");
});

test("a delayed command is rejected after Studio switches to a different attested window", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [{ studio_id: "studio-a", place_id: "101", place_name: "Arena", universe_id: "201", place_signature: "sig-a" }];
  const manager = new StudioTargetManager(mcp);
  await manager.refresh();

  mcp.studios = [{ studio_id: "studio-b", place_id: "101", place_name: "Arena", universe_id: "201", place_signature: "sig-a" }];
  manager.acceptBackendResponse({ desiredStudioId: "studio-b" });
  let executed = false;
  await assert.rejects(
    () => manager.withCommandTarget({
      id: "delayed-read",
      type: "read_script",
      payload: {},
      connectionType: "mcp_local",
      expectedPlaceId: "101",
      expectedUniverseId: "201",
      expectedPlaceSignature: "sig-a",
      expectedStudioWindowId: "studio-a",
    }, async () => {
      executed = true;
    }),
    (error: any) => error?.code === "STUDIO_TARGET_MISMATCH",
  );
  assert.equal(executed, false);
  assert.equal(manager.activeStudioId, "studio-b");
});

test("conflicting command window aliases are rejected before execution", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [{ studio_id: "studio-a", place_id: "101", place_name: "Arena", universe_id: "201", place_signature: "sig-a" }];
  const manager = new StudioTargetManager(mcp);
  await manager.refresh();

  let executed = false;
  await assert.rejects(
    () => manager.withCommandTarget({
      id: "conflicting-window-read",
      type: "read_script",
      payload: {},
      connectionType: "mcp_local",
      expectedPlaceId: "101",
      expectedUniverseId: "201",
      expectedPlaceSignature: "sig-a",
      expectedStudioWindowId: "studio-a",
      studioTarget: { studioId: "studio-b" },
    }, async () => {
      executed = true;
    }),
    (error: any) => error?.code === "STUDIO_TARGET_MISMATCH",
  );
  assert.equal(executed, false);
});

test("lifecycle-v2 canonical target copies are present, type-strict, and equal for published and local targets", async (t) => {
  const cases = [
    { name: "published", placeId: "101", universeId: "201" },
    { name: "unpublished", placeId: "0", universeId: "0" },
  ];
  const canonicalFields = [
    "targetId",
    "sessionId",
    "expectedPlaceId",
    "expectedUniverseId",
    "expectedPlaceSignature",
    "targetGeneration",
    "expectedStudioWindowId",
  ] as const;

  for (const identity of cases) {
    const command = (): StudioCommand => ({
      id: `strict-${identity.name}`,
      commandId: `strict-${identity.name}`,
      type: "read_script",
      payload: { path: "game.ServerScriptService.Main" },
      lifecycleVersion: 2,
      connectionType: "mcp_local",
      targetId: "target-strict",
      sessionId: "session-strict",
      expectedPlaceId: identity.placeId === "0" ? null : identity.placeId,
      expectedUniverseId: identity.universeId === "0" ? null : identity.universeId,
      placeId: identity.placeId === "0" ? null : identity.placeId,
      universeId: identity.universeId === "0" ? null : identity.universeId,
      expectedPlaceSignature: "strict-signature",
      targetGeneration: 1,
      expectedStudioWindowId: "studio-strict",
      studioTarget: {
        targetId: "target-strict",
        sessionId: "session-strict",
        expectedPlaceId: identity.placeId === "0" ? null : identity.placeId,
        expectedUniverseId: identity.universeId === "0" ? null : identity.universeId,
        expectedPlaceSignature: "strict-signature",
        targetGeneration: 1,
        expectedStudioWindowId: "studio-strict",
      },
      lease: { owner: "session-strict", fence: 1, targetFence: 0, expiresAt: Date.now() + 10_000 },
    });
    const assertNeverExecutes = async (candidate: StudioCommand): Promise<void> => {
      const mcp = new FakeMcp();
      mcp.studios = [{
        studio_id: "studio-strict",
        place_id: identity.placeId,
        universe_id: identity.universeId,
        place_name: "Strict Fixture",
        place_signature: "strict-signature",
      }];
      const manager = new StudioTargetManager(mcp);
      let executed = false;
      await assert.rejects(
        () => manager.withCommandTarget(candidate, async () => { executed = true; }),
        (error: any) => error?.code === "STUDIO_TARGET_ATTESTATION_INCOMPLETE"
          || error?.code === "STUDIO_TARGET_MISMATCH",
      );
      assert.equal(executed, false);
    };

    for (const field of canonicalFields) {
      await t.test(`${identity.name}: missing top-level ${field}`, async () => {
        const candidate = command() as unknown as Record<string, unknown>;
        delete candidate[field];
        await assertNeverExecutes(candidate as unknown as StudioCommand);
      });
      await t.test(`${identity.name}: missing nested ${field}`, async () => {
        const candidate = command();
        delete (candidate.studioTarget as Record<string, unknown>)[field];
        await assertNeverExecutes(candidate);
      });
      await t.test(`${identity.name}: malformed/conflicting nested ${field}`, async () => {
        const candidate = command();
        const nested = candidate.studioTarget as Record<string, unknown>;
        nested[field] = field === "targetGeneration"
          ? "1"
          : field === "expectedPlaceId" || field === "expectedUniverseId"
            ? Number(field === "expectedPlaceId" ? identity.placeId : identity.universeId)
            : 123;
        await assertNeverExecutes(candidate);
      });
    }

    for (const field of ["placeId", "universeId"] as const) {
      await t.test(`${identity.name}: missing top-level ${field}`, async () => {
        const candidate = command() as unknown as Record<string, unknown>;
        delete candidate[field];
        await assertNeverExecutes(candidate as unknown as StudioCommand);
      });
      await t.test(`${identity.name}: conflicting top-level ${field}`, async () => {
        const candidate = command() as unknown as Record<string, unknown>;
        candidate[field] = "999";
        await assertNeverExecutes(candidate as unknown as StudioCommand);
      });
    }
  }
});

test("a mismatched active Studio is refused before mutation", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [{ studio_id: "studio-a" }, { studio_id: "studio-b" }];
  mcp.stateStudioId = "studio-a";
  const manager = new StudioTargetManager(mcp);
  manager.acceptBackendResponse({ desiredStudioId: "studio-b" });
  await assert.rejects(() => manager.ensureMutationTarget(), (error: any) => error?.code === "STUDIO_TARGET_MISMATCH");
  assert.equal(manager.activeStudioId, null);
});

test("closing the selected Studio clears stale place identity", async () => {
  const mcp = new FakeMcp();
  mcp.studios = [{ studio_id: "studio-a", place_id: "101", place_name: "Arena" }];
  const manager = new StudioTargetManager(mcp);
  await manager.refresh();
  mcp.studios = [];
  await assert.rejects(() => manager.ensureMutationTarget(), (error: any) => error?.code === "STUDIO_TARGET_UNAVAILABLE");
  assert.equal(manager.activeStudioId, null);
  assert.equal(manager.placeId, "");
  assert.equal(manager.placeName, "");
  assert.deepEqual(manager.metadata(), {
    studioTargets: [],
    activeStudioId: null,
    studioId: null,
    placeId: null,
    placeName: null,
    universeId: null,
    placeSignature: null,
    targetIdentityComplete: false,
    targetConfirmedAt: null,
  });
});
