import React, { useState, useEffect, Suspense, lazy } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Copy,
  Check,
  Download,
  Share2,
  ArrowLeft,
  Loader,
  Wand2,
  Info,
  ListChecks,
  X,
  FileCode2,
  ArrowRight,
  ShieldCheck,
} from "lib/icons";
import { motion } from "framer-motion";
import { useBilling } from "../context/BillingContext";
import { BACKEND_URL } from "../config";
import { Button, Card } from "../components/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/shadcn/tabs";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../components/shadcn/tooltip";
import { Separator } from "../components/shadcn/separator";

const QuickScriptCodeBlock = lazy(() => import("../components/ai/QuickScriptCodeBlock"));

const API_BASE = `${BACKEND_URL.replace(/\/+$/, "")}/api`;

async function fetchScript(id) {
  const res = await fetch(`${API_BASE}/script/${id}`);
  if (!res.ok) throw new Error("Script not found");
  return await res.json();
}

async function fetchVersions(baseScriptId) {
  const res = await fetch(`${API_BASE}/scripts/${baseScriptId}/versions`);
  if (!res.ok) throw new Error("Failed to fetch versions");
  return await res.json();
}

function improveScript(code) {
  return fetch(`${API_BASE}/improve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script: code }),
  }).then((r) => r.json());
}

function explainScript(code) {
  return fetch(`${API_BASE}/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script: code }),
  }).then((r) => r.json());
}

