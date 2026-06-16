import React, { useMemo } from "react";
import { CheckCircle2, Circle, Code2, Loader2, Radio, RotateCcw, Sparkles } from "lucide-react";
import ThinkingDisclosure from "./ThinkingDisclosure";
import AgentStepList from "../workspace/AgentStepList";
import { kindMeta, statusMeta } from "../workspace/workspaceMeta";

const PHASES = ["Planning", "Writing files", "Reviewing", "Validating", "Ready"];

function resolvePhase(stage = "", streamState = {}) {
  const lower = String(stage || "").toLowerCase();
  const counts = streamState.fileCounts || {};
  const total = Number(counts.discovered || 0);
  if (/ready|complete|done/.test(lower) && total > 0) return "Ready";
  if (/validat|finaliz|saving|merge|conflict/.test(lower)) return "Validating";
  if (/review|lint|repair|audit/.test(lower) || Number(counts.reviewing || 0) > 0) return "Reviewing";
  if (Number(counts.writing || 0) > 0 || total > 0 || /generat|writing/.test(lower)) return "Writing files";
  return "Planning";
}

function lineLabel(file) {
  const count = Number(file?.lineCount || 0);
  if (!count) return "0 lines";
  return `${count} line${count === 1 ? "" : "s"}`;
}

function deriveMicroEvents(files = [], steps = []) {
  const events = [];
  const combined = files.map((file) => `${file.name}\n${file.path}\n${file.content || ""}`).join("\n");
  if (/Remote(Event|Function)/.test(combined)) events.push("Created RemoteEvent contract");
  if (/OnServer(Event|Invoke)/.test(combined) && /(typeof|type\s*\(|assert|cooldown|rateLimit|validate)/i.test(combined)) {
    events.push("Added server validation");
  }
  if (/DataStoreService/.test(combined) && /pcall/.test(combined)) events.push("Added DataStore failure guards");
  if ((steps || []).some((step) => step.type === "run_smoke_check" && step.status === "succeeded")) {
    events.push("Ran Studio smoke check");
  }
  return events.slice(0, 3);
}

function PhaseTimeline({ activePhase }) {
  const activeIndex = Math.max(0, PHASES.indexOf(activePhase));
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {PHASES.map((phase, index) => {
        const complete = index < activeIndex;
        const active = index === activeIndex;
        return (
          <div
            key={phase}
            className={`min-w-0 rounded-lg border px-2 py-1.5 ${
              active
                ? "border-[#00f5d4]/40 bg-[#00f5d4]/10 text-white"
                : complete
                  ? "border-white/10 bg-white/[0.04] text-gray-300"
                  : "border-white/5 bg-black/20 text-gray-600"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {complete ? (
                <CheckCircle2 className="w-3 h-3 text-[#00f5d4] shrink-0" />
              ) : active ? (
                <Loader2 className="w-3 h-3 text-[#00f5d4] shrink-0 motion-safe:animate-spin" />
              ) : (
                <Circle className="w-3 h-3 shrink-0" />
              )}
              <span className="text-[9px] font-black uppercase tracking-wider truncate">{phase}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FileCard({ file, active }) {
  const meta = kindMeta(file.kind);
  const status = statusMeta(file.status);
  const Icon = meta.icon;
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        active ? "border-[#00f5d4]/35 bg-[#00f5d4]/[0.06]" : "border-white/10 bg-black/25"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: meta.accent }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-white truncate">{file.name}</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 shrink-0">{meta.label}</span>
          </div>
          <div className="text-[10px] text-gray-500 truncate">{file.path}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.dot }} />
            <span className="text-[10px] font-bold text-gray-300">{status.label}</span>
          </div>
          <div className="mt-0.5 text-[10px] text-gray-600">{lineLabel(file)}</div>
        </div>
      </div>
      {file.purpose ? <div className="mt-2 text-[11px] leading-snug text-gray-400">{file.purpose}</div> : null}
    </div>
  );
}

function ActiveCodePreview({ file }) {
  if (!file) return null;
  const content = String(file.content || "");
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
        <Code2 className="w-3.5 h-3.5 text-[#00f5d4]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 truncate">
          Active file preview
        </span>
        <span className="ml-auto text-[10px] text-gray-600 truncate">{file.path}</span>
      </div>
      <pre className="max-h-48 overflow-auto p-3 text-[11px] leading-relaxed text-gray-300 whitespace-pre">
        {content || "// Waiting for streamed code..."}
      </pre>
    </div>
  );
}

export default function LiveGenerationPanel({
  pendingMessage,
  generationStage,
  onApproveStep,
  approvingStepId,
}) {
  const streamState = pendingMessage?.streamState || {};
  const files = useMemo(() => {
    if (Array.isArray(streamState.files) && streamState.files.length) return streamState.files;
    if (Array.isArray(pendingMessage?.files)) return pendingMessage.files;
    return [];
  }, [streamState.files, pendingMessage?.files]);
  const counts = streamState.fileCounts || {
    discovered: files.length,
    writing: files.filter((file) => file.status === "writing").length,
    reviewing: files.filter((file) => file.status === "reviewing").length,
    ready: files.filter((file) => file.status === "ready" || file.status === "generated").length,
  };
  const stage = pendingMessage?.stage || generationStage || "Planning";
  const activePhase = resolvePhase(stage, streamState);
  const activeFile = files.find((file) => file.id === streamState.activeFileId) ||
    files.find((file) => file.status === "writing") ||
    files[files.length - 1] ||
    null;
  const microEvents = useMemo(
    () => deriveMicroEvents(files, pendingMessage?.steps || []),
    [files, pendingMessage?.steps]
  );
  const reconnecting = pendingMessage?.streamStatus === "reconnecting" || pendingMessage?.streamStatus === "recovering";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b0b0b]/85 shadow-2xl overflow-hidden">
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              {reconnecting ? (
                <RotateCcw className="w-3.5 h-3.5 text-amber-300 motion-safe:animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[#00f5d4]" />
              )}
              Live build
            </div>
            <div className="mt-1 text-[15px] font-semibold text-white break-words">
              {reconnecting ? "Reconnecting to generation stream..." : stage}
            </div>
          </div>
          <div className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-right">
            <div className="text-[13px] font-black text-white">{counts.ready || 0}/{counts.discovered || files.length || 0}</div>
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-500">Ready</div>
          </div>
        </div>

        <PhaseTimeline activePhase={activePhase} />

        {streamState.thought ? (
          <ThinkingDisclosure text={streamState.thought} live defaultOpen label="Build reasoning" />
        ) : null}

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
            <div className="text-sm font-black text-white">{counts.discovered || files.length || 0}</div>
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-500">Discovered</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
            <div className="text-sm font-black text-white">{counts.writing || 0}</div>
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-500">Writing</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
            <div className="text-sm font-black text-white">{counts.reviewing || 0}</div>
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-500">Reviewing</div>
          </div>
        </div>

        {streamState.explanation ? (
          <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[13px] leading-relaxed text-gray-300 whitespace-pre-wrap">
            {streamState.explanation}
          </div>
        ) : null}

        {files.length ? (
          <div className="space-y-2">
            {files.map((file) => (
              <FileCard key={file.id} file={file} active={activeFile?.id === file.id} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-gray-500">
            Waiting for generated files...
          </div>
        )}

        <ActiveCodePreview file={activeFile} />

        {microEvents.length ? (
          <div className="flex flex-wrap gap-2">
            {microEvents.map((event) => (
              <span
                key={event}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#00f5d4]/20 bg-[#00f5d4]/10 px-2 py-1 text-[10px] font-bold text-[#b9fff4]"
              >
                <Radio className="w-3 h-3" />
                {event}
              </span>
            ))}
          </div>
        ) : null}

        {Array.isArray(pendingMessage?.steps) && pendingMessage.steps.length > 0 ? (
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Studio actions</div>
            <AgentStepList
              steps={pendingMessage.steps}
              maxHeight="max-h-48"
              onApproveStep={onApproveStep}
              approvingStepId={approvingStepId}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
