import { useState, useEffect, useMemo, useRef } from "react";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { auth, firebaseConfig } from "../firebase";
import { cancelDeferredClientLog, scheduleDeferredClientLog } from "../lib/deferredClientLog";
import { filterChatsByRetention, countHiddenChats } from "../lib/starterPromo";

export function useAiLibrary(user, { retentionDays = null, authReady = true } = {}) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const reportedFailuresRef = useRef(new Set());

  const visibleChats = useMemo(
    () => filterChatsByRetention(chats, retentionDays),
    [chats, retentionDays]
  );

  const hiddenChatCount = useMemo(
    () => countHiddenChats(chats, retentionDays),
    [chats, retentionDays]
  );

  useEffect(() => {
    const uid = user?.uid;
    if (!authReady || !uid || auth.currentUser?.uid !== uid) {
      setChats([]);
      setLoading(false);
      return;
    }

    const db = getFirestore();
    
    // Subscribe to chats
    const chatsRef = collection(db, "users", uid, "chats");
    const qChats = query(chatsRef, orderBy("updatedAt", "desc"), limit(100));
    let cancelled = false;
    const unsubChats = onSnapshot(
      qChats,
      (snap) => {
        if (cancelled || auth.currentUser?.uid !== uid) return;
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
        if (cancelled || auth.currentUser?.uid !== uid) return;
        setLoading(false);
        const failureKey = [error?.code || "unknown", uid].join(":");
        if (reportedFailuresRef.current.has(failureKey)) return;
        reportedFailuresRef.current.add(failureKey);
        console.error("Firestore request failed", {
          code: error?.code,
          message: error?.message,
          uid,
          chatId: null,
          projectId: firebaseConfig.projectId,
          authReady,
          emailVerified: auth.currentUser?.emailVerified,
        });
        scheduleDeferredClientLog({
          key: "firestore:chat-library",
          source: "firestore",
          message: error?.message || "Chat library listener failed",
          metadata: { code: error?.code || null },
        });
      }
    );

    return () => {
      cancelled = true;
      unsubChats();
    };
  }, [authReady, user?.uid]);

  return { chats: visibleChats, allChats: chats, hiddenChatCount, loading };
}