function lintScript(code) {
  return fetch(`${API_BASE}/lint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script: code }),
  }).then((r) => r.json());
}

function ListSection({ title, items, empty }) {
  const normalized = Array.isArray(items) ? items.filter(Boolean) : [];
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">{title}</h4>
      {normalized.length ? (
        <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-zinc-300">
          {normalized.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-nexus-cyan" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2.5 text-xs text-zinc-600">{empty}</p>
      )}
    </div>
  );
}

export default function ScriptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refresh: refreshBilling } = useBilling();

  const [loading, setLoading] = useState(true);
  const [script, setScript] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [tags, setTags] = useState([]);
  const [allVersions, setAllVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiType, setAiType] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    fetchScript(id)
      .then((res) => {
        setScript(res);
        setTags(res.tags || []);
        setSelectedVersion(res);
        if (res.baseScriptId) {
          fetchVersions(res.baseScriptId)
            .then((versions) => setAllVersions(versions || []))
            .catch(() => {});
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "Failed to load script.");
        setLoading(false);
      });
  }, [id]);

  const handleCopy = () => {
    if (!selectedVersion?.code) return;
    navigator.clipboard.writeText(selectedVersion.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    if (!selectedVersion?.code) return;
    const blob = new Blob([selectedVersion.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(selectedVersion.title || "script").replace(/\s+/g, "_")}.lua`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/script/${id}`;
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1500);
  };

  const handleAI = (type) => {
    setAiLoading(true);
    setAiType(type);
    setAiResult("");
    const fn =
      type === "improve"
        ? improveScript
        : type === "explain"
        ? explainScript
        : lintScript;
    fn(selectedVersion.code)
      .then((res) => {
        setAiResult(res.improved || res.explanation || res.lint || "No result.");
        setAiLoading(false);
        refreshBilling();
      })
      .catch(() => {
        setAiResult("Failed to get result.");
        setAiLoading(false);
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full bg-[#00f5d4]/5 pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] blur-[140px] rounded-full bg-[#9b5de5]/5 pointer-events-none" />
        <div className="flex flex-col items-center gap-4 text-zinc-400">
          <Loader className="h-8 w-8 animate-spin text-[#00f5d4]" />
          <p className="text-sm font-semibold">Loading script...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full bg-[#00f5d4]/5 pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] blur-[140px] rounded-full bg-[#9b5de5]/5 pointer-events-none" />
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-bold text-rose-400">{error}</p>
          <Link
            to="/ai"
            className="text-sm font-semibold text-[#00f5d4] hover:underline"
          >
            ← Back to AI Console
          </Link>
        </div>
      </div>
    );
  }

  const warningsList = [];
  if (Array.isArray(selectedVersion?.limitations)) warningsList.push(...selectedVersion.limitations);
  if (Array.isArray(selectedVersion?.assumptions)) warningsList.push(...selectedVersion.assumptions.map(a => `Assumption: ${a}`));

  return (
    <TooltipProvider>
      <div className="min-h-[100dvh] bg-[#050505] text-white flex flex-col relative overflow-hidden font-sans">
        {/* Background Gradients */}
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full bg-[#00f5d4]/5 pointer-events-none" />
        <div className="fixed bottom-[-15%] right-[-10%] w-[45%] h-[45%] blur-[140px] rounded-full bg-[#9b5de5]/5 pointer-events-none" />

        {/* Script action bar */}
        <div className="z-20 border-b border-white/5 bg-black/30 backdrop-blur-md shrink-0">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate("/ai")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-300 transition hover:border-white/20 hover:text-white"
                aria-label="Back to AI Console"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">AI Console</span>
              </button>
              <div className="h-4 w-px bg-white/10 hidden sm:block animate-pulse" />
              <div className="flex items-center gap-2 min-w-0">
                <FileCode2 className="h-4 w-4 text-[#00f5d4] shrink-0" />
                <span className="font-display text-sm font-black uppercase tracking-[0.18em] text-white truncate max-w-[200px] sm:max-w-none">
                  Quick Script Shared
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleShare}
                    className="inline-flex items-center justify-center h-9 px-3.5 gap-2 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all text-xs font-bold"
                  >
                    {shareCopied ? (
                      <Check className="h-3.5 w-3.5 text-[#00f5d4]" />
                    ) : (
                      <Share2 className="h-3.5 w-3.5" />
                    )}
                    <span>{shareCopied ? "Copied" : "Share"}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Copy share link</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {/* Left Pane: Prompt, Metadata, AI Tools, Versions */}
            <div className="space-y-4">
              {/* Prompt Card */}
              <Card className="p-4 border border-white/10">
                <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Prompt</h3>
                <p className="mt-2 text-sm text-zinc-300 leading-relaxed italic bg-black/20 border border-white/5 rounded-xl px-3 py-2.5">
                  "{selectedVersion?.prompt || script?.prompt || "No prompt description"}"
                </p>
              </Card>

              {/* Version History Card */}
              {allVersions.length > 1 && (
                <Card className="p-4 border border-white/10">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400 mb-2.5">Version History</h3>
                  <div className="flex flex-wrap gap-2">
                    {allVersions.map((ver) => {
                      const isActive =
                        selectedVersion &&
                        (ver._id || ver.id) === (selectedVersion._id || selectedVersion.id);
                      return (
                        <button
                          key={ver._id || ver.id || ver.version}
                          onClick={() => {
                            setSelectedVersion(ver);
                            setTags(ver.tags || []);
                          }}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#00f5d4]/15 border-[#00f5d4]/40 text-[#00f5d4]"
                              : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          v{ver.version}
                        </button>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Details & Instructions Tabs */}
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Details & Tags</TabsTrigger>
                  <TabsTrigger value="instructions">Instructions</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="space-y-3">
                  <Card className="p-4 border border-white/10 space-y-4">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Description</h4>
                      <p className="mt-1 text-sm text-zinc-300 leading-relaxed">
                        {script?.description || "No description provided."}
                      </p>
                    </div>

                    <Separator className="bg-white/5" />

                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500 mb-2">Tags</h4>
                      {tags.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((tag, i) => (
                            <span
                              key={i}
                              className="bg-[#00f5d4]/10 border border-[#00f5d4]/20 text-[#00f5d4] rounded-full px-3 py-0.5 text-xs font-semibold"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-600">No tags added.</p>
                      )}
                    </div>
                  </Card>
                </TabsContent>
                <TabsContent value="instructions" className="grid gap-3 md:grid-cols-2">
                  <ListSection title="Required objects" items={selectedVersion?.requiredObjects} empty="No required objects." />
                  <ListSection title="Setup instructions" items={selectedVersion?.setup} empty="Paste script in layout placement." />
                  <ListSection title="Test instructions" items={selectedVersion?.testing} empty="Verify script in Studio Play mode." />
                  <ListSection title="Warnings" items={warningsList} empty="No warnings." />
                </TabsContent>
              </Tabs>

              {/* AI Tools Card */}
              <Card className="p-4 border border-white/10">
                <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400 mb-3">AI tools</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAI("improve")}
                    disabled={aiLoading}
                    className="flex-col gap-1 py-3 h-auto"
                  >
                    {aiLoading && aiType === "improve" ? (
                      <Loader className="h-4 w-4 animate-spin text-[#9b5de5]" />
                    ) : (
                      <Wand2 className="h-4 w-4 text-[#9b5de5]" />
                    )}
                    <span className="text-[10px] uppercase font-bold tracking-wider">Improve</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAI("explain")}
                    disabled={aiLoading}
                    className="flex-col gap-1 py-3 h-auto"
                  >
                    {aiLoading && aiType === "explain" ? (
                      <Loader className="h-4 w-4 animate-spin text-[#00f5d4]" />
                    ) : (
                      <Info className="h-4 w-4 text-[#00f5d4]" />
                    )}
                    <span className="text-[10px] uppercase font-bold tracking-wider">Explain</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAI("lint")}
                    disabled={aiLoading}
                    className="flex-col gap-1 py-3 h-auto"
                  >
                    {aiLoading && aiType === "lint" ? (
                      <Loader className="h-4 w-4 animate-spin text-[#fbbf24]" />
                    ) : (
                      <ListChecks className="h-4 w-4 text-[#fbbf24]" />
                    )}
                    <span className="text-[10px] uppercase font-bold tracking-wider">Lint</span>
                  </Button>
                </div>
              </Card>

              {/* AI Result Card */}
              {aiResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Card className="p-4 border border-[#00f5d4]/20 bg-[#00f5d4]/5 relative">
                    <button
                      onClick={() => {
                        setAiResult("");
                        setAiType("");
                      }}
                      className="absolute top-3 right-3 text-gray-500 hover:text-white transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#00f5d4] mb-2.5">
                      {aiType} Analysis
                    </h3>
                    <p className="whitespace-pre-line text-sm text-zinc-200 leading-relaxed font-mono bg-black/30 border border-white/5 rounded-xl px-3 py-2.5">
                      {aiResult}
                    </p>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Right Pane: Code Viewer & Actions */}
            <div className="space-y-4 min-w-0">
              {/* Code viewer card */}
              <section className="rounded-xl border border-white/10 bg-[#111116]/95 shadow-panel overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-3 bg-black/20">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold text-white">
                      {selectedVersion?.title || script?.title || "Quick Script"}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-md border border-[#00f5d4]/20 bg-[#00f5d4]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#00f5d4]">
                        {selectedVersion?.scriptType || script?.scriptType || "Script"}
                      </span>
                      <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-gray-300">
                        {selectedVersion?.studioLocation || script?.studioLocation || "ServerScriptService"}
                      </span>
                      <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-gray-300">
                        Luau
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Toolbar */}
                  <div className="flex flex-wrap gap-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={handleCopy}
                          className="inline-flex items-center justify-center h-8 px-2.5 gap-1.5 rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all text-xs font-bold"
                        >
                          {copied ? <Check className="h-3.5 w-3.5 text-[#00f5d4]" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>Copy</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Copy script code</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={handleDownload}
                          className="inline-flex items-center justify-center h-8 px-2.5 gap-1.5 rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all text-xs font-bold"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Export</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Download as .lua file</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Live Code Area */}
                <div
                  className="quick-script-code-scroll max-w-full overflow-x-auto overscroll-x-contain"
                  tabIndex={0}
                  aria-label="Luau code container"
                >
                  <Suspense fallback={
                    <pre className="m-0 min-h-40 bg-black/40 p-4 text-sm text-gray-400">Loading code view...</pre>
                  }>
                    <QuickScriptCodeBlock code={selectedVersion?.code || "-- No code found"} />
                  </Suspense>
                </div>
              </section>

              {/* Agent Build Nudge */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center gap-2.5 text-xs text-gray-400">
                  <ShieldCheck className="h-4 w-4 text-[#00f5d4]" />
                  <span>Agent Build supports complex workspaces and live Studio syncing.</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    iconRight={ArrowRight}
                    onClick={() => navigate("/ai", { state: { initialPrompt: selectedVersion?.code, initialMode: "agent_build" } })}
                    className="h-9 px-4 rounded-lg"
                  >
                    Open as Agent Build
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </TooltipProvider>
  );
}
