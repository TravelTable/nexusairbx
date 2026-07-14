import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Box, CheckCircle2, ChevronDown, ChevronRight, Hammer, Loader2, Radio, XCircle } from "lib/icons";
import {
  buildNativeModelInStudio,
  getStudioCommand,
  getStudioStatus,
  validateNativeModelSpec,
} from "../../../lib/studioBridgeApi";
import StudioValidationPanel from "./StudioValidationPanel";
import { getStudioSessionId, selectPluginStudioSession } from "../../../lib/studioConnection";

function extractSpec(artifact) {
  return artifact?.nativeModelSpec || artifact?.nativeModel?.spec || artifact?.nativeBuild?.spec || null;
}

function flattenChildren(node, depth = 0, out = []) {
  if (!node) return out;
  out.push({ id: node.id, name: node.name, className: node.className, depth });
  (node.children || []).forEach((child) => flattenChildren(child, depth + 1, out));
  return out;
}

function fmtBounds(bounds) {
  if (!bounds) return "0 x 0 x 0";
  return `${bounds.x || 0} x ${bounds.y || 0} x ${bounds.z || 0}`;
}

function statusMeta(status) {
  if (status === "succeeded") return { icon: CheckCircle2, color: "text-emerald-300", label: "succeeded" };
  if (status === "failed") return { icon: XCircle, color: "text-rose-300", label: "failed" };
  if (["validating", "queueing", "waiting_for_studio", "constructing", "validating_in_studio", "placing"].includes(status)) {
    return { icon: Loader2, color: "text-cyan-300", label: status.replace(/_/g, " ") };
  }
  return { icon: Box, color: "text-gray-300", label: status || "ready" };
}

