import { useState, useEffect, useRef, useCallback } from "react";
import { 
  getFirestore, 
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
import { auth } from "../pages/firebase";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app";

export function useAiChat(user, settings, refreshBilling, notify) {
  const [messages, setMessages] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentChatMeta, setCurrentChatMeta] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [generationStage, setGenerationStage] = useState("");

  const messagesUnsubRef = useRef(null);
  const chatUnsubRef = useRef(null);

  const openChatById = useCallback((chatId) => {
    const db = getFirestore();
    const u = user || auth.currentUser;
    if (!u || !chatId) return;

    messagesUnsubRef.current?.();
    chatUnsubRef.current?.();

    setCurrentChatId(chatId);

    chatUnsubRef.current = onSnapshot(doc(db, "users", u.uid, "chats", chatId), (snap) => {
      const data = snap.exists() ? { id: snap.id, ...snap.data() } : null;
      setCurrentChatMeta(data || null);
    });

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
      }
    );
  }, [user]);

  const handleSubmit = async (prompt) => {
    const content = prompt.trim();
    if (!content || isGenerating || !user) return;

    setIsGenerating(true);
    setPendingMessage({ role: "assistant", content: "", type: "chat", prompt: content });
    setGenerationStage("Analyzing Request...");

    const db = getFirestore();
    let activeChatId = currentChatId;
    const requestId = uuidv4();

    try {
      if (!activeChatId) {
        const newChatRef = await addDoc(collection(db, "users", user.uid, "chats"), {
          title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        activeChatId = newChatRef.id;
        setCurrentChatId(activeChatId);
      }

      const userMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-user`);
      await setDoc(userMsgRef, {
        role: "user",
        content: content,
        createdAt: serverTimestamp(),
        requestId,
      });

      setGenerationStage("Generating Response...");
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/generate-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          prompt: content, 
          settings,
          conversation: messages.slice(-10).map(m => ({ role: m.role, content: m.content || m.explanation }))
        }),
      });
      
      setGenerationStage("Finalizing...");
      const data = await res.json();
      
      if (data.code || data.explanation) {
        const assistantMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-assistant`);
        await setDoc(assistantMsgRef, {
          role: "assistant",
          content: "",
          explanation: data.explanation || "",
          code: data.code || "",
          createdAt: serverTimestamp(),
          requestId,
        });

        await updateDoc(doc(db, "users", user.uid, "chats", activeChatId), {
          updatedAt: serverTimestamp(),
          lastMessage: content.slice(0, 50),
        });
        refreshBilling();
      }
    } catch (e) {
      console.error(e);
      notify({ message: "Generation failed", type: "error" });
    } finally {
      setIsGenerating(false);
      setPendingMessage(null);
      setGenerationStage("");
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!user || !chatId) return;
    const db = getFirestore();
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
    const db = getFirestore();
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
  }, []);

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
    startNewChat
  };
}
