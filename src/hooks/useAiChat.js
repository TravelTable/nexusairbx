import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { 
  doc, 
  collection, 
  query, 
  orderBy, 
  limitToLast, 
  onSnapshot, 
  serverTimestamp, 
  writeBatch, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  getDocs
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { auth, db } from "../firebase";
import { BACKEND_URL } from "../config";
import { ensureStreamSession } from "../lib/streamSession";
import { FEATURE_FLAGS } from "../lib/featureFlags";
import {
  getStudioApplyMode,
  getStudioEnabledPreference,
  normalizeToolStep,
  upsertAgentStep,
} from "../lib/agentSteps";
import { getStudioStatus } from "../lib/studioBridgeApi";
import { getAgentRun } from "../lib/workflowApi";
import {
  applyStreamDelta,
  createPendingStreamState,
  formatPendingStreamContent,
  getPendingStreamSnapshot,
} from "../lib/streaming";
import { emitStreamMetric } from "../lib/streamMetrics";
import { AI_EVENTS, emitAiEvent, onAiEvent } from "../lib/aiEvents";

const STREAM_MAX_RETRIES = 3;
const RESULT_MAX_POLLS = 45;
const RESULT_POLL_BASE_MS = 1000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function resolveResultUrl(jobId, resultUrl) {
  if (resultUrl && /^https?:\/\//i.test(resultUrl)) return resultUrl;
  if (resultUrl && resultUrl.startsWith("/")) return `${BACKEND_URL}${resultUrl}`;
  if (resultUrl) return `${BACKEND_URL}/${resultUrl.replace(/^\/+/, "")}`;
  return `${BACKEND_URL}/api/generate/result?jobId=${encodeURIComponent(jobId)}`;
}

function buildAssistantMessagePayload(data, { requestId, jobId, currentMode, isAutoExecuting }) {
  const payload = {
    role: "assistant",
    content: "",
    explanation: data?.explanation || "",
    summary: data?.summary || "",
    thought: data?.thought || "",
    code: data?.content || data?.code || "",
    title: data?.title || "",
    projectId: data?.projectId || null,
    versionNumber: data?.versionNumber || 1,
    pending: false,
    isAutoExecuting,
    updatedAt: serverTimestamp(),
    metadata: {
      ...(data?.metadata || {}),
      mode: currentMode,
      type: data?.artifactType || data?.metadata?.type || null,
      qaReport: data?.qaReport || null,
      runState: data?.runState || data?.metadata?.runState || null,
    },
  };

  if (requestId) payload.requestId = requestId;
  if (jobId) payload.jobId = jobId;
  if (data?.artifactId) payload.artifactId = data.artifactId;
  if (data?.options) payload.options = data.options;
  if (data?.plan) payload.plan = data.plan;
  if (Array.isArray(data?.files) && data.files.length) payload.files = data.files;
  if (data?.revision) payload.revision = data.revision;
  if (Array.isArray(data?.setupSteps) && data.setupSteps.length) payload.setupSteps = data.setupSteps;
  if (Array.isArray(data?.testingSteps) && data.testingSteps.length) payload.testingSteps = data.testingSteps;
  if (Array.isArray(data?.securityNotes) && data.securityNotes.length) payload.securityNotes = data.securityNotes;
  if (Array.isArray(data?.warnings) && data.warnings.length) payload.warnings = data.warnings;
  if (Array.isArray(data?.steps) && data.steps.length) payload.steps = data.steps.map(normalizeToolStep);
  if (data?.runId) payload.runId = data.runId;
  return payload;
}

export function useAiChat(user, settings, refreshBilling, notify) {
  const [messages, setMessages] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentChatMeta, setCurrentChatMeta] = useState(null);
  const [activeMode, setActiveMode] = useState(settings?.chatMode || "agent");
  const [customModes, setCustomModes] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [generationStage, setGenerationStage] = useState("");
  const [tasks, setTasks] = useState([]);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [chatMode, setChatMode] = useState("plan"); // "plan" | "act"

  // Listen for code patches (Security/Performance fixes)
  useEffect(() => {
    const handleApplyPatch = async (e) => {
      const { code, messageId } = e.detail;
      const u = user || auth.currentUser;
      if (!u || !currentChatId || !messageId) return;

      try {
        const msgRef = doc(db, "users", u.uid, "chats", currentChatId, "messages", messageId);
        await updateDoc(msgRef, {
          code: code,
          updatedAt: serverTimestamp(),
          patchApplied: true
        });
        notify?.({ message: "Optimization applied successfully!", type: "success" });
      } catch (err) {
        console.error("Failed to apply patch:", err);
        notify?.({ message: "Failed to apply optimization", type: "error" });
      }
    };
    const unbind = onAiEvent(AI_EVENTS.APPLY_CODE_PATCH, handleApplyPatch);
    return () => unbind();
  }, [user, currentChatId, notify]);

  const messagesUnsubRef = useRef(null);
  const chatUnsubRef = useRef(null);
  const customModesUnsubRef = useRef(null);
  const streamStateRef = useRef(createPendingStreamState());

  // Load custom modes
  useEffect(() => {
    const u = user || auth.currentUser;
    if (!u) return;

    customModesUnsubRef.current = onSnapshot(
      collection(db, "users", u.uid, "custom_modes"),
      (snap) => {
        const arr = snap.docs.map(d => ({ id: d.id, ...d.data(), isCustom: true }));
        setCustomModes(arr);
      }
    );
    return () => customModesUnsubRef.current?.();
  }, [user]);

  const openChatById = useCallback((chatId) => {
    const u = user || auth.currentUser;
    if (!u || !chatId) return;

    messagesUnsubRef.current?.();
    chatUnsubRef.current?.();

    setCurrentChatId(chatId);

    chatUnsubRef.current = onSnapshot(
      doc(db, "users", u.uid, "chats", chatId),
      (snap) => {
        const data = snap.exists() ? { id: snap.id, ...snap.data() } : null;
        setCurrentChatMeta(data || null);
        if (data?.activeMode) {
          setActiveMode(data.activeMode);
        }
      },
      (err) => {
        console.error("Firestore chat meta subscription error:", err);
        notify?.({ message: "Failed to sync chat details", type: "error" });
      }
    );

    messagesUnsubRef.current = onSnapshot(
      query(
        collection(db, "users", u.uid, "chats", chatId, "messages"),
        orderBy("createdAt", "asc"),
        limitToLast(200)
      ),
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setMessages(arr);
      },
      (err) => {
        console.error("Firestore messages subscription error:", err);
        notify?.({ message: "Failed to sync messages", type: "error" });
      }
    );
  }, [user, notify]);

  const pendingRecoveryMessage = useMemo(
    () =>
      [...(messages || [])]
        .reverse()
        .find((m) => m.role === "assistant" && m.pending && m.jobId && m.id) || null,
    [messages]
  );
  const pendingRecoveryRef = useRef(null);
  useEffect(() => {
    pendingRecoveryRef.current = pendingRecoveryMessage;
  }, [pendingRecoveryMessage]);

  useEffect(() => {
    const u = user || auth.currentUser;
    if (!u || !currentChatId || isGenerating) return;
    const pending = pendingRecoveryRef.current;
    if (!pending) return;

    let cancelled = false;
    const pendingRef = doc(db, "users", u.uid, "chats", currentChatId, "messages", pending.id);
    const chatRef = doc(db, "users", u.uid, "chats", currentChatId);

    const pollPendingRun = async () => {
      try {
        const currentPending = pendingRecoveryRef.current || pending;
        if (!currentPending) return;
        const token = await u.getIdToken();
        const res = await fetch(resolveResultUrl(currentPending.jobId, currentPending.resultUrl), {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        if (cancelled) return;

        if (res.status === 202) {
          if (currentPending.runId) {
            const runResult = await getAgentRun(currentPending.runId);
            if (cancelled) return;
            const steps = Array.isArray(runResult?.run?.steps)
              ? runResult.run.steps.map(normalizeToolStep)
              : [];
            const lastStep = steps[steps.length - 1];
            await updateDoc(pendingRef, {
              steps,
              stage: lastStep?.label || lastStep?.type || runResult?.run?.status || currentPending.stage || "Working...",
              updatedAt: serverTimestamp(),
            }).catch(() => {});
          }
          return;
        }

        if (!res.ok) {
          await updateDoc(pendingRef, {
            pending: false,
            stage: "failed",
            error: `Generation failed (${res.status})`,
            updatedAt: serverTimestamp(),
          }).catch(() => {});
          return;
        }

        const body = await res.json();
        const data = body?.result || body;
        if (data?.status === "pending" || data?.done === false) return;
        const currentMode = currentPending.metadata?.mode || currentPending.mode || chatMode;
        const msgPayload = buildAssistantMessagePayload(data, {
          requestId: currentPending.requestId,
          jobId: currentPending.jobId,
          currentMode,
          isAutoExecuting: Boolean(currentPending.isAutoExecuting || currentMode === "act"),
        });
        if (data?.runId || currentPending.runId) msgPayload.runId = data?.runId || currentPending.runId;
        await updateDoc(pendingRef, msgPayload);
        await updateDoc(chatRef, {
          updatedAt: serverTimestamp(),
          lastMessage: (currentPending.prompt || data?.title || "Studio agent run").slice(0, 50),
        }).catch(() => {});
        refreshBilling?.();
        emitAiEvent("JOB_COMPLETE", { jobId: currentPending.jobId });
      } catch (err) {
        console.warn("Failed to recover pending agent run:", err?.message || err);
      }
    };

    pollPendingRun();
    const intervalId = setInterval(pollPendingRun, 10000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [
    user,
    currentChatId,
    pendingRecoveryMessage?.id,
    pendingRecoveryMessage?.jobId,
    pendingRecoveryMessage?.runId,
    isGenerating,
    chatMode,
    refreshBilling,
  ]);

  const handleSubmit = async (
    prompt,
    existingChatId = null,
    existingRequestId = null,
    modeOverride = null,
    actNow = false,
    attachments = [],
    baseArtifact = null
  ) => {
    const content = prompt.trim();
    if (!content && attachments.length === 0) return;
    if (isGenerating || !user) return;

    const currentMode = actNow ? "act" : chatMode;
    const requestId = existingRequestId || uuidv4();

    setIsGenerating(true);
    setPendingMessage({
      role: "assistant",
      content: "",
      type: "chat",
      prompt: content,
      mode: currentMode,
      requestId,
      stage: "Analyzing Request...",
      streamState: getPendingStreamSnapshot(createPendingStreamState()),
    });
    setGenerationStage("Analyzing Request...");

    let activeChatId = existingChatId || currentChatId;
    const expertMode = modeOverride || activeMode || settings.chatMode || "agent";

    try {
      if (!activeChatId) {
        const newChatRef = await addDoc(collection(db, "users", user.uid, "chats"), {
          title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
          activeMode: expertMode,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        activeChatId = newChatRef.id;
        openChatById(activeChatId);
      }

      if (!existingRequestId) {
        const userMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-user`);
        await setDoc(userMsgRef, {
          role: "user",
          content: content,
          createdAt: serverTimestamp(),
          requestId,
        });
      }

      setGenerationStage("Preparing Job...");
      setPendingMessage((prev) => (prev ? { ...prev, stage: "Preparing Job..." } : prev));
      const token = await user.getIdToken();
      
      const idemKey = `chat-${requestId}`;
      
      // 1. Create Artifact Job
      const studioEnabled = FEATURE_FLAGS.unifiedAgent && getStudioEnabledPreference();
      const autoPushToStudio = Boolean(settings?.studioAutoPushEnabled);
      const autoPushPolicy = settings?.studioAutoPushPolicy || "after_validation";
      let studioSessionId = null;
      if (studioEnabled) {
        try {
          const studioStatus = await getStudioStatus();
          const activeSession = (studioStatus.sessions || []).find((s) => s.status === "connected");
          studioSessionId = activeSession?.sessionId || activeSession?.id || null;
        } catch (_) {
          /* non-fatal: codegen still works without Studio */
        }
      }

      const jobRes = await fetch(`${BACKEND_URL}/api/generate/artifact`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": idemKey
        },
        body: JSON.stringify({ 
          prompt: content, 
          settings,
          chatId: activeChatId,
          chatMode: expertMode,
          mode: currentMode,
          conversation: messages.slice(-10).map(m => ({ role: m.role, content: m.content || m.explanation })),
          attachments: attachments.map(a => ({ name: a.name, type: a.type, data: a.data, isImage: a.isImage })),
          studioEnabled: studioEnabled && Boolean(studioSessionId),
          applyMode: getStudioApplyMode(),
          studioSessionId,
          autoPushToStudio,
          autoPushPolicy,
          baseArtifact,
        }),
      });
      
      if (!jobRes.ok) {
        let errorMsg = "Failed to create generation job";
        try {
          const contentType = jobRes.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errData = await jobRes.json();
            errorMsg = errData.error || errorMsg;
          } else {
            const text = await jobRes.text();
            console.error("Server returned non-JSON error:", text);
            errorMsg = `Server Error (${jobRes.status})`;
          }
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        throw new Error(errorMsg);
      }
      
      const jobData = await jobRes.json();
      const jobId = jobData.jobId;
      if (!jobId) throw new Error("Failed to create generation job");
      const agentRunId = jobData.runId || null;
      const resultUrl = resolveResultUrl(jobId, jobData.resultUrl);
      const enableDeltaStreaming =
        FEATURE_FLAGS.streamV2 &&
        (jobData.streamVersion === "v2" || !jobData.streamVersion);
      const assistantMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-assistant`);

      setGenerationStage("Generating...");
      setPendingMessage((prev) => (prev ? { ...prev, stage: "Generating...", steps: [], runId: agentRunId } : prev));
      if (agentRunId) {
        await setDoc(assistantMsgRef, {
          role: "assistant",
          content: "",
          stage: "Generating...",
          pending: true,
          requestId,
          jobId,
          runId: agentRunId,
          isAutoExecuting: currentMode === "act",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          metadata: {
            mode: currentMode,
            type: null,
          },
          steps: [],
        }, { merge: true });
      }
      streamStateRef.current = createPendingStreamState();
      
      const fetchFinalResult = async () => {
        for (let attempt = 0; attempt < RESULT_MAX_POLLS; attempt++) {
          const res = await fetch(resultUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });

          if (res.status === 202) {
            await wait(RESULT_POLL_BASE_MS * (attempt + 1));
            continue;
          }

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(text || `Failed to recover result (${res.status})`);
          }

          const data = await res.json();
          const pending = data?.status === "pending" || data?.done === false;
          if (pending) {
            await wait(RESULT_POLL_BASE_MS * (attempt + 1));
            continue;
          }
          return data?.result || data;
        }

        throw new Error("Timed out while recovering streamed generation");
      };

      setGenerationStage("Connecting...");
      setPendingMessage((prev) => (prev ? { ...prev, stage: "Connecting..." } : prev));
      await ensureStreamSession(token);

      // 2. Connect to stream (tails worker events; auth via HttpOnly cookie)
      return new Promise((resolve, reject) => {
        let eventSource = null;
        let receivedDone = false;
        let finalized = false;
        const isAutoExecuting = currentMode === "act";
        let retryCount = 0;
        let streamFlushTimer = null;
        let lastStreamFlushAt = 0;
        const metrics = {
          startedAt: Date.now(),
          firstDeltaAt: null,
          deltaCount: 0,
          usedFallback: false,
        };

        const streamUrl = `${BACKEND_URL}/api/generate/stream?jobId=${encodeURIComponent(jobId)}&mode=${encodeURIComponent(currentMode)}`;

        const flushPendingStreamState = () => {
          streamFlushTimer = null;
          lastStreamFlushAt = Date.now();
          const snapshot = getPendingStreamSnapshot(streamStateRef.current);
          const pendingContent = formatPendingStreamContent(streamStateRef.current);
          setPendingMessage((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              content: pendingContent,
              files: snapshot.files || [],
              streamState: snapshot,
              title: snapshot.files?.length ? "Generating Artifact" : prev.title,
            };
          });
        };

        const schedulePendingStreamFlush = (immediate = false) => {
          if (immediate || Date.now() - lastStreamFlushAt >= 40) {
            if (streamFlushTimer) {
              clearTimeout(streamFlushTimer);
              streamFlushTimer = null;
            }
            flushPendingStreamState();
            return;
          }
          if (!streamFlushTimer) {
            streamFlushTimer = setTimeout(flushPendingStreamState, 40);
          }
        };

        const failAndReject = (err, tag = "network") => {
          emitStreamMetric("error", {
            jobId,
            tag,
            message: err?.message || "Generation failed",
            retries: retryCount,
          });
          if (agentRunId) {
            updateDoc(assistantMsgRef, {
              pending: false,
              stage: "failed",
              error: err?.message || "Generation failed",
              updatedAt: serverTimestamp(),
            }).catch(() => {});
          }
          setIsGenerating(false);
          if (streamFlushTimer) clearTimeout(streamFlushTimer);
          setPendingMessage(null);
          setGenerationStage("");
          reject(err instanceof Error ? err : new Error(String(err || "Generation failed")));
        };

        const finalizeWithData = async (data, source = "done") => {
          if (finalized) return;
          finalized = true;

          setGenerationStage("Finalizing...");
          setPendingMessage((prev) => (prev ? { ...prev, stage: "Finalizing..." } : prev));

          const msgPayload = buildAssistantMessagePayload(data, {
            requestId,
            jobId,
            currentMode,
            isAutoExecuting,
          });
          msgPayload.createdAt = serverTimestamp();
          if (data?.runId || agentRunId) msgPayload.runId = data?.runId || agentRunId;

          await setDoc(assistantMsgRef, msgPayload);

          await updateDoc(doc(db, "users", user.uid, "chats", activeChatId), {
            updatedAt: serverTimestamp(),
            lastMessage: content.slice(0, 50),
          });

          emitStreamMetric("complete", {
            jobId,
            source,
            retries: retryCount,
            deltaCount: metrics.deltaCount,
            firstDeltaMs: metrics.firstDeltaAt ? metrics.firstDeltaAt - metrics.startedAt : null,
            totalMs: Date.now() - metrics.startedAt,
            fallbackUsed: metrics.usedFallback,
          });

          refreshBilling();
          emitAiEvent("JOB_COMPLETE", { jobId });
          setIsGenerating(false);
          if (streamFlushTimer) clearTimeout(streamFlushTimer);
          setPendingMessage(null);
          setGenerationStage("");
        };

        const recoverFromStreamFailure = async (rawError = null) => {
          if (finalized || receivedDone) return;

          if (retryCount < STREAM_MAX_RETRIES) {
            retryCount += 1;
            emitStreamMetric("retry", { jobId, retryCount });
            setTimeout(() => {
              connect();
            }, 1000 * retryCount);
            return;
          }

          try {
            metrics.usedFallback = true;
            setGenerationStage("Recovering stream...");
            setPendingMessage((prev) => (prev ? { ...prev, stage: "Recovering stream..." } : prev));
            emitStreamMetric("fallback_start", { jobId });
            const recovered = await fetchFinalResult();
            await finalizeWithData(recovered, "fallback");
            resolve();
          } catch (fallbackErr) {
            const errorMsg = rawError?.message || fallbackErr?.message || "Generation failed";
            failAndReject(new Error(errorMsg), "timeout");
          }
        };

        const setupListeners = (es) => {
          es.addEventListener("stage", (e) => {
            try {
              const data = JSON.parse(e.data);
              if (data?.message) {
                setGenerationStage(data.message);
                setPendingMessage((prev) => {
                  if (!prev) return prev;
                  return { ...prev, stage: data.message };
                });
                if (agentRunId) {
                  updateDoc(assistantMsgRef, {
                    stage: data.message,
                    updatedAt: serverTimestamp(),
                  }).catch(() => {});
                }
              }
            } catch (err) {
              console.error("Failed to parse stage:", err);
            }
          });

          es.addEventListener("delta", (e) => {
            if (!enableDeltaStreaming) return;
            try {
              const data = JSON.parse(e.data);
              streamStateRef.current = applyStreamDelta(streamStateRef.current, data);
              metrics.deltaCount += 1;
              if (!metrics.firstDeltaAt) {
                metrics.firstDeltaAt = Date.now();
                emitStreamMetric("first_delta", { jobId, msFromStart: metrics.firstDeltaAt - metrics.startedAt });
              }
              schedulePendingStreamFlush(data.channel === "file_event" && data.event?.event === "file_ready");
            } catch (err) {
              console.error("Failed to parse stream delta:", err);
              emitStreamMetric("error", { jobId, tag: "protocol", message: "delta_parse_failed" });
            }
          });

          es.addEventListener("tool_step", (e) => {
            if (!FEATURE_FLAGS.unifiedAgent) return;
            try {
              const data = JSON.parse(e.data);
              const step = normalizeToolStep(data.step || data);
              setPendingMessage((prev) => {
                if (!prev) return prev;
                const steps = upsertAgentStep(prev.steps || [], step);
                if (agentRunId) {
                  updateDoc(assistantMsgRef, {
                    steps,
                    runId: data.runId || prev.runId || agentRunId,
                    stage: step.label || step.type || prev.stage,
                    updatedAt: serverTimestamp(),
                  }).catch(() => {});
                }
                return {
                  ...prev,
                  steps,
                  runId: data.runId || prev.runId || agentRunId,
                  stage: step.label || step.type || prev.stage,
                };
              });
              if (step.label || step.type) {
                setGenerationStage(step.label || step.type);
              }
            } catch (err) {
              console.error("Failed to parse tool_step:", err);
              emitStreamMetric("error", { jobId, tag: "protocol", message: "tool_step_parse_failed" });
            }
          });

          es.addEventListener("done", async (e) => {
            receivedDone = true;
            try {
              const data = JSON.parse(e.data);
              es.close();
              await finalizeWithData(data, "done");
              resolve();
            } catch (err) {
              failAndReject(err, "protocol");
            }
          });

          es.addEventListener("error", async () => {
            es.close();
            emitStreamMetric("error", { jobId, tag: "network", retryCount });
            await recoverFromStreamFailure();
          });
        };

        const connect = () => {
          eventSource?.close?.();
          eventSource = new EventSource(streamUrl, { withCredentials: true });
          emitStreamMetric("connect", { jobId, retryCount });
          setupListeners(eventSource);
        };

        connect();
      });

    } catch (e) {
      console.error(e);
      notify({ message: e.message || "Generation failed", type: "error" });
      setIsGenerating(false);
      setPendingMessage(null);
      setGenerationStage("");
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!user || !chatId) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "chats", chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setCurrentChatMeta(null);
        setMessages([]);
      }
      notify({ message: "Chat deleted successfully", type: "success" });
    } catch (err) {
      notify({ message: "Failed to delete chat: " + err.message, type: "error" });
    }
  };

  const handleClearChat = async () => {
    if (!user || !currentChatId) return;
    try {
      const msgsSnap = await getDocs(collection(db, "users", user.uid, "chats", currentChatId, "messages"));
      const batch = writeBatch(db);
      msgsSnap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      setMessages([]);
      notify({ message: "Conversation cleared", type: "success" });
    } catch (err) {
      notify({ message: "Failed to clear conversation: " + err.message, type: "error" });
    }
  };

  const startNewChat = useCallback(() => {
    setCurrentChatId(null);
    setCurrentChatMeta(null);
    setMessages([]);
    setActiveMode("agent");
    setTasks([]);
    setCurrentTaskId(null);
  }, []);

  const updateChatMode = useCallback(async (chatId, mode) => {
    const u = user || auth.currentUser;
    
    // Pro restriction for specialized modes is enforced in the UI.

    if (!u) {
      setActiveMode(mode);
      return;
    }
    
    // Update local state immediately for snappy UI
    setActiveMode(mode);

    if (chatId) {
      try {
        await updateDoc(doc(db, "users", u.uid, "chats", chatId), {
          activeMode: mode,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Failed to update chat mode in Firestore:", err);
        notify?.({ message: "Failed to persist chat mode", type: "error" });
      }
    }
  }, [user, notify]);

  return {
    messages,
    currentChatId,
    currentChatMeta,
    isGenerating,
    pendingMessage,
    generationStage,
    openChatById,
    handleSubmit,
    handleDeleteChat,
    handleClearChat,
    startNewChat,
    setPendingMessage,
    setCurrentChatId,
    activeMode,
    setActiveMode,
    updateChatMode,
    customModes,
    tasks,
    setTasks,
    currentTaskId,
    setCurrentTaskId,
    chatMode,
    setChatMode,
    handleShareWithTeam: async (artifactId, type, teamId) => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${BACKEND_URL}/api/user/share`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ artifactId, type, teamId }),
        });
        if (res.ok) {
          notify?.({ message: "Artifact shared with team!", type: "success" });
        } else {
          const err = await res.json();
          notify?.({ message: err.error || "Sharing failed", type: "error" });
        }
      } catch (err) {
        console.error("Share error:", err);
        notify?.({ message: "Failed to share artifact", type: "error" });
      }
    }
  };
}
