import {
  countStepSnapshots,
  normalizeToolStep,
  normalizeToolStepError,
  summarizeStepResult,
  upsertAgentStep,
} from "./agentSteps";

describe("agentSteps", () => {
  test("normalizeToolStep maps SSE payload", () => {
    const step = normalizeToolStep({
      id: "s1",
      type: "write_script",
      label: "Write handler",
      status: "succeeded",
      result: { path: "ServerScriptService/Foo" },
      snapshotCount: 1,
      executionProvider: "mcp_local",
      executionSessionId: "mcp_1",
      operationId: "op_1",
      fallbackReason: "mcp_tool_unsupported",
    });
    expect(step.id).toBe("s1");
    expect(step.type).toBe("write_script");
    expect(step.snapshotCount).toBe(1);
    expect(step.executionProvider).toBe("mcp_local");
    expect(step.executionSessionId).toBe("mcp_1");
    expect(step.operationId).toBe("op_1");
    expect(step.fallbackReason).toBe("mcp_tool_unsupported");
  });

  test("normalizeToolStep omits undefined optional fields for Firestore arrays", () => {
    const step = normalizeToolStep({
      id: "s1",
      type: "inspect_place",
      status: "queued",
    });
    expect(Object.prototype.hasOwnProperty.call(step, "label")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(step, "error")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(step, "result")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(step, "snapshotCount")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(step, "runId")).toBe(false);
  });

  test("normalizes structured and disconnected Studio errors for customers", () => {
    expect(normalizeToolStepError({ message: "A useful validation error" })).toBe(
      "A useful validation error"
    );
    expect(normalizeToolStep({
      id: "s2",
      type: "search_project",
      status: "failed",
      error: { code: "MCP_SESSION_DISCONNECTED", message: "Previously active Studio is disconnected" },
    }).error).toBe("Studio is unavailable right now. Reconnect Studio and try again.");
    expect(normalizeToolStepError({ details: { internal: true } })).toBe(
      "This Studio action could not be completed."
    );
    expect(normalizeToolStepError("[object Object]")).toBe(
      "This Studio action could not be completed."
    );
    expect(normalizeToolStepError({
      code: "MCP_TOOL_UNAVAILABLE",
      message: { code: "MCP_TOOL_UNAVAILABLE", message: "Pinned MCP tool is unavailable" },
    })).toBe(
      "This Studio action is not advertised by the connected MCP server. Use a supported MCP capability or export the project for manual Studio import."
    );
    expect(normalizeToolStepError({
      code: "STUDIO_PLUGIN_REQUIRED_FOR_TOOL",
      message: "Studio plugin required for tool: create_instance",
    })).toBe(
      "This direct Studio action uses a plugin-only capability. Export the generated project for manual import, or connect the NexusRBX Studio Plugin for direct apply."
    );
    expect(normalizeToolStepError("This Studio action could not be completed.", {
      failureCode: "STUDIO_PLUGIN_REQUIRED_FOR_TOOL",
    })).toBe(
      "This direct Studio action uses a plugin-only capability. Export the generated project for manual import, or connect the NexusRBX Studio Plugin for direct apply."
    );
    expect(normalizeToolStepError({
      message: "This Studio action could not be completed.",
      publicMessage: "Local MCP can inspect this place, but this action needs the NexusRBX Studio Plugin connected and LIVE.",
    })).toBe(
      "This direct Studio action uses a plugin-only capability. Export the generated project for manual import, or connect the NexusRBX Studio Plugin for direct apply."
    );
    expect(normalizeToolStep({
      id: "s3",
      type: "read_script",
      status: "failed",
      error: "This Studio action could not be completed.",
      failureCode: "STUDIO_PLUGIN_REQUIRED_FOR_TOOL",
    }).error).toBe(
      "This direct Studio action uses a plugin-only capability. Export the generated project for manual import, or connect the NexusRBX Studio Plugin for direct apply."
    );
    expect(normalizeToolStepError("No compatible Studio provider is available")).toBe(
      "No live Studio provider is available for this action. Export the generated project for manual Studio import, or connect a Studio provider with the required capability."
    );
    expect(normalizeToolStepError(
      "Manifest revision d123ba8f-bbc8-4aeb-b5f2-9609e0c25a51 conflicted: overlapping canonical paths. Reconnect Studio and retry to build a new manifest revision."
    )).toBe(
      "Studio's project index got out of sync while scanning. A fresh scan was started automatically."
    );
    expect(summarizeStepResult({
      type: "create_instance",
      status: "failed",
      error: { code: "STUDIO_PLUGIN_REQUIRED_FOR_TOOL", message: "ignored" },
    })).toBe(
      "This direct Studio action uses a plugin-only capability. Export the generated project for manual import, or connect the NexusRBX Studio Plugin for direct apply."
    );
  });

  test("preserves recoverable Studio error metadata and target choices", () => {
    const step = normalizeToolStep({
      id: "target",
      type: "create_script",
      status: "blocked",
      error: {
        code: "STUDIO_TARGET_MISMATCH",
        message: "The selected Studio connection does not match this project.",
        details: {
          targetSelection: { options: [{ id: "place_1", label: "My Obby" }] },
        },
        recovery: "Choose a Studio project and retry.",
      },
    });

    expect(step.status).toBe("blocked");
    expect(step.errorCode).toBe("STUDIO_TARGET_MISMATCH");
    expect(step.errorDetails.targetSelection.options[0].id).toBe("place_1");
    expect(step.targetSelection.options[0].label).toBe("My Obby");
    expect(step.recovery).toBe("Choose a Studio project and retry.");
  });

  test("upsertAgentStep merges by id", () => {
    const first = upsertAgentStep([], { id: "a", type: "inspect_place", status: "running" });
    const second = upsertAgentStep(first, { id: "a", status: "succeeded", result: { count: 3 } });
    expect(second).toHaveLength(1);
    expect(second[0].status).toBe("succeeded");
    expect(second[0].result.count).toBe(3);
  });

  test("summarizeStepResult covers studio tools", () => {
    expect(
      summarizeStepResult({ type: "write_script", status: "succeeded", result: { path: "X" } })
    ).toBe("Wrote X");
    expect(
      summarizeStepResult({ type: "generate_artifact", status: "succeeded", result: { fileCount: 4 } })
    ).toBe("Generated 4 file(s)");
    expect(
      summarizeStepResult({ type: "run_smoke_check", status: "succeeded", result: { checkedScripts: 7, issues: [] } })
    ).toBe("0 issue(s), 7 script(s) checked");
    expect(
      summarizeStepResult({
        type: "get_project_manifest",
        status: "succeeded",
        payload: { cursor: "500", pageSize: 500 },
        result: {
          totalInstances: 2152,
          items: new Array(500).fill({ path: "x" }),
          pageSize: 500,
          nextCursor: "1000",
        },
      })
    ).toBe("page 2 · 500–999 of 2152 (more queued)");
  });

  test("countStepSnapshots sums snapshotCount", () => {
    expect(
      countStepSnapshots([
        { snapshotCount: 2 },
        { snapshotCount: 1 },
      ])
    ).toBe(3);
  });
});
