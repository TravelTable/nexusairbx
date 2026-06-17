import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, Check, RefreshCw, X } from "lucide-react";
import {
  applyNativeModelPatch,
  getStudioCommand,
  inspectNativeModel,
  validateNativeModelPatch,
} from "../../lib/studioBridgeApi";

async function pollCommand(commandId, { timeoutMs = 45000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const command = await getStudioCommand(commandId);
    if (command.status === "succeeded") return command;
    if (command.status === "failed") throw new Error(command.error || "Studio command failed");
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error("Studio command timed out");
}

function renderValue(value) {
  if (value == null) return "none";
  if (typeof value !== "object") return String(value);
  if (value.$type === "Color3") return `rgb(${Math.round(value.r * 255)}, ${Math.round(value.g * 255)}, ${Math.round(value.b * 255)})`;
  if (value.$type === "Vector3") return `${value.x}, ${value.y}, ${value.z}`;
  if (value.$type === "Enum") return value.name;
  return JSON.stringify(value);
}

export default function NativeModelRefinementReview({
  modelPath,
  modelId,
  patch,
  requestedChange = "",
  sessionId = null,
  onApplied,
  onCancel,
}) {
  const [state, setState] = useState("idle");
  const [inspection, setInspection] = useState(null);
  const [validation, setValidation] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");
  const [destructiveConfirmed, setDestructiveConfirmed] = useState(false);

  const destructive = validation?.destructiveConfirmationRequired === true || validation?.diff?.impact?.destructive === true;
  const canApply = state === "ready" && (!destructive || destructiveConfirmed);

  const affectedCount = useMemo(() => {
    return validation?.diff?.impact?.instancesModified || validation?.diff?.changes?.length || 0;
  }, [validation]);

  const refreshAndValidate = useCallback(async () => {
    setError("");
    setReceipt(null);
    setValidation(null);
    setState("inspecting");
    try {
      const queued = await inspectNativeModel({ modelPath, modelId, sessionId });
      const command = await pollCommand(queued.commandId);
      const result = command.result || {};
      if (!result.inspectionId) throw new Error("Studio inspection did not return an inspection reference");
      setInspection(result);
      setState("validating");
      const patchWithRevision = {
        ...(patch || {}),
        modelId: patch?.modelId || modelId,
        expectedRevision: patch?.expectedRevision || result.revision,
      };
      const validated = await validateNativeModelPatch({
        inspectionId: result.inspectionId,
        modelId,
        modelPath,
        sessionId,
        patch: patchWithRevision,
      });
      setValidation(validated);
      setState("ready");
    } catch (err) {
      setError(err?.message || "Native model refinement failed");
      setState(String(err?.message || "").includes("changed in Studio") ? "conflict" : "failed");
    }
  }, [modelPath, modelId, patch, sessionId]);

  const applyPatch = useCallback(async () => {
    if (!inspection?.inspectionId || !validation?.normalizedPatch || !canApply) return;
    setError("");
    setState("queueing");
    try {
      const queued = await applyNativeModelPatch({
        inspectionId: inspection.inspectionId,
        patch: validation.normalizedPatch,
        expectedRevision: validation.normalizedPatch.expectedRevision,
        modelId,
        modelPath,
        sessionId,
        destructiveConfirmed,
      });
      setState("waiting_for_studio");
      const command = await pollCommand(queued.commandId, { timeoutMs: 60000 });
      setReceipt(command.result || {});
      setState("succeeded");
      onApplied?.(command.result || {});
    } catch (err) {
      setError(err?.message || "Failed to apply native model patch");
      setState(String(err?.message || "").includes("changed in Studio") ? "conflict" : "failed");
    }
  }, [inspection, validation, canApply, modelId, modelPath, sessionId, destructiveConfirmed, onApplied]);

  return (
    <section className="w-full border border-white/10 bg-[#0c111d] p-4 text-sm text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-white/55">Native Model Refinement</div>
          <h3 className="mt-1 text-base font-semibold">{inspection?.rootName || modelId}</h3>
          <p className="mt-1 max-w-2xl text-xs text-white/60">{requestedChange || validation?.normalizedPatch?.summary || "Review the prepared model edit."}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={refreshAndValidate} disabled={state === "inspecting" || state === "validating"} className="inline-flex h-9 items-center gap-2 border border-white/15 px-3 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50">
            <RefreshCw size={15} />
            Refresh
          </button>
          <button type="button" onClick={onCancel} className="inline-flex h-9 items-center gap-2 border border-white/15 px-3 text-xs font-semibold text-white hover:bg-white/10">
            <X size={15} />
            Cancel
          </button>
        </div>
      </div>

      {inspection && (
        <div className="mt-4 grid gap-2 text-xs text-white/70 sm:grid-cols-3">
          <span>Revision: {inspection.revision}</span>
          <span>Affected: {affectedCount}</span>
          <span>Bounds: {renderValue(validation?.diff?.impact?.estimatedBoundsAfter || inspection.summary?.bounds)}</span>
        </div>
      )}

      {destructive && (
        <label className="mt-4 flex items-center gap-3 border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">
          <input type="checkbox" checked={destructiveConfirmed} onChange={(event) => setDestructiveConfirmed(event.target.checked)} />
          <AlertTriangle size={16} />
          Confirm removal of managed model instances.
        </label>
      )}

      {validation?.diff && (
        <div className="mt-4 space-y-2">
          {validation.diff.changes.map((change, index) => (
            <div key={`${change.type}-${change.targetId}-${index}`} className="border border-white/10 p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-white/50">{change.type.replaceAll("_", " ")}</div>
              <div className="mt-1 font-medium">{change.targetName || change.instanceName || change.targetId}</div>
              {change.property && <div className="mt-1 text-xs text-white/65">{change.property}: {renderValue(change.before)} to {renderValue(change.after)}</div>}
              {change.description && <div className="mt-1 text-xs text-white/65">{change.description}</div>}
              {change.descendantsRemoved != null && <div className="mt-1 text-xs text-amber-100">{change.descendantsRemoved} descendants removed</div>}
            </div>
          ))}
        </div>
      )}

      {error && <div className="mt-4 border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-100">{error}</div>}

      {receipt?.ok && (
        <div className="mt-4 flex items-center gap-2 border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">
          <Check size={16} />
          Applied {receipt.operations?.applied || 0} operations. New revision: {receipt.newRevision}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button type="button" onClick={applyPatch} disabled={!canApply || state === "queueing" || state === "waiting_for_studio"} className="inline-flex h-9 items-center gap-2 bg-white px-4 text-xs font-bold text-black hover:bg-white/90 disabled:opacity-50">
          <Check size={15} />
          Apply changes
        </button>
      </div>
    </section>
  );
}
