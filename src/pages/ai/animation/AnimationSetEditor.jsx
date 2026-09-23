import React, { useEffect, useRef, useState } from "react";
import { Button, FormField, IconButton } from "components/ui";
import NexusSelect from "components/ui/NexusSelect";
import { Check, ChevronRight, Layers, Play, Plus, RotateCcw, Save, Search, Send, Square, Trash2 } from "lib/icons";
import { getAnimation } from "lib/animationApi";
import {
  applyAnimationSetAccessProbe, applyAnimationSetResourceInspection, compileAnimationSet, controlAnimationSetPreview, getAnimationSet, getAnimationSetDeployment,
  getAnimationSetPreviewReceipt, importAnimationResource, inspectAnimationSetResource, listAnimationSets, planAnimationSet,
  probeAnimationSetResourceAccess, saveAnimationSet, searchAnimationResources, sendAnimationSetToStudio, validateAnimationSet,
} from "lib/animationSetApi";
import R15Preview from "./R15Preview";
import "./AnimationSetEditor.css";

const PRIORITIES = ["Core", "Idle", "Movement", "Action", "Action2", "Action3", "Action4"];
const ROLES = ["idle", "walk", "run", "sprint", "jump", "fall", "land", "crouch", "climb", "swim", "equip", "attack", "combo", "hit_reaction", "block", "dodge", "parry", "recoil", "reload", "unequip", "interaction", "pickup", "emote", "creature"];
const BINDING_KINDS = { sound: "sounds", vfx: "vfx", gameplay: "gameplay", camera: "camera" };
const STARTERS = ["An adventurer with idle, walk, run, jump, fall and land", "A sword combat set with equip, two attacks, hit reaction and dodge", "An NPC opening a chest with sound and VFX"];
const EMPTY_BINDINGS = { sounds: [], vfx: [], gameplay: [], camera: [] };
const copy = (value) => JSON.parse(JSON.stringify(value));
const readable = (value) => String(value || "").replace(/_/g, " ");
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const seconds = (ms) => `${(number(ms) / 1000).toFixed(2)}s`;
function nextId(items, prefix) {
  let index = 1;
  const ids = new Set(items.map((item) => item.id));
  while (ids.has(`${prefix}_${index}`)) index += 1;
  return `${prefix}_${index}`;
}

function Field({ label, value, onChange, type = "text", ...props }) {
  return <FormField label={label}>{(field) => <input {...field} {...props} type={type} value={value ?? ""}
    onChange={(event) => onChange(type === "number" ? number(event.target.value) : event.target.value)} />}</FormField>;
}

function Choice({ label, value, onChange, options, ...props }) {
  return <FormField label={label}>{(field) => <NexusSelect {...field} {...props} value={value ?? ""}
    onChange={(event) => onChange(event.target.value)}>
    {options.map((option) => typeof option === "string"
      ? <option key={option} value={option}>{readable(option)}</option>
      : <option key={option.value} value={option.value}>{option.label}</option>)}
  </NexusSelect>}</FormField>;
}

function Remove({ label, onClick }) {
  return <IconButton size="sm" icon={Trash2} label={label} onClick={onClick} />;
}

function Diagnostics({ validation }) {
  if (!validation) return <p className="animation-set__muted">Run validation to inspect resources, markers, transitions and exits.</p>;
  const issues = [...(validation.errors || []).map((issue) => ({ ...issue, severity: "error" })),
    ...(validation.warnings || []).map((issue) => ({ ...issue, severity: "warning" }))];
  return <div className="animation-set__diagnostics" aria-label="Animation set validation">
    <p role="status">{validation.valid ? "Structure valid" : "Changes needed"} · {validation.errors?.length || 0} errors · {validation.warnings?.length || 0} warnings</p>
    {issues.map((issue, index) => <article key={`${issue.code}-${index}`} data-severity={issue.severity}>
      <strong>{issue.message}</strong><small>{issue.path || "set"} · {issue.code}</small>
    </article>)}
    {!issues.length && <p className="animation-set__muted">No issues reported for this validation mode. Studio playback remains a separate check.</p>}
  </div>;
}

