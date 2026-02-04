import { useState, useRef, useCallback, useEffect } from "react";
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

export function useAiChat(user, settings, refreshBilling, notify) {
  const [messages, setMessages] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentChatMeta, setCurrentChatMeta] = useState(null);
  const [activeMode, setActiveMode] = useState("general");
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
    window.addEventListener("nexus:applyCodePatch", handleApplyPatch);
    return () => window.removeEventListener("nexus:applyCodePatch", handleApplyPatch);
  }, [user, currentChatId, notify]);

  const messagesUnsubRef = useRef(null);
  const chatUnsubRef = useRef(null);
  const customModesUnsubRef = useRef(null);

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

  const handleSubmit = async (prompt, existingChatId = null, existingRequestId = null, modeOverride = null, actNow = false, attachments = []) => {
    const content = prompt.trim();
    if (!content && attachments.length === 0) return;
    if (isGenerating || !user) return;

    const currentMode = actNow ? "act" : chatMode;

    setIsGenerating(true);
    setPendingMessage({ role: "assistant", content: "", type: "chat", prompt: content, mode: currentMode });
    setGenerationStage("Analyzing Request...");

    let activeChatId = existingChatId || currentChatId;
    const requestId = existingRequestId || uuidv4();
    const expertMode = modeOverride || activeMode || settings.chatMode || "general";

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
      const token = await user.getIdToken();
      
      const idemKey = `chat-${requestId}`;
      
      // 1. Create Artifact Job
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
          attachments: attachments.map(a => ({ name: a.name, type: a.type, data: a.data, isImage: a.isImage }))
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

      setGenerationStage("Generating...");
      
      // 2. Connect to Stream (backend processes fully, sends only final "done" event)
      return new Promise((resolve, reject) => {
        let eventSource = new EventSource(`${BACKEND_URL}/api/generate/stream?jobId=${jobId}&token=${token}&mode=${currentMode}`);
        let receivedDone = false;
        const isAutoExecuting = currentMode === "act";
        let retryCount = 0;
        const maxRetries = 3;

        const setupListeners = (es) => {
          es.addEventListener("stage", (e) => {
            try {
              const data = JSON.parse(e.data);
              if (data?.message) setGenerationStage(data.message);
            } catch (err) {
              console.error("Failed to parse stage:", err);
            }
          });

          es.addEventListener("done", async (e) => {
            receivedDone = true;
            try {
              const data = JSON.parse(e.data);
              es.close();
              
              setGenerationStage("Finalizing...");
              const assistantMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-assistant`);
              
              const msgPayload = {
                role: "assistant",
                content: "",
                explanation: data.explanation || "",
                thought: data.thought || "",
                code: data.content || "", // Backend sends 'content' for code in stream
                projectId: data.projectId || null,
                versionNumber: data.versionNumber || 1,
                createdAt: serverTimestamp(),
                requestId,
                jobId,
                artifactId: data.artifactId,
                isAutoExecuting,
                metadata: {
                  ...(data.metadata || {}),
                  mode: currentMode,
                  qaReport: data.qaReport || null
                }
              };

              if (data.options) msgPayload.options = data.options;
              if (data.plan) msgPayload.plan = data.plan;

              await setDoc(assistantMsgRef, msgPayload);

              await updateDoc(doc(db, "users", user.uid, "chats", activeChatId), {
                updatedAt: serverTimestamp(),
                lastMessage: content.slice(0, 50),
              });
              
              // Notify UI hook if this was a UI generation
              if (data.projectId) {
                // Ensure we pass the new format if available
                window.dispatchEvent(new CustomEvent("nexus:uiGenerated", { 
                  detail: {
                    ...data,
                    uiModuleLua: data.uiModuleLua || data.content,
                    systemsLua: data.systemsLua || ""
                  } 
                }));
              }

              refreshBilling();
              setIsGenerating(false);
              setPendingMessage(null);
              setGenerationStage("");
              resolve();
            } catch (err) {
              reject(err);
            }
          });

          es.addEventListener("error", (e) => {
            es.close();
            if (retryCount < maxRetries && !receivedDone) {
              retryCount++;
              console.log(`Retrying connection (${retryCount}/${maxRetries})...`);
              setTimeout(() => {
                eventSource = new EventSource(`${BACKEND_URL}/api/generate/stream?jobId=${jobId}&token=${token}&mode=${currentMode}`);
                setupListeners(eventSource);
              }, 1000 * retryCount);
            } else {
              let errorMsg = "Generation failed";
              try {
                const data = JSON.parse(e.data);
                if (data.error) errorMsg = data.error;
              } catch (err) {}
              reject(new Error(errorMsg));
            }
          });
        };

        setupListeners(eventSource);
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
    setActiveMode("general");
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
    handlePushToStudio: async (artifactId, type, data) => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${BACKEND_URL}/api/plugin/push-queue`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ artifactId, type, data }),
        });
        if (res.ok) {
          notify?.({ message: "Artifact queued for Studio push!", type: "success" });
        } else {
          const err = await res.json();
          notify?.({ message: err.error || "Push failed", type: "error" });
        }
      } catch (err) {
        console.error("Push error:", err);
        notify?.({ message: "Failed to connect to push service", type: "error" });
      }
    },
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