export default function NativeModelReviewPanel({ artifact, notify }) {
  const spec = extractSpec(artifact);
  const [validation, setValidation] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("validating");
  const [commandId, setCommandId] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [studioSession, setStudioSession] = useState(null);
  const [showTree, setShowTree] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const queueingRef = useRef(false);

  const hierarchy = useMemo(() => flattenChildren(validation?.normalizedSpec?.root || spec?.root), [validation, spec]);
  const summary = validation?.summary;
  const normalizedSpec = validation?.normalizedSpec || spec;
  const studioSessionId = getStudioSessionId(studioSession);
  const studioConnected = Boolean(studioSessionId);

  useEffect(() => {
    let cancelled = false;
    setValidation(null);
    setError("");
    setReceipt(null);
    setCommandId("");
    setShowValidation(false);
    queueingRef.current = false;
    if (!spec) return undefined;
    setStatus("validating");
    Promise.all([
      validateNativeModelSpec({ spec }),
      getStudioStatus().catch(() => ({ sessions: [] })),
    ])
      .then(([validated, studio]) => {
        if (cancelled) return;
        setValidation(validated);
        setStudioSession(selectPluginStudioSession(studio.sessions));
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Native model validation failed");
        setStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [spec]);

  useEffect(() => {
    if (!commandId || ["succeeded", "failed"].includes(status)) return undefined;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const command = await getStudioCommand(commandId);
        if (cancelled) return;
        if (command.status === "succeeded") {
          setReceipt(command.result || null);
          setStatus("succeeded");
          setShowValidation(true);
          clearInterval(timer);
        } else if (command.status === "failed") {
          setReceipt(command.result || null);
          setError(command.error || command.result?.error || "Studio build failed");
          setStatus("failed");
          clearInterval(timer);
        } else if (command.status === "delivered") {
          setStatus("constructing");
        } else {
          setStatus("waiting_for_studio");
        }
      } catch (_) {}
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [commandId, status]);

  if (!spec) return null;

  const meta = statusMeta(status);
  const StatusIcon = meta.icon;
  const busy = ["validating", "queueing", "waiting_for_studio", "constructing", "validating_in_studio", "placing"].includes(status);
  const canBuild = status === "ready" && studioConnected && validation?.ok;

  const onBuild = async () => {
    if (!canBuild || !normalizedSpec || queueingRef.current) return;
    queueingRef.current = true;
    setStatus("queueing");
    setError("");
    try {
      const queued = await buildNativeModelInStudio({
        spec: normalizedSpec,
        applyMode: "manual_review",
        sessionId: studioSessionId,
      });
      setCommandId(queued.commandId);
      setStatus("waiting_for_studio");
      notify?.("Native model build queued for Studio.", "success");
    } catch (err) {
      setError(err?.message || "Failed to queue native model build");
      setStatus("failed");
      queueingRef.current = false;
    }
  };

  return (
    <section className="border border-cyan-300/15 bg-cyan-300/[0.04] p-3 rounded-lg space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Box className="w-4 h-4 text-cyan-300" />
            <span className="truncate">{normalizedSpec?.name || "Native model build"}</span>
          </div>
          {normalizedSpec?.description && (
            <p className="mt-1 text-xs text-gray-400">{normalizedSpec.description}</p>
          )}
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${meta.color}`}>
          <StatusIcon className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} />
          {meta.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="border border-white/10 bg-black/20 rounded-md p-2">
          <div className="text-gray-500">Instances</div>
          <div className="font-bold text-white">{summary?.instances ?? "..."}</div>
        </div>
        <div className="border border-white/10 bg-black/20 rounded-md p-2">
          <div className="text-gray-500">Parts</div>
          <div className="font-bold text-white">{summary?.parts ?? "..."}</div>
        </div>
        <div className="border border-white/10 bg-black/20 rounded-md p-2">
          <div className="text-gray-500">Constraints</div>
          <div className="font-bold text-white">{summary?.constraints ?? "..."}</div>
        </div>
        <div className="border border-white/10 bg-black/20 rounded-md p-2">
          <div className="text-gray-500">Bounds</div>
          <div className="font-bold text-white">{fmtBounds(summary?.estimatedBounds || receipt?.bounds)}</div>
        </div>
      </div>

      <div className="text-xs text-gray-400 space-y-1">
        <div>Destination: <span className="text-gray-200">{normalizedSpec?.targetParentPath || "Workspace/NexusBuilds"}</span></div>
        <div>Placement: <span className="text-gray-200">{normalizedSpec?.placement?.mode || "camera_focus"}</span></div>
        <div className="flex items-center gap-1 text-cyan-200">
          <Radio className="w-3 h-3" />
          Editable Roblox-native geometry. No paid mesh generation. New BaseParts are anchored by default.
        </div>
      </div>

      {!!summary?.warnings?.length && (
        <div className="space-y-1">
          {summary.warnings.map((warning, index) => (
            <div key={`${warning}-${index}`} className="flex items-start gap-2 text-xs text-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-xs text-rose-200 border border-rose-300/20 bg-rose-300/10 rounded-md p-2">{String(error)}</div>
      )}

      <button
        type="button"
        onClick={() => setShowTree((value) => !value)}
        className="w-full flex items-center justify-between text-xs font-bold text-gray-300"
      >
        <span>Object hierarchy</span>
        {showTree ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {showTree && (
        <div className="max-h-48 overflow-y-auto rounded-md border border-white/10 bg-black/20 p-2 text-xs">
          {hierarchy.slice(0, 80).map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-gray-300" style={{ paddingLeft: `${item.depth * 12}px` }}>
              <span className="text-gray-500">{item.className}</span>
              <span className="truncate">{item.name || item.id}</span>
            </div>
          ))}
        </div>
      )}

      <details open={showRaw} onToggle={(event) => setShowRaw(event.currentTarget.open)}>
        <summary className="cursor-pointer text-xs font-bold text-gray-400">Advanced raw spec</summary>
        {showRaw && (
          <pre className="mt-2 max-h-56 overflow-auto rounded-md border border-white/10 bg-black/30 p-2 text-[10px] text-gray-300">
            {JSON.stringify(normalizedSpec, null, 2)}
          </pre>
        )}
      </details>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBuild}
          disabled={!canBuild}
          className="inline-flex items-center gap-2 rounded-md bg-cyan-300 px-3 py-2 text-xs font-black text-black disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Hammer className="w-3.5 h-3.5" />}
          Build in Studio
        </button>
        <button
          type="button"
          onClick={() => {
            queueingRef.current = false;
            setStatus(validation?.ok ? "ready" : "failed");
          }}
          className="rounded-md border border-white/10 px-3 py-2 text-xs font-bold text-gray-300"
        >
          Cancel
        </button>
        {!studioConnected && <span className="text-xs text-amber-200">Pair Studio to build.</span>}
      </div>

      {status === "succeeded" && (commandId || receipt?.commandId) && showValidation && (
        <StudioValidationPanel
          targetType="managed_native_model"
          targetReferenceId={commandId || receipt?.commandId}
          modelId={normalizedSpec?.modelId}
          sessionId={studioSessionId}
          onClose={() => setShowValidation(false)}
        />
      )}
    </section>
  );
}

export { extractSpec, flattenChildren };
