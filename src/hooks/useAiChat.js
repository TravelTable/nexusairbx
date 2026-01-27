import { useState, useRef, useCallback } from "react";
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

const BACKEND_URL = "https://nexusrbx-backend-production.up.railway.app";

export function useAiChat(user, settings, refreshBilling, notify) {
  const [messages, setMessages] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentChatMeta, setCurrentChatMeta] = useState(null);
  const [activeMode, setActiveMode] = useState("general");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [generationStage, setGenerationStage] = useState("");

  const messagesUnsubRef = useRef(null);
  const chatUnsubRef = useRef(null);

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

  const handleSubmit = async (prompt, existingChatId = null, existingRequestId = null, modeOverride = null) => {
    const content = prompt.trim();
    if (!content || isGenerating || !user) return;

    setIsGenerating(true);
    setPendingMessage({ role: "assistant", content: "", type: "chat", prompt: content });
    setGenerationStage("Analyzing Request...");

    let activeChatId = existingChatId || currentChatId;
    const requestId = existingRequestId || uuidv4();
    const chatMode = modeOverride || activeMode || settings.chatMode || "general";

    try {
      if (!activeChatId) {
        const newChatRef = await addDoc(collection(db, "users", user.uid, "chats"), {
          title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
          activeMode: chatMode,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        activeChatId = newChatRef.id;
        setCurrentChatId(activeChatId);
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
          chatMode: chatMode,
          conversation: messages.slice(-10).map(m => ({ role: m.role, content: m.content || m.explanation }))
        }),
      });
      
      if (!jobRes.ok) {
        const errData = await jobRes.json();
        throw new Error(errData.error || "Failed to create generation job");
      }
      
      const jobData = await jobRes.json();
      const jobId = jobData.jobId;
      if (!jobId) throw new Error("Failed to create generation job");

      setGenerationStage("Generating...");
      
      // 2. Connect to Stream
      return new Promise((resolve, reject) => {
        let eventSource = new EventSource(`${BACKEND_URL}/api/generate/stream?jobId=${jobId}&token=${token}`);
        let fullText = "";
        let retryCount = 0;
        const maxRetries = 3;

        const setupListeners = (es) => {
          es.addEventListener("chunk", (e) => {
            try {
              const { chunk } = JSON.parse(e.data);
              fullText += chunk;
              setPendingMessage(prev => ({ ...prev, content: fullText, type: "chat" }));
            } catch (err) {
              console.error("Failed to parse chunk:", err);
            }
          });

          es.addEventListener("done", async (e) => {
            try {
              const data = JSON.parse(e.data);
              es.close();
              
              setGenerationStage("Finalizing...");
              const assistantMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-assistant`);
              await setDoc(assistantMsgRef, {
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
                artifactId: data.artifactId
              });

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
            if (retryCount < maxRetries && !fullText) {
              retryCount++;
              console.log(`Retrying connection (${retryCount}/${maxRetries})...`);
              setTimeout(() => {
                eventSource = new EventSource(`${BACKEND_URL}/api/generate/stream?jobId=${jobId}&token=${token}`);
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
  }, []);

  const updateChatMode = async (chatId, mode) => {
    const u = user || auth.currentUser;
    if (!u || !chatId) {
      setActiveMode(mode);
      return;
    }
    try {
      await updateDoc(doc(db, "users", u.uid, "chats", chatId), {
        activeMode: mode,
        updatedAt: serverTimestamp(),
      });
      setActiveMode(mode);
    } catch (err) {
      console.error("Failed to update chat mode:", err);
      notify?.({ message: "Failed to update chat mode", type: "error" });
    }
  };

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
    updateChatMode
  };
}
