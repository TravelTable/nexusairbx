import { useEffect, useRef } from "react";

const STORAGE_KEY = "nexusrbx:scrollPositionByChat";

function resolveStorage(storage) {
  if (storage) return storage;
  return typeof window !== "undefined" ? window.localStorage : null;
}

export function readChatScrollPositions(storage) {
  const targetStorage = resolveStorage(storage);
  if (!targetStorage) return {};

  try {
    const value = JSON.parse(targetStorage.getItem(STORAGE_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export function writeChatScrollPosition(chatId, scrollTop, storage) {
  if (!chatId) return;
  const targetStorage = resolveStorage(storage);
  if (!targetStorage) return;

  try {
    const positions = readChatScrollPositions(targetStorage);
    positions[chatId] = Math.max(0, Math.round(Number(scrollTop) || 0));
    targetStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // Storage can be unavailable in privacy-restricted contexts.
  }
}

export default function useChatScrollRestoration(rootRef, chatId) {
  const activeRef = useRef({ chatId: "", element: null });

  useEffect(() => {
    const element = rootRef.current?.querySelector(".nexus-chat-scroll");
    if (!element || !chatId) return undefined;

    const previous = activeRef.current;
    if (previous.chatId && previous.element) {
      writeChatScrollPosition(previous.chatId, previous.element.scrollTop);
    }
    activeRef.current = { chatId, element };

    let restoreFrame = 0;
    const positions = readChatScrollPositions();
    if (Number.isFinite(Number(positions[chatId]))) {
      restoreFrame = window.requestAnimationFrame(() => {
        element.scrollTop = Number(positions[chatId]);
      });
    }

    let frame = 0;
    const persist = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        writeChatScrollPosition(chatId, element.scrollTop);
      });
    };
    element.addEventListener("scroll", persist, { passive: true });

    return () => {
      if (restoreFrame) window.cancelAnimationFrame(restoreFrame);
      if (frame) window.cancelAnimationFrame(frame);
      element.removeEventListener("scroll", persist);
      writeChatScrollPosition(chatId, element.scrollTop);
    };
  }, [chatId, rootRef]);
}
