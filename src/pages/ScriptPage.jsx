import React, { useState, useEffect, Suspense, lazy } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Copy,
  Check,
  Download,
  Share2,
  ArrowLeft,
  Loader,
  SlidersHorizontal,
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
import { editorialDisplayClass } from "../components/site/editorialUi";

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
    <div className="rounded-[12px] bg-[var(--ds-fill-subtle)] p-4">
      <h4 className="text-[10px] font-semibold text-[var(--ds-text-muted)]">{title}</h4>
      {normalized.length ? (
        <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-[var(--ds-text-secondary)]">
          {normalized.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--ds-accent)]" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2.5 text-xs text-[var(--ds-text-muted)]">{empty}</p>
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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--ds-bg-canvas)]">
        <div className="flex flex-col items-center gap-4 text-[var(--ds-text-muted)]">
          <Loader className="h-8 w-8 animate-spin text-[var(--ds-accent)]" />
          <p className="text-sm font-semibold">Loading script...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--ds-bg-canvas)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-[var(--ds-danger)]">{error}</p>
          <Link
            to="/ai"
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-[var(--ds-accent)] hover:bg-[var(--ds-fill-hover)] hover:underline"
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
      <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[var(--ds-bg-canvas)] text-[var(--ds-text)]">
        {/* Script action bar */}
        <div className="z-20 shrink-0 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-bg-canvas)]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:px-14">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate("/ai")}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--ds-border)] bg-transparent px-4 py-2 text-[10px] font-semibold text-[var(--ds-text-secondary)] transition-colors hover:border-[var(--ds-border-strong)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
                aria-label="Back to AI Console"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">AI Console</span>
              </button>
              <div className="hidden h-4 w-px bg-[var(--ds-border)] sm:block" />
              <div className="flex items-center gap-2 min-w-0">
                <FileCode2 className="h-4 w-4 shrink-0 text-[var(--ds-accent)]" />
                <span className="max-w-[200px] truncate text-sm font-semibold text-[var(--ds-text)] sm:max-w-none">
                  Quick Shared
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleShare}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--ds-border)] bg-transparent px-4 text-xs font-semibold text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
                  >
                    {shareCopied ? (
                      <Check className="h-3.5 w-3.5 text-[var(--ds-success)]" />
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
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-10 sm:px-8 lg:px-14 lg:py-14">
          <motion.div
            className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-12"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {/* Left Pane: Prompt, Metadata, AI Tools, Versions */}
            <div className="space-y-6">
              {/* Prompt Card */}
              <Card className="rounded-[14px] border-0 bg-[var(--ds-surface-1)] p-6 shadow-none">
                <h3 className="text-[11px] font-semibold text-[var(--ds-text-muted)]">Prompt</h3>
                <p className="mt-3 rounded-[12px] bg-[var(--ds-fill-subtle)] px-4 py-3 text-sm italic leading-relaxed text-[var(--ds-text-secondary)]">
                  "{selectedVersion?.prompt || script?.prompt || "No prompt description"}"
                </p>
              </Card>

              {/* Version History Card */}
              {allVersions.length > 1 && (
                <Card className="rounded-[14px] border-0 bg-[var(--ds-surface-1)] p-6 shadow-none">
                  <h3 className="mb-2.5 text-[11px] font-semibold text-[var(--ds-text-muted)]">Version History</h3>
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
                          className={`min-h-11 cursor-pointer rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                            isActive
                              ? "border-[var(--ds-accent-border)] bg-[var(--ds-fill-selected)] text-[var(--ds-accent)]"
                              : "border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
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
                  <Card className="space-y-5 rounded-[14px] border-0 bg-[var(--ds-surface-1)] p-6 shadow-none">
                    <div>
                      <h4 className="text-[10px] font-semibold text-[var(--ds-text-muted)]">Description</h4>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--ds-text-secondary)]">
                        {script?.description || "No description provided."}
                      </p>
                    </div>

                    <Separator className="bg-[var(--ds-border-subtle)]" />

                    <div>
                      <h4 className="mb-2 text-[10px] font-semibold text-[var(--ds-text-muted)]">Tags</h4>
                      {tags.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((tag, i) => (
                            <span
                              key={i}
                              className="rounded-full border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] px-3 py-0.5 text-xs font-semibold text-[var(--ds-accent)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--ds-text-muted)]">No tags added.</p>
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
              <Card className="rounded-[14px] border-0 bg-[var(--ds-surface-1)] p-6 shadow-none">
                <h3 className="mb-3 text-[11px] font-semibold text-[var(--ds-text-muted)]">AI tools</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAI("improve")}
                    disabled={aiLoading}
                    className="flex-col gap-1 py-3 h-auto"
                  >
                    {aiLoading && aiType === "improve" ? (
                      <Loader className="h-4 w-4 animate-spin text-[var(--ds-plan)]" />
                    ) : (
                      <SlidersHorizontal className="h-4 w-4 text-[var(--ds-plan)]" />
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
                      <Loader className="h-4 w-4 animate-spin text-[var(--ds-info)]" />
                    ) : (
                      <Info className="h-4 w-4 text-[var(--ds-info)]" />
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
                      <Loader className="h-4 w-4 animate-spin text-[var(--ds-warning)]" />
                    ) : (
                      <ListChecks className="h-4 w-4 text-[var(--ds-warning)]" />
                    )}
                    <span className="text-[10px] uppercase font-bold tracking-wider">Lint</span>
                  </Button>
                </div>
              </Card>

              {/* AI Result Card */}
              {aiResult && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Card className="relative border border-[color-mix(in_srgb,var(--ds-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--ds-info)_7%,transparent)] p-4">
                    <button
                      onClick={() => {
                        setAiResult("");
                        setAiType("");
                      }}
                      className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <h3 className="mb-2.5 text-[11px] font-semibold text-[var(--ds-info)]">
                      {aiType} Analysis
                    </h3>
                    <p className="whitespace-pre-line rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-bg-workspace)] px-3 py-2.5 font-mono text-sm leading-relaxed text-[var(--ds-text-secondary)]">
                      {aiResult}
                    </p>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Right Pane: Code Viewer & Actions */}
            <div className="space-y-4 min-w-0">
              {/* Code viewer card */}
              <section className="overflow-hidden rounded-[14px] bg-[var(--ds-surface-1)]">
                <div className="flex flex-wrap items-start justify-between gap-4 bg-[var(--ds-fill-subtle)] px-5 py-5">
                  <div className="min-w-0">
                    <h2 className={`${editorialDisplayClass} truncate text-2xl text-[var(--ds-text)]`}>
                      {selectedVersion?.title || script?.title || "Quick"}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-md border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] px-2 py-0.5 text-[9px] font-semibold text-[var(--ds-accent)]">
                        {selectedVersion?.scriptType || script?.scriptType || "Script"}
                      </span>
                      <span className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-2 py-0.5 text-[9px] font-semibold text-[var(--ds-text-secondary)]">
                        {selectedVersion?.studioLocation || script?.studioLocation || "ServerScriptService"}
                      </span>
                      <span className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-2 py-0.5 text-[9px] font-semibold text-[var(--ds-text-secondary)]">
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
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-[var(--ds-border)] bg-transparent px-4 text-xs font-semibold text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
                        >
                          {copied ? <Check className="h-3.5 w-3.5 text-[var(--ds-success)]" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>Copy</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Copy script code</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={handleDownload}
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-[var(--ds-border)] bg-transparent px-4 text-xs font-semibold text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
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
                    <pre className="m-0 min-h-40 bg-[var(--ds-bg-workspace)] p-4 text-sm text-[var(--ds-text-muted)]">Loading code view...</pre>
                  }>
                    <QuickScriptCodeBlock code={selectedVersion?.code || "-- No code found"} />
                  </Suspense>
                </div>
              </section>

              {/* Agent Build Nudge */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-[var(--ds-fill-subtle)] p-5">
                <div className="flex items-center gap-2.5 text-xs text-[var(--ds-text-muted)]">
                  <ShieldCheck className="h-4 w-4 text-[var(--ds-success)]" />
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
