import { useState, useCallback } from "react";
import { BACKEND_URL } from "../lib/uiBuilderApi";

export function useAgent(user, notify, refreshBilling) {
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);

  const sendMessage = useCallback(async (goal) => {
    if (!user || !goal) return;

    setIsThinking(true);
    const userMsg = { role: "user", content: goal, createdAt: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          history: messages,
          goal,
        }),
      });

      if (!res.ok) throw new Error("Agent request failed");
      const data = await res.json();

      const assistantMsg = {
        role: "assistant",
        content: data.thought || "I've processed your request.",
        action: data.action,
        parameters: data.parameters,
        createdAt: Date.now(),
      };

      setMessages(prev => [...prev, assistantMsg]);
      refreshBilling();
      return data;
    } catch (e) {
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
