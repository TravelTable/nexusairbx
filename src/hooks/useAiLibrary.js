import { useState, useEffect, useMemo } from "react";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { cancelDeferredClientLog, scheduleDeferredClientLog } from "../lib/deferredClientLog";
import { filterChatsByRetention, countHiddenChats } from "../lib/starterPromo";

export function useAiLibrary(user, { retentionDays = null } = {}) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const visibleChats = useMemo(
    () => filterChatsByRetention(chats, retentionDays),
    [chats, retentionDays]
  );

  const hiddenChatCount = useMemo(
    () => countHiddenChats(chats, retentionDays),
    [chats, retentionDays]
  );

  useEffect(() => {
    if (!user) {
      setChats([]);
      setLoading(false);
      return;
    }

    const db = getFirestore();
    
    // Subscribe to chats
    const chatsRef = collection(db, "users", user.uid, "chats");
    const qChats = query(chatsRef, orderBy("updatedAt", "desc"), limit(100));
    const unsubChats = onSnapshot(
      qChats,
      (snap) => {
        cancelDeferredClientLog("firestore:chat-library");
        const arr = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          updatedAt: d.data().updatedAt?.toMillis?.() || Date.now(),
          createdAt: d.data().createdAt?.toMillis?.() || Date.now(),
        }));
        setChats(arr);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        scheduleDeferredClientLog({
          key: "firestore:chat-library",
          source: "firestore",
          message: error?.message || "Chat library listener failed",
          metadata: { code: error?.code || null },
        });
      }
    );

    return () => {
      unsubChats();
    };
  }, [user]);

  return { chats: visibleChats, allChats: chats, hiddenChatCount, loading };
}
