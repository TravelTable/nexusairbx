import { useState, useCallback } from "react";
import { doc, setDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { v4 as uuidv4 } from "uuid";

const BACKEND_URL = "https://nexusrbx-backend-production.up.railway.app";

export function useAgent(user, notify, refreshBilling) {
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);

  const sendMessage = useCallback(async (goal, chatId, setChatId, existingRequestId = null, chatMode = "general") => {
    if (!user || !goal) return;

    setIsThinking(true);
    const requestId = existingRequestId || uuidv4();
    let activeChatId = chatId;

    try {
      // 1. Ensure we have a chat
      if (!activeChatId && setChatId) {
        const newChatRef = await addDoc(collection(db, "users", user.uid, "chats"), {
          title: goal.slice(0, 30) + (goal.length > 30 ? "..." : ""),
          activeMode: chatMode,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        activeChatId = newChatRef.id;
        setChatId(activeChatId);
      }

      // 2. Save User Message to Firestore
      if (activeChatId) {
        await setDoc(doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-user`), {
          role: "user",
          content: goal,
          createdAt: serverTimestamp(),
          requestId,
        });
      }

      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          history: messages.slice(-5), // Send recent history for context
          goal,
          chatMode,
          chatId: activeChatId
        }),
      });

      if (!res.ok) throw new Error("Agent request failed");
      const data = await res.json();

      // 3. Save Assistant Thought to Firestore
      if (activeChatId) {
        await setDoc(doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-agent`), {
          role: "assistant",
          content: data.action === "chat" ? (data.thought || "I've processed your request.") : "",
          thought: data.thought || "",
          action: data.action || "chat",
          mode: data.mode || null,
          suggestedMode: data.suggestedMode || null,
          tasks: data.tasks || null,
          parameters: data.parameters || {},
          createdAt: serverTimestamp(),
          requestId,
        });
      }

      refreshBilling();
      return data;
    } catch (e) {
      console.error("Agent Error:", e);
      notify({ message: "Agent failed to respond", type: "error" });
    } finally {
      setIsThinking(false);
    }
  }, [user, messages, notify, refreshBilling]);

  return {
    messages,
    setMessages,
    isThinking,
    sendMessage,
  };
}