export default function AnimationSetEditor({ projectId = "", active = true }) {
  const [sets, setSets] = useState([]);
  const [document, setDocument] = useState(null);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [brief, setBrief] = useState("");
  const [actor, setActor] = useState("player");
  const [rigType, setRigType] = useState("R15");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [status, setStatus] = useState("");
  const [validation, setValidation] = useState(null);
  const [artifact, setArtifact] = useState(null);
  const [deployment, setDeployment] = useState(null);
  const [previewReceipt, setPreviewReceipt] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [accessProbe, setAccessProbe] = useState(null);
  const [studioEvent, setStudioEvent] = useState("");
  const [studioSpeed, setStudioSpeed] = useState(1);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState([]);
  const [searched, setSearched] = useState(false);
  const [timeMs, setTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [previewLoop, setPreviewLoop] = useState(true);
  const [previewResourceId, setPreviewResourceId] = useState("");
  const [loadedPreview, setLoadedPreview] = useState(null);
  const [previewStatus, setPreviewStatus] = useState("");
  const [targetPath, setTargetPath] = useState("");
  const [universeId, setUniverseId] = useState("");
  const [mode, setMode] = useState("preview");
  const mounted = useRef(true);
  const requestSequence = useRef(0);
  const playhead = useRef(0);
  playhead.current = timeMs;

  const states = document?.states || [];
  const resources = document?.resources || [];
  const layers = document?.layers || [];
  const selectedState = states.find((state) => state.id === selectedStateId) || states[0] || null;
  const resource = resources.find((item) => item.id === selectedState?.resourceId) || null;
  const previewResource = resources.find((item) => item.id === previewResourceId) || resource;
  const preview = previewResource?.keyframes?.length ? previewResource : loadedPreview;
  const canPreview = Boolean(preview?.keyframes?.length && (previewResource?.rigType || document?.rig?.type) === "R15");
  const durationMs = Math.max(1, number(previewResource?.durationMs || preview?.durationMs));
  const speed = Math.max(0.1, number(selectedState?.speed || 1));
  const transitions = (document?.transitions || []).filter((transition) => transition.from === selectedState?.id);
  const markers = previewResource?.markers || [];
  const bindings = { ...EMPTY_BINDINGS, ...document?.bindings };

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    listAnimationSets({ projectId }).then((result) => {
      if (!cancelled) setSets(result);
    }).catch((requestError) => { if (!cancelled) setError(requestError.message); });
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!document?.id || !deployment?.id || !["queued", "running"].includes(deployment.status)) return undefined;
    let cancelled = false;
    let timer;
    const poll = async () => {
      try {
        const receipt = await getAnimationSetDeployment(document.id, deployment.id);
        if (cancelled) return;
        if (!receipt) throw new Error("Studio returned no deployment receipt.");
        setDeployment(receipt);
        if (["queued", "running"].includes(receipt.status)) timer = window.setTimeout(poll, 1500);
        else setStatus(receipt.status === "applied"
          ? "Applied in Studio. Rig playback and gameplay still need verification."
          : receipt.status === "awaiting_review" ? "Waiting for review in Studio. Refresh the receipt after approval."
            : `Studio deployment: ${readable(receipt.status)}. Review the receipt.`);
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Could not read the Studio receipt. Refresh to retry.");
          setDeployment((current) => current ? { ...current, status: "receipt_unavailable" } : current);
        }
      }
    };
    timer = window.setTimeout(poll, 1500);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [document?.id, deployment?.id, deployment?.status]);

  useEffect(() => {
    if (!document?.id || !deployment?.id || !previewReceipt?.commandId || previewReceipt.complete || previewReceipt.status === "receipt_unavailable") return undefined;
    let cancelled = false;
    let timer;
    const poll = async () => {
      try {
        const receipt = await getAnimationSetPreviewReceipt(document.id, deployment.id, previewReceipt.commandId);
        if (cancelled) return;
        if (!receipt) throw new Error("Studio returned no preview receipt.");
        setPreviewReceipt(receipt);
        if (!receipt.complete) timer = window.setTimeout(poll, 1500);
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Could not read the Studio preview receipt.");
          setPreviewReceipt((current) => current ? { ...current, status: "receipt_unavailable" } : current);
        }
      }
    };
    timer = window.setTimeout(poll, 1500);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [document?.id, deployment?.id, previewReceipt?.commandId, previewReceipt?.complete, previewReceipt?.status]);

  useEffect(() => {
    let cancelled = false;
    setLoadedPreview(null);
    setPreviewStatus("");
    setPlaying(false);
    setTimeMs(0);
    if (!previewResource || previewResource.keyframes?.length || previewResource.rigType !== "R15") return undefined;
    const source = previewResource.source;
    if (source?.kind !== "generated" || !source.animationId) return undefined;
    setPreviewStatus("Loading authored motion…");
    getAnimation(source.animationId).then((animation) => {
      if (cancelled) return;
      const variant = animation?.variants?.find((item) => item.variant?.id === source.variantId);
      setLoadedPreview(variant || null);
      setPreviewStatus(variant ? "" : "The referenced authored variant is unavailable.");
    }).catch((requestError) => { if (!cancelled) setPreviewStatus(requestError.message); });
    return () => { cancelled = true; };
  }, [previewResource]);

  useEffect(() => { setPreviewResourceId(""); setPlaying(false); setTimeMs(0); }, [selectedStateId]);
  useEffect(() => { if (!active) setPlaying(false); }, [active]);

  useEffect(() => {
    if (!playing || !canPreview) return undefined;
    let frame;
    let previous;
    const tick = (timestamp) => {
      const elapsed = previous === undefined ? 0 : Math.min(timestamp - previous, 100);
      previous = timestamp;
      const next = playhead.current + elapsed * speed;
      const finished = next >= durationMs && !previewLoop;
      playhead.current = finished ? durationMs : next % durationMs;
      setTimeMs(playhead.current);
      if (finished) { setPlaying(false); return; }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playing, canPreview, durationMs, speed, previewLoop]);

  function accept(next, message) {
    if (!next) throw new Error("The server did not return an animation set.");
    setDocument(next);
    setConflict(false);
    setDirty(false);
    setValidation(next.validation || null);
    setArtifact(null);
    setDeployment(null);
    setPreviewReceipt(null);
    setInspection(null);
    setAccessProbe(null);
    setStatus(message || `Saved version ${next.version}`);
    setSets((current) => [next, ...current.filter((item) => item.id !== next.id)]);
    return next;
  }

  function edit(update) {
    setDocument((current) => update(current));
    setDirty(true);
    setValidation(null);
    setArtifact(null);
    setDeployment(null);
    setPreviewReceipt(null);
    setInspection(null);
    setAccessProbe(null);
    setStatus("Unsaved changes");
  }

  function patchState(patch) {
    edit((current) => ({ ...current, states: current.states.map((state) => state.id === selectedState.id ? { ...state, ...patch } : state) }));
  }

  function renameState(id) {
    const previousId = selectedState.id;
    edit((current) => ({ ...current,
      states: current.states.map((state) => state.id === previousId ? { ...state, id } : state),
      layers: current.layers.map((layer) => layer.initialState === previousId ? { ...layer, initialState: id } : layer),
      transitions: current.transitions.map((transition) => ({ ...transition,
        from: transition.from === previousId ? id : transition.from,
        to: transition.to === previousId ? id : transition.to,
      })),
    }));
    setSelectedStateId(id);
  }

  function patchResource(patch) {
    if (!resource) return;
    edit((current) => ({ ...current, resources: current.resources.map((item) => item.id === resource.id ? {
      ...item, ...patch, access: { status: "unknown" }, markerEvidence: { status: "authored", verifiedNames: [] },
    } : item) }));
  }

  function patchTransition(id, patch) {
    edit((current) => ({ ...current, transitions: current.transitions.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

  async function perform(label, task) {
    if (busy) return;
    const sequence = ++requestSequence.current;
    setBusy(label);
    setError("");
    try { await task(); }
    catch (requestError) {
      if (!mounted.current) return;
      const versionConflict = requestError.code === "ANIMATION_VERSION_CONFLICT";
      setConflict(versionConflict);
      setError(versionConflict ? "A newer version exists. Your changes are retained. Export your draft before opening the saved version." : requestError.message || "The request failed.");
      const result = requestError.payload?.validation || requestError.payload?.details?.validation;
      if (result) setValidation(result);
    } finally { if (mounted.current && sequence === requestSequence.current) setBusy(""); }
  }

  async function persist() {
    if (!document) return null;
    if (!dirty && document.id) return document;
    return accept(await saveAnimationSet(document));
  }

  function buildPlan(event, prompt = brief) {
    event?.preventDefault();
    if (prompt.trim().length < 3) return;
    perform("Planning set…", async () => {
      if (dirty) await persist();
      const next = await planAnimationSet({ prompt: prompt.trim(), projectId: projectId || null, actor, rigType });
      accept(next, "Set planned and saved. Resolve its resources before deployment.");
      setSelectedStateId(next.states?.[0]?.id || "");
      setBrief("");
      setMatches([]);
      setSearched(false);
    });
  }

  function openSet(id) {
    if (!id || id === document?.id) return;
    perform("Opening set…", async () => {
      if (dirty) await persist();
      const next = await getAnimationSet(id);
      accept(next);
      setSelectedStateId(next.states?.[0]?.id || "");
      setMatches([]);
      setSearched(false);
    });
  }

  function checkSet() {
    perform("Validating…", async () => {
      const saved = await persist();
      if (!saved) return;
      const result = await validateAnimationSet(saved.id, { mode, ...(universeId.trim() ? { universeId: universeId.trim() } : {}) });
      setValidation(result);
      setStatus(result.valid ? "Validation finished. Review any warnings." : "Validation found issues to resolve.");
    });
  }

  function compileSet() {
    perform("Compiling…", async () => {
      const saved = await persist();
      if (!saved) return;
      const result = await compileAnimationSet(saved.id, { mode, ...(universeId.trim() ? { universeId: universeId.trim() } : {}) });
      setArtifact(result);
      setStatus("Runtime compiled. Studio playback has not been verified.");
    });
  }

  function deploySet() {
    perform("Sending to Studio…", async () => {
      const saved = await persist();
      if (!saved) return;
      const result = await sendAnimationSetToStudio(saved.id, { mode, ...(targetPath.trim() ? { rigPath: targetPath.trim() } : {}), ...(universeId.trim() ? { universeId: universeId.trim() } : {}) });
      setDeployment(result);
      setStatus(result?.status === "queued" ? "Queued in Studio. Application and playback remain unverified." : "Studio request recorded. Review the receipt below.");
    });
  }

  function search(event) {
    event.preventDefault();
    perform("Searching resources…", async () => {
      setMatches(await searchAnimationResources({ q: query, projectId: document?.projectId || projectId, rigType: document?.rig?.type, semanticRole: resource?.semanticRole }));
      setSearched(true);
    });
  }

  function importFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setError("Choose an animation file smaller than 20 MB."); return; }
    perform("Importing animation…", async () => {
      const result = await importAnimationResource(file, { projectId: document?.projectId || projectId,
        semanticRole: resource?.semanticRole || "interaction", rigType: document?.rig?.type || "R15", name: file.name.replace(/\.[^.]+$/, "") });
      if (!result?.resource) throw new Error("The server did not return the imported animation.");
      replaceResource(result.resource);
      setStatus("Animation imported into this resource slot. Publish it from Assets before using a Roblox asset ID.");
    });
  }

  function inspectResource() {
    const resourceId = resource?.id;
    if (!resourceId) return;
    perform("Requesting Studio inspection…", async () => {
      const saved = await persist();
      const result = await inspectAnimationSetResource(saved.id, resourceId);
      setInspection({ ...result, resourceId });
      setStatus("Inspection requested in Studio. Apply the receipt after the command completes.");
    });
  }

  function applyInspection() {
    if (!inspection?.commandId) return;
    perform("Applying inspected markers…", async () => {
      const saved = await persist();
      accept(await applyAnimationSetResourceInspection(saved.id, inspection.resourceId, inspection.commandId, saved.version),
        "Imported marker evidence from the Studio receipt. Experience access still requires its own check.");
    });
  }

  function controlStudio(options) {
    if (!deployment?.id) return;
    perform("Requesting Studio preview control…", async () => {
      setPreviewReceipt(await controlAnimationSetPreview(document.id, deployment.id, options));
      setStatus("Studio preview command queued. Its receipt will show the actual result.");
    });
  }

  function probeAccess() {
    const resourceId = resource?.id;
    if (!resourceId) return;
    perform("Requesting experience access test…", async () => {
      const saved = await persist();
      const result = await probeAnimationSetResourceAccess(saved.id, resourceId, targetPath.trim());
      setAccessProbe({ ...result, resourceId });
      setStatus("Access test requested. Studio must be in Play Server in the target published experience.");
    });
  }

  function applyAccess() {
    if (!accessProbe?.commandId) return;
    perform("Applying experience access evidence…", async () => {
      const saved = await persist();
      accept(await applyAnimationSetAccessProbe(saved.id, accessProbe.resourceId, accessProbe.commandId, saved.version),
        "Applied the Studio access test receipt. This evidence is scoped to its observed experience.");
    });
  }

  function replaceResource(match) {
    const next = copy(match);
    const id = resource?.id || nextId(resources, "resource");
    edit((current) => ({ ...current,
      resources: resource ? current.resources.map((item) => item.id === resource.id ? { ...next, id } : item) : [...current.resources, { ...next, id }],
      states: current.states.map((state) => state.id === selectedState.id ? { ...state, resourceId: id } : state),
    }));
    setPreviewResourceId("");
    setLoadedPreview(null);
    setPlaying(false);
    setTimeMs(0);
    setStatus("Resource replaced. Validate marker requirements and rig compatibility.");
  }

  function addResource() {
    replaceResource({ id: "new", name: "Untitled animation", semanticRole: selectedState?.id || "interaction", scope: "private",
      rigType: document.rig?.type || "R15", durationMs: 1000, loop: false, priority: "Action", markers: [],
      source: { kind: "roblox_asset" }, robloxAssetId: null, assetState: "draft", access: { status: "unknown" }, markerEvidence: { status: "authored", verifiedNames: [] } });
  }

  function addState(layerId) {
    const id = nextId(states, "state");
    edit((current) => ({ ...current, states: [...current.states, { id, layerId, resourceId: null, fadeInMs: 100, fadeOutMs: 100, speed: 1, interruptible: true, windows: [], events: [] }] }));
    setSelectedStateId(id);
  }

  function addLayer() {
    const id = nextId(layers, "layer");
    const stateId = nextId(states, "rest");
    edit((current) => ({ ...current, layers: [...current.layers, { id, initialState: stateId, maxTracks: 2 }],
      states: [...current.states, { id: stateId, layerId: id, resourceId: null, fadeInMs: 100, fadeOutMs: 100, speed: 1, interruptible: true, windows: [], events: [] }] }));
    setSelectedStateId(stateId);
  }

  function exportDraft() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(document, null, 2)], { type: "application/json" }));
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${String(document?.name || "animation-set").replace(/[^a-z0-9_-]/gi, "-")}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function changeMarker(index, patch) {
    patchResource({ markers: (resource.markers || []).map((marker, position) => position === index ? { ...marker, ...patch } : marker) });
  }

  return <section className="animation-set" aria-label="Animation set editor">
    <header className="animation-set__toolbar">
      <div><span className="animation-set__eyebrow">ANIMATION SYSTEMS</span><h1>{document?.name || "Build a coherent animation set"}</h1></div>
      <div className="animation-set__actions">
        <Button size="sm" variant="secondary" icon={Save} disabled={!document || !!busy || !dirty} onClick={() => perform("Saving…", persist)}>Save set</Button>
        <Button size="sm" variant="secondary" icon={Check} disabled={!document || !!busy} onClick={checkSet}>Validate</Button>
        <Button size="sm" disabled={!document || !!busy} onClick={compileSet}>Compile runtime</Button>
      </div>
    </header>
    <div className="animation-set__status" role="status">{busy || status || "Plan states, connect resources, then test the result in Studio."}</div>
    {error && <div className="animation-set__error" role="alert">{error}{conflict && <div className="animation-set__actions">
      <Button size="sm" variant="secondary" onClick={exportDraft}>Export draft</Button>
      <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => perform("Reloading…", async () => accept(await getAnimationSet(document.id)))}>Discard edits and reload</Button>
    </div>}</div>}
    <fieldset className="animation-set__body" disabled={!!busy}>
      <legend className="sr-only">Animation set editing controls</legend>
      <aside className="animation-set__sidebar" aria-label="Animation set hierarchy">
        <Choice label="Saved sets" value={document?.id || ""} onChange={openSet}
          options={[{ value: "", label: "Choose a saved set" }, ...sets.map((item) => ({ value: item.id, label: item.name }))]} />
        <details className="animation-set__planner" open={!document || undefined}>
          <summary><Plus size={14} aria-hidden="true" /> Plan a new set</summary>
          <form onSubmit={buildPlan}>
            <FormField label="Animation set brief">{(field) => <textarea {...field} rows={4} value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Character, movement, actions and style…" maxLength={3000} />}</FormField>
            <div className="animation-set__pair"><Choice label="Actor" value={actor} onChange={setActor} options={["player", "npc", "custom"]} />
              <Choice label="Rig" value={rigType} onChange={setRigType} options={["R15", "R6", "custom"]} /></div>
            <Button type="submit" size="sm" disabled={brief.trim().length < 3}>Plan set</Button>
            {!document && <div className="animation-set__starters">{STARTERS.map((starter) => <button key={starter} type="button" onClick={(event) => buildPlan(event, starter)}>{starter}<ChevronRight size={14} aria-hidden="true" /></button>)}</div>}
          </form>
        </details>
        {document && <>
          <div className="animation-set__section-heading"><h2>States & layers</h2><IconButton size="sm" icon={Plus} label="Add layer" onClick={addLayer} disabled={layers.length >= 8} /></div>
          {layers.map((layer) => <section key={layer.id} className="animation-set__layer" aria-label={`${layer.id} layer`}>
            <div className="animation-set__section-heading"><h3><Layers size={13} aria-hidden="true" />{readable(layer.id)}</h3><IconButton size="sm" icon={Plus} label={`Add state to ${layer.id}`} onClick={() => addState(layer.id)} disabled={states.length >= 128} /></div>
            {states.filter((state) => state.layerId === layer.id).map((state) => <button type="button" key={state.id} className="animation-set__state" aria-pressed={selectedState?.id === state.id} onClick={() => setSelectedStateId(state.id)}>
              <span>{readable(state.id)}{layer.initialState === state.id && <small>entry</small>}</span><small>{resources.find((item) => item.id === state.resourceId)?.name || "Rest state"}</small>
            </button>)}
          </section>)}
          <details className="animation-set__settings"><summary>Set settings</summary>
            <Field label="Set name" value={document.name} onChange={(name) => edit((current) => ({ ...current, name }))} maxLength={120} />
            <Choice label="Set actor" value={document.actor} onChange={(value) => edit((current) => ({ ...current, actor: value }))} options={["player", "npc", "custom"]} />
            <Choice label="Set rig" value={document.rig?.type} onChange={(value) => edit((current) => ({ ...current, rig: { ...current.rig, type: value } }))} options={["R15", "R6", "custom"]} />
            <p className="animation-set__muted">{document.runtimeBackend === "graph" ? "Native graph plan. Compilation requires a supported backend." : "Animator tracks · human-editable runtime"}</p>
            <Button size="sm" variant="secondary" onClick={exportDraft}>Export set JSON</Button>
          </details>
        </>}
      </aside>
      <main className="animation-set__stage">
        <div className="animation-set__preview-heading"><div><h2>{selectedState ? readable(selectedState.id) : "Motion in context"}</h2><p>{previewResource?.name || "Select a state to inspect its motion and timing."}</p></div>
          {resources.length > 1 && <Choice label="Compare resource" value={previewResourceId} onChange={setPreviewResourceId} options={[{ value: "", label: "State resource" }, ...resources.map((item) => ({ value: item.id, label: item.name }))]} />}</div>
        <div className="animation-set__viewport">
          {canPreview ? <><R15Preview animation={preview} currentTime={Math.min(timeMs, durationMs) / 1000} /><span className="animation-set__preview-label">Authored R15 approximation</span></>
            : <div className="animation-set__preview-empty"><Layers size={30} aria-hidden="true" /><strong>{previewStatus || (resource ? "Preview this resource in Studio" : "Choose an animation resource")}</strong><p>{resource ? "Browser motion preview requires authored R15 keyframes. An asset ID alone cannot show its actual motion here." : "A rest state intentionally has no animation. Add or select a resource for an animated state."}</p></div>}
        </div>
        <section className="animation-set__timeline" aria-label="Semantic animation timeline">
          <div className="animation-set__transport"><IconButton icon={RotateCcw} label="Reset set preview" size="sm" onClick={() => { setPlaying(false); setTimeMs(0); }} />
            <IconButton icon={playing ? Square : Play} label={playing ? "Pause set preview" : "Play set preview"} size="sm" disabled={!canPreview} onClick={() => { if (timeMs >= durationMs) setTimeMs(0); setPlaying((value) => !value); }} />
            <output>{seconds(timeMs)} / {seconds(durationMs)} <small>source time · {speed}×</small></output>
            <label className="animation-set__checkbox"><input type="checkbox" checked={previewLoop} onChange={(event) => setPreviewLoop(event.target.checked)} /> Loop preview</label>
          </div>
          <input type="range" min="0" max={durationMs} step="1" value={Math.min(timeMs, durationMs)} aria-label="Set animation playhead" disabled={!previewResource} onChange={(event) => { setPlaying(false); setTimeMs(number(event.target.value)); }} />
          <div className="animation-set__marker-track" aria-label="Marker positions">{markers.map((marker, index) => <button type="button" key={`${marker.name}-${index}`} style={{ left: `${Math.min(98, Math.max(0, number(marker.timeMs) / durationMs * 100))}%` }} title={`${marker.name} · ${seconds(marker.timeMs)}`} aria-label={`Seek ${marker.name} at ${marker.timeMs} milliseconds`} onClick={() => { setPlaying(false); setTimeMs(number(marker.timeMs)); }}><i /><span>{marker.name}</span></button>)}</div>
          <div className="animation-set__window-track">{!previewResourceId && (selectedState?.windows || []).map((window) => {
            const start = markers.find((marker) => marker.name === window.startMarker)?.timeMs;
            const end = markers.find((marker) => marker.name === window.endMarker)?.timeMs;
            if (start === undefined || end === undefined || end <= start) return null;
            return <span key={window.id} style={{ left: `${start / durationMs * 100}%`, width: `${Math.min(100, (end - start) / durationMs * 100)}%` }} data-active={timeMs >= start && timeMs < end}>{window.kind}</span>;
          })}</div>
          <p className="animation-set__muted">Clip timing preview only. Blends, event delivery and gameplay are verified in Studio.</p>
        </section>
        <div className="animation-set__evidence"><details open><summary>Validation & readiness</summary><Diagnostics validation={validation} /></details>
          {artifact && <details><summary>Compiled runtime</summary><p className="animation-set__muted">Review the generated data and runtime. Compilation is not playback proof.</p><pre>{JSON.stringify(artifact, null, 2)}</pre></details>}
          {deployment && <details open><summary>Studio receipt · {readable(deployment.status)}</summary>
            {deployment.previewAttached && <div className="animation-set__studio-controls">
              <p className="animation-set__readiness">Studio preview attached<small>{deployment.previewExpiresAt ? `Temporary preview expires ${new Date(deployment.previewExpiresAt).toLocaleTimeString()}.` : "Temporary preview session."} Inspect to check its current state.</small></p>
              <div className="animation-set__actions"><Button size="sm" variant="secondary" onClick={() => controlStudio({ action: "inspect" })}>Inspect Studio preview</Button>
                <Button size="sm" variant="secondary" onClick={() => controlStudio({ action: "restart" })}>Restart Studio preview</Button>
                <Button size="sm" variant="secondary" onClick={() => controlStudio({ operation: "state", stateId: selectedState.id })}>Play selected state in Studio</Button>
                <Button size="sm" variant="secondary" onClick={() => controlStudio({ operation: "pause" })}>Pause Studio preview</Button>
                <Button size="sm" variant="secondary" onClick={() => controlStudio({ operation: "resume" })}>Resume Studio preview</Button>
                <Button size="sm" variant="secondary" onClick={() => controlStudio({ action: "stop" })}>Stop Studio preview</Button></div>
              <div className="animation-set__pair"><div><Field label="Studio preview event" value={studioEvent} onChange={setStudioEvent} placeholder="attack / move / cancel" /><Button size="sm" variant="secondary" disabled={!studioEvent.trim()} onClick={() => controlStudio({ operation: "request", event: studioEvent.trim() })}>Send preview event</Button></div>
                <div><Field label="Studio preview speed" value={studioSpeed} onChange={setStudioSpeed} type="number" min="0.1" max="4" step="0.1" /><Button size="sm" variant="secondary" onClick={() => controlStudio({ operation: "speed", layerId: selectedState.layerId, speed: studioSpeed })}>Apply preview speed</Button></div></div>
              {previewReceipt && <div role="status" className="animation-set__muted">Preview command: {readable(previewReceipt.status)}{previewReceipt.complete ? " · receipt received" : " · waiting for receipt"}</div>}
              {previewReceipt?.result && <details><summary>Live preview receipt</summary><pre>{JSON.stringify(previewReceipt.result, null, 2)}</pre></details>}
            </div>}
            <p className="animation-set__muted">{deployment.verified ? "The receipt includes verification evidence. Review its exact scope below." : "No verified gameplay result yet. Applying scripts and resources is separate from testing the rig."}</p>
            {deployment.id && <Button size="sm" variant="secondary" onClick={() => perform("Refreshing Studio receipt…", async () => setDeployment(await getAnimationSetDeployment(document.id, deployment.id)))}>Refresh Studio receipt</Button>}
            <details><summary>Receipt details</summary><pre>{JSON.stringify(deployment, null, 2)}</pre></details>
          </details>}
        </div>
      </main>
      <aside className="animation-set__inspector" aria-label="Animation state properties">
        {!selectedState ? <div className="animation-set__empty"><h2>Plan your animation system</h2><p>Start with a gameplay brief. The set brings resources, transitions and semantic events together.</p></div> : <>
          <section><div className="animation-set__section-heading"><h2>State properties</h2><span>{selectedState.id}</span></div>
            <Field label="State ID" value={selectedState.id} onChange={renameState} maxLength={120} />
            <Choice label="Animation resource" value={selectedState.resourceId || ""} onChange={(resourceId) => patchState({ resourceId: resourceId || null })} options={[{ value: "", label: "No animation (rest)" }, ...resources.map((item) => ({ value: item.id, label: item.name }))]} />
            {!resource && <Button size="sm" variant="secondary" icon={Plus} onClick={addResource}>Add animation resource</Button>}
            <div className="animation-set__pair"><Field label="Playback speed" type="number" value={selectedState.speed ?? 1} onChange={(value) => patchState({ speed: value })} min="0.1" max="4" step="0.1" />
              <Field label="Timeout (ms)" type="number" value={selectedState.maxDurationMs} onChange={(value) => patchState({ maxDurationMs: value || null })} min="0" max="120000" /></div>
            <div className="animation-set__pair"><Field label="Fade in (ms)" type="number" value={selectedState.fadeInMs ?? 100} onChange={(value) => patchState({ fadeInMs: value })} min="0" max="5000" />
              <Field label="Fade out (ms)" type="number" value={selectedState.fadeOutMs ?? 100} onChange={(value) => patchState({ fadeOutMs: value })} min="0" max="5000" /></div>
            <label className="animation-set__checkbox"><input type="checkbox" checked={selectedState.interruptible !== false} onChange={(event) => patchState({ interruptible: event.target.checked })} /> Allow ordinary interruption</label>
            <Button size="sm" variant="ghost" onClick={() => edit((current) => ({ ...current, layers: current.layers.map((layer) => layer.id === selectedState.layerId ? { ...layer, initialState: selectedState.id } : layer) }))}>Use as layer entry</Button>
          </section>
          <details open><summary>Resource & reuse</summary>
            {resource && <><Field label="Resource name" value={resource.name} onChange={(name) => patchResource({ name })} maxLength={120} />
              <div className="animation-set__pair"><Choice label="Semantic role" value={resource.semanticRole} options={[...new Set([...ROLES, resource.semanticRole].filter(Boolean))]} onChange={(semanticRole) => patchResource({ semanticRole })} />
                <Choice label="Pose priority" value={resource.priority || "Action"} options={PRIORITIES} onChange={(priority) => patchResource({ priority })} /></div>
              <Field label="Roblox animation asset ID" value={resource.robloxAssetId} onChange={(robloxAssetId) => patchResource({ robloxAssetId: robloxAssetId || null, assetState: robloxAssetId ? "permission_required" : "draft" })} placeholder="Published asset ID" />
              <Field label="Duration (ms)" type="number" value={resource.durationMs} onChange={(durationMs) => patchResource({ durationMs })} min="1" max="120000" />
              <div className="animation-set__pair"><Field label="Motion style" value={resource.style} onChange={(style) => patchResource({ style })} maxLength={120} />
                <Field label="Weapon" value={resource.weapon} onChange={(weapon) => patchResource({ weapon })} maxLength={120} /></div>
              <Field label="Required joints or bones" value={(resource.requiredJoints || []).join(", ")} onChange={(value) => patchResource({ requiredJoints: value.split(",").map((joint) => joint.trim()).filter(Boolean) })} placeholder="UpperTorso, RightUpperArm" />
              <label className="animation-set__checkbox"><input type="checkbox" checked={!!resource.loop} onChange={(event) => patchResource({ loop: event.target.checked })} /> Loop animation</label>
              <p className="animation-set__readiness">{readable(resource.assetState || "draft")} · access {readable(resource.access?.status || "unknown")}<small>Markers: {readable(resource.markerEvidence?.status || "unverified")} · {resource.rigType || "unknown rig"} · {resource.scope || "private"}</small></p>
              {resource.robloxAssetId && <Button size="sm" variant="secondary" onClick={inspectResource}>Inspect published markers in Studio</Button>}
              {inspection?.resourceId === resource.id && <div><p className="animation-set__muted">Inspection {readable(inspection.status)}. A completed Studio receipt is required.</p><Button size="sm" variant="secondary" onClick={applyInspection}>Apply inspection receipt</Button></div>}
              {resource.robloxAssetId && <><Button size="sm" variant="secondary" disabled={!targetPath.trim()} onClick={probeAccess}>Test experience access in Studio</Button><p className="animation-set__muted">Use a target rig path below, then run Studio in Play Server in the published experience.</p></>}
              {accessProbe?.resourceId === resource.id && <div><p className="animation-set__muted">Access test {readable(accessProbe.status)}. Only a completed Studio receipt grants evidence.</p><Button size="sm" variant="secondary" onClick={applyAccess}>Apply access test receipt</Button></div>}
            </>}
            <FormField label="Import animation file">{(field) => <input {...field} className="animation-set__file" type="file" accept=".rbxm,.rbxmx" disabled={!document.projectId && !projectId} onChange={importFile} />}</FormField>
            <p className="animation-set__muted">Studio-exported .rbxm or .rbxmx · up to 20 MB. Imports replace this slot and preserve its state timing contract.{!document.projectId && !projectId ? " Choose a project to import files." : ""}</p>
            <form className="animation-set__search" onSubmit={search}><Field label="Search reusable animations" value={query} onChange={setQuery} placeholder="Style, weapon or motion" />
              <Button type="submit" size="sm" variant="secondary" icon={Search}>Search resources</Button></form>
            {searched && !matches.length && <p className="animation-set__muted">No compatible resources found. Import an asset ID or create a clip in Clip studio.</p>}
            {matches.map((match) => <button type="button" key={match.id} className="animation-set__match" onClick={() => replaceResource(match)}>
              <strong>Use {match.name}</strong><small>{readable(match.semanticRole)} · {match.rigType} · {match.scope} · {readable(match.assetState)}</small></button>)}
          </details>
          {resource && <details><summary>Markers <span>{resource.markers?.length || 0}</span></summary>
            <p className="animation-set__muted">These are authored requirements until inspected in Studio. Changing a label here does not update a published asset.</p>
            {(resource.markers || []).map((marker, index) => <div className="animation-set__edit-row" key={index}>
              <div className="animation-set__pair"><Field label={`Marker ${index + 1} name`} value={marker.name} onChange={(name) => changeMarker(index, { name })} />
                <Field label={`Marker ${index + 1} time (ms)`} type="number" value={marker.timeMs} onChange={(timeMs) => changeMarker(index, { timeMs })} min="0" max={resource.durationMs || 120000} /></div>
              <div className="animation-set__row"><Field label={`Marker ${index + 1} value`} value={marker.value} onChange={(value) => changeMarker(index, { value })} /><Remove label={`Remove marker ${index + 1}`} onClick={() => patchResource({ markers: resource.markers.filter((_, position) => index !== position) })} /></div>
            </div>)}
            <Button size="sm" variant="secondary" icon={Plus} disabled={(resource.markers?.length || 0) >= 128} onClick={() => patchResource({ markers: [...(resource.markers || []), { name: "Event", timeMs: Math.round(timeMs), value: "" }] })}>Add marker at playhead</Button>
          </details>}
          <details><summary>Gameplay windows <span>{selectedState.windows?.length || 0}</span></summary>
            {(selectedState.windows || []).map((window, index) => <div className="animation-set__edit-row" key={window.id}>
              <div className="animation-set__row"><Choice label={`Window ${index + 1} kind`} value={window.kind} options={["hit", "combo", "cancel", "invulnerable"]} onChange={(kind) => patchState({ windows: selectedState.windows.map((item, position) => position === index ? { ...item, kind } : item) })} /><Remove label={`Remove window ${index + 1}`} onClick={() => patchState({ windows: selectedState.windows.filter((_, position) => position !== index) })} /></div>
              <div className="animation-set__pair">{["startMarker", "endMarker"].map((key) => <Choice key={key} label={`Window ${index + 1} ${key === "startMarker" ? "start" : "end"}`} value={window[key]} options={[{ value: "", label: "Choose marker" }, ...[...new Set([...(resource?.markers || []).map((marker) => marker.name), window[key]].filter(Boolean))]]} onChange={(value) => patchState({ windows: selectedState.windows.map((item, position) => position === index ? { ...item, [key]: value } : item) })} />)}</div>
            </div>)}
            <Button size="sm" variant="secondary" icon={Plus} disabled={!resource || (selectedState.windows?.length || 0) >= 32} onClick={() => patchState({ windows: [...(selectedState.windows || []), { id: nextId(selectedState.windows || [], "window"), kind: "hit", startMarker: "", endMarker: "" }] })}>Add window</Button>
          </details>
          <details><summary>Sound, VFX & gameplay <span>{selectedState.events?.length || 0}</span></summary>
            {(selectedState.events || []).map((event, index) => <div className="animation-set__edit-row" key={index}>
              <Choice label={`Event ${index + 1} marker`} value={event.marker} options={[{ value: "", label: "Choose marker" }, ...[...new Set([...(resource?.markers || []).map((marker) => marker.name), event.marker].filter(Boolean))]]} onChange={(marker) => patchState({ events: selectedState.events.map((item, position) => position === index ? { ...item, marker } : item) })} />
              <div className="animation-set__pair"><Choice label={`Event ${index + 1} kind`} value={event.kind} options={Object.keys(BINDING_KINDS)} onChange={(kind) => patchState({ events: selectedState.events.map((item, position) => position === index ? { ...item, kind, resourceId: "" } : item) })} />
                <Choice label={`Event ${index + 1} binding`} value={event.resourceId} options={[{ value: "", label: "Choose binding" }, ...(bindings[BINDING_KINDS[event.kind]] || []).map((item) => item.id), ...(event.resourceId && !(bindings[BINDING_KINDS[event.kind]] || []).some((item) => item.id === event.resourceId) ? [{ value: event.resourceId, label: `${event.resourceId} (missing)` }] : [])]} onChange={(resourceId) => patchState({ events: selectedState.events.map((item, position) => position === index ? { ...item, resourceId } : item) })} /></div>
              <Remove label={`Remove event ${index + 1}`} onClick={() => patchState({ events: selectedState.events.filter((_, position) => position !== index) })} />
            </div>)}
            <Button size="sm" variant="secondary" icon={Plus} disabled={!resource || (selectedState.events?.length || 0) >= 64} onClick={() => patchState({ events: [...(selectedState.events || []), { marker: "", kind: "sound", resourceId: "" }] })}>Add synchronized event</Button>
          </details>
          <details open><summary>Transitions <span>{transitions.length}</span></summary>
            {transitions.map((transition, index) => <div className="animation-set__edit-row" key={transition.id}>
              <div className="animation-set__row"><Choice label={`Transition ${index + 1} destination`} value={transition.to} options={states.filter((state) => state.layerId === selectedState.layerId).map((state) => ({ value: state.id, label: readable(state.id) }))} onChange={(to) => patchTransition(transition.id, { to })} /><Remove label={`Remove transition ${index + 1}`} onClick={() => edit((current) => ({ ...current, transitions: current.transitions.filter((item) => item.id !== transition.id) }))} /></div>
              <Choice label={`Transition ${index + 1} trigger`} value={transition.trigger} options={["event", "marker", "ended"]} onChange={(trigger) => patchTransition(transition.id, { trigger, event: undefined, marker: undefined })} />
              {transition.trigger !== "ended" && <Field label={`Transition ${index + 1} ${transition.trigger}`} value={transition[transition.trigger]} onChange={(value) => patchTransition(transition.id, { [transition.trigger]: value })} placeholder={transition.trigger === "event" ? "attack / move / cancel" : "ComboOpen"} />}
              <div className="animation-set__pair"><Field label={`Transition ${index + 1} blend (ms)`} type="number" value={transition.blendMs ?? 100} onChange={(blendMs) => patchTransition(transition.id, { blendMs })} min="0" max="5000" />
                <Field label={`Transition ${index + 1} order`} type="number" value={transition.priority ?? 0} onChange={(priority) => patchTransition(transition.id, { priority })} /></div>
              {transition.trigger === "event" && <><Choice label={`Transition ${index + 1} required window`} value={transition.windowId || ""} options={[{ value: "", label: "No timing window" }, ...(selectedState.windows || []).map((window) => ({ value: window.id, label: `${readable(window.id)} · ${window.kind}` })), ...(transition.windowId && !(selectedState.windows || []).some((window) => window.id === transition.windowId) ? [{ value: transition.windowId, label: `${transition.windowId} (missing)` }] : [])]} onChange={(windowId) => patchTransition(transition.id, { windowId: windowId || null })} />
                <Field label={`Transition ${index + 1} input buffer (ms)`} type="number" value={transition.bufferMs ?? 250} onChange={(bufferMs) => patchTransition(transition.id, { bufferMs })} min="0" max="1000" /></>}
            </div>)}
            <Button size="sm" variant="secondary" icon={Plus} disabled={(document.transitions?.length || 0) >= 512} onClick={() => edit((current) => ({ ...current, transitions: [...current.transitions, { id: nextId(current.transitions, "transition"), from: selectedState.id, to: layers.find((layer) => layer.id === selectedState.layerId)?.initialState || selectedState.id, trigger: "ended", priority: 0, blendMs: 100 }] }))}>Add transition</Button>
          </details>
          <details><summary>Set bindings</summary><p className="animation-set__muted">Sound and VFX point to inspected Studio objects or published resources. Gameplay and camera bindings name callbacks supplied by the game.</p>
            {Object.entries(BINDING_KINDS).map(([kind, category]) => <div key={category} className="animation-set__bindings"><h3>{readable(category)}</h3>
              {(bindings[category] || []).map((binding, index) => <div className="animation-set__edit-row" key={`${category}-${index}`}>
                <div className="animation-set__row"><Field label={`${kind} binding ${index + 1} ID`} value={binding.id} onChange={(id) => edit((current) => ({ ...current, bindings: { ...bindings, [category]: bindings[category].map((item, position) => position === index ? { ...item, id } : item) } }))} /><Remove label={`Remove ${kind} binding ${index + 1}`} onClick={() => edit((current) => ({ ...current, bindings: { ...bindings, [category]: bindings[category].filter((_, position) => position !== index) } }))} /></div>
                {["sound", "vfx"].includes(kind) && <Field label={`${kind} binding ${index + 1} Studio path`} value={binding.studioPath} onChange={(studioPath) => edit((current) => ({ ...current, bindings: { ...bindings, [category]: bindings[category].map((item, position) => position === index ? { ...item, studioPath } : item) } }))} placeholder="Workspace.Effects.Impact" />}
                {kind === "sound" && <Field label={`sound binding ${index + 1} asset ID`} value={binding.robloxAssetId} onChange={(robloxAssetId) => edit((current) => ({ ...current, bindings: { ...bindings, [category]: bindings[category].map((item, position) => position === index ? { ...item, robloxAssetId } : item) } }))} />}
              </div>)}
              <Button size="sm" variant="ghost" icon={Plus} disabled={bindings[category].length >= 128} onClick={() => edit((current) => ({ ...current, bindings: { ...bindings, [category]: [...bindings[category], { id: nextId(bindings[category], kind) }] } }))}>Add {kind} binding</Button>
            </div>)}
          </details>
          <section className="animation-set__deploy"><h2>Test in Studio</h2>
            <Choice label="Studio deployment mode" value={mode} onChange={setMode} options={[{ value: "preview", label: "Studio preview" }, { value: "production", label: "Published resources" }]} />
            <Field label="Target rig path" value={targetPath} onChange={setTargetPath} placeholder="Use the selected Studio rig" />
            {mode === "production" && <Field label="Target universe ID" value={universeId} onChange={setUniverseId} inputMode="numeric" placeholder="Published experience universe ID" />}
            <p className="animation-set__muted">{mode === "preview" ? "Local sequences can be previewed before publication. This does not certify a playable published asset." : "Requires resolved assets, permission evidence and verified markers."}</p>
            <Button size="sm" icon={Send} onClick={deploySet}>{mode === "preview" ? "Send Studio preview" : "Deploy published set"}</Button>
          </section>
        </>}
      </aside>
    </fieldset>
  </section>;
}
