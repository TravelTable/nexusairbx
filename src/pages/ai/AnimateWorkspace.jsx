import React, { useEffect, useRef, useState } from "react";
import {
  Clock3,
  History,
  Layers,
  Play,
  Plus,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Square,
  WandSparkles,
} from "lib/icons";
import {
  AnimatedGenerateIcon,
  AnimatedMotionIcon,
  AnimatedSettingsIcon,
  AnimatedUploadIcon,
} from "components/ui/AnimatedActionIcon";
import {
  generateAnimation,
  refineAnimation,
  sendAnimationToStudio,
} from "lib/animationApi";
import R15Preview from "./animation/R15Preview";
import InfoHint from "./animation/InfoHint";
import MotionPromptComposer from "./animation/MotionPromptComposer";
import MotionTaskList from "./animation/MotionTaskList";
import MotionVariantList from "./animation/MotionVariantList";
import "./AnimateWorkspace.css";

const STARTER_PROMPTS = [
  "A confident hero landing with heavy anticipation and a sharp recovery",
  "A friendly right-handed wave that feels cheerful but not cartoony",
  "A fast stylized run cycle with strong arm drive, kept in place",
];
const GENERATION_STAGES = [
  "Reading the motion brief",
  "Searching licensed motion references",
  "Planning R15 body mechanics",
  "Compiling three safe variants",
  "Checking loop closure and joint limits",
];
const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content: "Describe a motion. I’ll build three R15 takes.",
};
const DEFAULT_PREVIEW_MODEL = {
  id: "blocky-r15",
  label: "Blocky R15",
  url: "/models/nexusrbx-r15-preview.glb",
};
const MAX_PREVIEW_MODEL_BYTES = 20 * 1024 * 1024;

function formatTime(value) {
  return `${Number(value || 0).toFixed(2)}s`;
}

function messageId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function modelName(model) {
  const slug = String(model || "").split("/").at(-1) || "AI model";
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b(?:gpt|ai)\b/gi, (value) => value.toUpperCase())
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function routingDisclosure(routing) {
  if (!routing) return "The selected AI Studio model will author the motion plan.";
  if (routing.deterministicFallback) {
    return `Requested ${modelName(routing.requested)} · compiled with the deterministic R15 fallback`;
  }
  if (routing.fallbackUsed || routing.requested !== routing.resolved) {
    return `Requested ${modelName(routing.requested)} · generated with ${modelName(routing.resolved)}`;
  }
  return `Generated with ${modelName(routing.resolved)}`;
}

export default function AnimateWorkspace({ modelVersion = "", onBillingRefresh = null }) {
  const [prompt, setPrompt] = useState("");
  const [refinement, setRefinement] = useState("");
  const [animation, setAnimation] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState("Private draft");
  const [studioState, setStudioState] = useState("Send to Studio");
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [previewModel, setPreviewModel] = useState(DEFAULT_PREVIEW_MODEL);
  const [customPreviewModel, setCustomPreviewModel] = useState(null);
  const lastFrameRef = useRef(null);
  const promptInputRef = useRef(null);
  const modelInputRef = useRef(null);
  const customModelUrlRef = useRef("");

  const variants = animation?.variants || [];
  const selectedVariant = variants.find((variant) => variant.variant.id === selectedVariantId) || variants[0] || null;
  const durationSeconds = Math.max(0.5, Number(selectedVariant?.durationMs || 2000) / 1000);
  const motionChecks = [
    { label: "Joint limits", complete: Boolean(selectedVariant?.quality?.jointLimitPass) },
    { label: "Loop closure", complete: Boolean(selectedVariant?.quality?.loopClosurePass) },
    { label: "In-place root", complete: Boolean(selectedVariant) },
  ];

  useEffect(() => {
    if (!busy) return undefined;
    const timer = window.setInterval(() => {
      setStageIndex((index) => Math.min(index + 1, GENERATION_STAGES.length - 1));
    }, 900);
    return () => window.clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    if (!playing) {
      lastFrameRef.current = null;
      return undefined;
    }
    let frameId = 0;
    const tick = (timestamp) => {
      const previous = lastFrameRef.current ?? timestamp;
      lastFrameRef.current = timestamp;
      const delta = Math.min((timestamp - previous) / 1000, 0.1);
      setCurrentTime((value) => {
        const next = value + delta;
        if (next < durationSeconds) return next;
        if (selectedVariant?.loop) return next % durationSeconds;
        setPlaying(false);
        return durationSeconds;
      });
      frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [durationSeconds, playing, selectedVariant?.loop]);

  useEffect(() => {
    setCurrentTime(0);
    setPlaying(false);
  }, [selectedVariantId]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code !== "Space") return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, button, select, [contenteditable='true']")) return;
      event.preventDefault();
      setPlaying((value) => !value);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => () => {
    if (customModelUrlRef.current) URL.revokeObjectURL(customModelUrlRef.current);
  }, []);

  const acceptAnimation = (nextAnimation, assistantMessage) => {
    setAnimation(nextAnimation);
    setSelectedVariantId(nextAnimation.selectedVariantId || nextAnimation.variants?.[0]?.variant?.id || "");
    setSaveState(`Saved · v${nextAnimation.version || 1}`);
    setMessages((current) => [...current, {
      id: messageId("assistant"),
      role: "assistant",
      content: assistantMessage,
    }]);
  };

  const handleGenerate = async (event, promptOverride = "") => {
    event?.preventDefault?.();
    const motionBrief = String(promptOverride || prompt).trim();
    if (motionBrief.length < 3 || busy) return;
    setPrompt("");
    setError("");
    setBusy(true);
    setStageIndex(0);
    setMessages((current) => [...current, { id: messageId("user"), role: "user", content: motionBrief }]);
    try {
      const result = await generateAnimation({
        prompt: motionBrief,
        modelVersion: String(modelVersion || ""),
        previewModelId: previewModel.id,
        previewModelLabel: previewModel.label,
      });
      acceptAnimation(
        result,
        `I built ${result.variants?.length || 3} ${result.rigType || "R15"} ${result.plan?.archetype || "motion"} variants for “${result.name}” on ${previewModel.label}. Pick one to preview, or tell me what to change.`,
      );
      onBillingRefresh?.();
    } catch (requestError) {
      setError(requestError?.message || "Animation generation failed. Try a shorter motion brief.");
    } finally {
      setBusy(false);
    }
  };

  const handleRefine = async (event) => {
    event.preventDefault();
    const change = refinement.trim();
    if (!animation?.id || change.length < 3 || busy) return;
    setRefinement("");
    setError("");
    setBusy(true);
    setStageIndex(0);
    setMessages((current) => [...current, { id: messageId("user"), role: "user", content: change }]);
    try {
      const result = await refineAnimation(animation.id, {
        prompt: change,
        modelVersion: String(modelVersion || ""),
        previewModelId: previewModel.id,
        previewModelLabel: previewModel.label,
      });
      acceptAnimation(result, `Updated the motion and rebuilt all three variants. This is version ${result.version || 2}.`);
      onBillingRefresh?.();
    } catch (requestError) {
      setError(requestError?.message || "The refinement could not be applied.");
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = () => {
    if (!animation) return;
    try {
      window.localStorage.setItem("nexusrbx:animation-draft", JSON.stringify({
        schemaVersion: 1,
        animationId: animation.id,
        name: animation.name,
        selectedVariantId: selectedVariant?.variant?.id,
        version: animation.version,
      }));
      setSaveState("Saved locally + cloud");
    } catch (_) {
      setSaveState("Cloud saved");
    }
  };

  const startNewAnimationChat = () => {
    if (busy) return;
    setPrompt("");
    setRefinement("");
    setAnimation(null);
    setSelectedVariantId("");
    setCurrentTime(0);
    setPlaying(false);
    setStageIndex(0);
    setError("");
    setSaveState("Private draft");
    setStudioState("Send to Studio");
    setMessages([WELCOME_MESSAGE]);
    try {
      window.localStorage.removeItem("nexusrbx:animation-draft");
    } catch (_) {
      // Cloud animations remain saved even when local draft storage is unavailable.
    }
    promptInputRef.current?.focus();
  };

  const selectPreviewModel = (event) => {
    const model = event.target.value === "custom-r15" ? customPreviewModel : DEFAULT_PREVIEW_MODEL;
    if (model) setPreviewModel(model);
  };

  const importPreviewModel = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.glb$/i.test(file.name)) {
      setError("Preview models must be binary glTF (.glb) files with a standard R15 armature.");
      return;
    }
    if (file.size > MAX_PREVIEW_MODEL_BYTES) {
      setError("Preview models must be 20 MB or smaller.");
      return;
    }
    if (customModelUrlRef.current) URL.revokeObjectURL(customModelUrlRef.current);
    const url = URL.createObjectURL(file);
    customModelUrlRef.current = url;
    const model = {
      id: "custom-r15",
      label: file.name.replace(/\.glb$/i, "").slice(0, 48) || "Custom R15",
      url,
    };
    setCustomPreviewModel(model);
    setPreviewModel(model);
    setError("");
  };

  const handleSendToStudio = async () => {
    if (!animation?.id || !selectedVariant || studioState === "Sending…") return;
    setStudioState("Sending…");
    setError("");
    try {
      const result = await sendAnimationToStudio(animation.id, {
        variantId: selectedVariant.variant.id,
        name: animation.name,
        applyMode: "manual_review",
      });
      setStudioState(result.status === "queued" ? "Queued for review" : "Sent to Studio");
    } catch (requestError) {
      setStudioState("Send to Studio");
      setError(requestError?.message || "Connect the Studio plugin and select an R15 rig first.");
    }
  };

  return (
    <section className="animate-workspace" aria-labelledby="animate-workspace-title">
      <header className="animate-toolbar">
        <div className="animate-toolbar__identity">
          <div className="animate-toolbar__eyebrow">
            <WandSparkles aria-hidden="true" />
            <span>AI ANIMATION</span>
            <i>R15</i>
          </div>
          <label htmlFor="animation-name" className="sr-only">Animation name</label>
          <input
            id="animation-name"
            value={animation?.name || "New R15 animation"}
            readOnly
          />
        </div>
        <div className="animate-toolbar__meta" aria-label="Animation settings">
          <details className="animate-toolbar__options">
            <summary><AnimatedSettingsIcon aria-hidden="true" /> Preview options</summary>
            <div>
              <label className="animate-toolbar__model">
                <span>Preview model</span>
                <select aria-label="Preview model" value={previewModel.id} onChange={selectPreviewModel} disabled={busy}>
                  <option value="blocky-r15">Blocky R15</option>
                  {customPreviewModel ? <option value="custom-r15">{customPreviewModel.label}</option> : null}
                </select>
              </label>
              <button type="button" className="animate-toolbar__import" onClick={() => modelInputRef.current?.click()} disabled={busy}>
                <AnimatedUploadIcon aria-hidden="true" /> Import R15 GLB
              </button>
              <dl><div><dt>Root</dt><dd>In place</dd></div><div><dt>Access</dt><dd>Private</dd></div></dl>
            </div>
          </details>
          <input
            ref={modelInputRef}
            className="sr-only"
            type="file"
            accept=".glb,model/gltf-binary"
            aria-label="Import R15 GLB"
            onChange={importPreviewModel}
          />
          <button type="button" className="animate-toolbar__new-chat" onClick={startNewAnimationChat} disabled={busy}>
            <Plus aria-hidden="true" /> New animation
          </button>
          <button type="button" className="animate-toolbar__save" onClick={saveDraft} disabled={!animation}>
            <Save aria-hidden="true" /> Save
          </button>
          <small role="status">{saveState}</small>
        </div>
      </header>

      <div className="animate-main">
        <aside className="animate-conversation" aria-label="Animation conversation">
          <div className="animate-panel-title">
            <div>
              <span>MOTION DIRECTOR</span>
              <h1 id="animate-workspace-title">Describe, preview, refine</h1>
            </div>
            <InfoHint label="Direct the performance in natural language, then compare three generated takes." side="right" />
          </div>
          <div className="animate-messages" aria-live="polite">
            {messages.map((message) => (
              <article key={message.id} data-role={message.role}>
                {message.role === "assistant" ? <span className="animate-message-avatar"><AnimatedMotionIcon aria-hidden="true" /></span> : null}
                <div>
                  <b>{message.role === "assistant" ? "Nexus Animate" : "You"}</b>
                  <p>{message.content}</p>
                </div>
              </article>
            ))}
            {busy ? (
              <article className="animate-progress" data-role="assistant" role="status">
                <b><AnimatedGenerateIcon active aria-hidden="true" /> Generating</b>
                <p>{GENERATION_STAGES[stageIndex]}…</p>
                <div><i style={{ width: `${((stageIndex + 1) / GENERATION_STAGES.length) * 100}%` }} /></div>
              </article>
            ) : null}
          </div>
          {error ? <div className="animate-error" role="alert">{error}</div> : null}
          <MotionPromptComposer
            hasAnimation={Boolean(animation)}
            busy={busy}
            value={animation ? refinement : prompt}
            onChange={animation ? setRefinement : setPrompt}
            onSubmit={animation ? handleRefine : handleGenerate}
            onStarter={handleGenerate}
            starterPrompts={STARTER_PROMPTS}
            inputRef={promptInputRef}
            onAttachmentRequest={() => modelInputRef.current?.click()}
          />
        </aside>

        <main className="animate-viewport" aria-label="Interactive R15 animation preview">
          <R15Preview animation={selectedVariant} currentTime={currentTime} modelUrl={previewModel.url} modelLabel={previewModel.label} />
          {busy ? <div className="animate-viewport__generating" role="status"><AnimatedMotionIcon active /><span>{GENERATION_STAGES[stageIndex]}</span></div> : null}
          <div className="animate-viewport__badge"><i aria-hidden="true" /> {previewModel.label}</div>
          <div className="animate-viewport__brief">
            <span>{selectedVariant ? selectedVariant.variant.label : "Waiting for a motion brief"}</span>
            <strong>{animation?.plan ? `${animation.plan.style} ${animation.plan.archetype}` : "Stage ready"}</strong>
          </div>
          <div className="animate-viewport__stats" aria-label="Preview settings">
            <span><Clock3 aria-hidden="true" /> 30 FPS</span>
            <span><Layers aria-hidden="true" /> R15 rig</span>
          </div>
        </main>

        <aside className="animate-results" aria-label="Animation variants and checks">
          <div className="animate-panel-title">
            <div><span>RESULTS</span><h2>Variants</h2></div>
            <b>{variants.length || 0}/3</b>
          </div>
          <MotionVariantList
            variants={variants}
            selectedVariantId={selectedVariant?.variant?.id || ""}
            onSelect={setSelectedVariantId}
          />

          <MotionTaskList
            items={motionChecks}
            note={animation ? `${animation.libraryMatches?.length || 0} references · ${selectedVariant?.quality?.keyframeCount || 0} keyframes` : ""}
          />

          <section className="animate-plan-summary">
            <div className="animate-section-heading">
              <h3><Sparkles aria-hidden="true" /> AI motion plan</h3>
              <div className="animate-section-heading__aside">
                <span>{animation?.plan ? "Ready" : "Pending"}</span>
                <InfoHint label="Shows the interpreted action, mood, handedness, and planning route." side="left" />
              </div>
            </div>
            {animation?.plan ? (
              <dl>
                <div><dt>Action</dt><dd>{animation.plan.archetype}</dd></div>
                <div><dt>Mood</dt><dd>{animation.plan.mood}</dd></div>
                <div><dt>Hand</dt><dd>{animation.plan.handedness}</dd></div>
                <div><dt>Mode</dt><dd>{animation.planner?.startsWith("ai:") ? "AI planned" : "Safe fallback"}</dd></div>
              </dl>
            ) : (
              <div className="animate-plan-summary__empty">
                <p>No plan yet</p>
              </div>
            )}
            <p className="animate-plan-summary__routing" role="status">{routingDisclosure(animation?.modelRouting)}</p>
            {animation?.plannerWarning ? <p className="animate-plan-summary__warning">{animation.plannerWarning}</p> : null}
          </section>

          <div className="animate-studio-action">
            <button type="button" className="animate-studio-button" onClick={handleSendToStudio} disabled={!animation || studioState === "Sending…"}>
              <Send aria-hidden="true" /> {studioState}
            </button>
            <InfoHint label="Uses the selected Studio R15 rig. You review the command before it applies." side="left" />
          </div>
        </aside>
      </div>

      <section className="animate-timeline" aria-label="Generated animation timeline">
        <div className="animate-transport">
          <button type="button" onClick={() => { setPlaying(false); setCurrentTime(0); }} aria-label="Return to start"><RotateCcw aria-hidden="true" /></button>
          <button type="button" className="animate-transport__primary" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause animation" : "Play animation"} disabled={!selectedVariant}>
            {playing ? <Square aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
          <output aria-label="Current animation time">{formatTime(currentTime)} <span>/ {formatTime(durationSeconds)}</span></output>
          <span>{selectedVariant?.loop ? "Loop" : "One shot"} · 30 FPS · R15</span>
        </div>
        <div className="animate-timeline__content">
          <div className="animate-phase-list">
            <b><History aria-hidden="true" /> Motion phases</b>
            {(animation?.plan?.phases || []).length
              ? animation.plan.phases.map((phase) => <span key={`${phase.name}-${phase.start}`}>{phase.name}</span>)
              : ["Anticipation", "Action", "Recovery"].map((phase) => <span key={phase} data-placeholder="true">{phase}</span>)}
          </div>
          <div className="animate-tracks">
            <div className="animate-ruler" aria-hidden="true"><span>0</span><span>{formatTime(durationSeconds / 2)}</span><span>{formatTime(durationSeconds)}</span></div>
            <input
              className="animate-scrubber"
              type="range"
              min="0"
              max={durationSeconds}
              step={1 / 30}
              value={Math.min(currentTime, durationSeconds)}
              aria-label="Animation playhead"
              onChange={(event) => { setPlaying(false); setCurrentTime(Number(event.target.value)); }}
              style={{ "--playhead": `${(currentTime / durationSeconds) * 100}%` }}
              disabled={!selectedVariant}
            />
            <div className="animate-phase-track" aria-hidden="true">
              {(animation?.plan?.phases || []).map((phase, index) => (
                <i
                  key={`${phase.name}-${phase.start}`}
                  style={{ left: `${phase.start * 100}%`, width: `${Math.max(0, phase.end - phase.start) * 100}%`, "--phase-index": index }}
                ><span>{phase.name}</span></i>
              ))}
            </div>
            <div className="animate-keyframe-track" aria-hidden="true">
              {(selectedVariant?.keyframes || []).map((keyframe) => <i key={keyframe.timeMs} style={{ left: `${(keyframe.timeMs / selectedVariant.durationMs) * 100}%` }} />)}
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
