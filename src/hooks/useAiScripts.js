import { useState, useEffect, useCallback } from "react";
import { 
  doc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc,
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../firebase";

export function useAiScripts(user, notify) {
  const [currentScriptId, setCurrentScriptId] = useState(null);
  const [currentScript, setCurrentScript] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState(null);

  useEffect(() => {
    if (!user || !currentScriptId) {
      setCurrentScript(null);
      setVersionHistory([]);
      return;
    }

    const scriptRef = doc(db, "users", user.uid, "scripts", currentScriptId);

    const unsubScript = onSnapshot(
      scriptRef,
      (snap) => {
        if (snap.exists()) {
          setCurrentScript({ id: snap.id, ...snap.data() });
        }
      },
      (err) => {
        console.error("Firestore script subscription error:", err);
        notify?.({ message: "Failed to sync script details", type: "error" });
      }
    );

    const versionsRef = collection(
      db,
      "users",
      user.uid,
      "scripts",
      currentScriptId,
      "versions"
    );
    const qVersions = query(versionsRef, orderBy("versionNumber", "desc"));

    const unsubVersions = onSnapshot(
      qVersions,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setVersionHistory(arr);
      },
      (err) => {
        console.error("Firestore versions subscription error:", err);
        notify?.({ message: "Failed to sync version history", type: "error" });
      }
    );

    return () => {
      unsubScript();
      unsubVersions();
    };
  }, [user, currentScriptId, notify]);

  const handleRenameScript = useCallback(async (id, title) => {
    if (!user || !id) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "scripts", id), {
        title,
        updatedAt: serverTimestamp(),
      });
      notify({ message: "Script renamed", type: "success" });
    } catch (err) {
      notify({ message: "Failed to rename script", type: "error" });
    }
  }, [user, notify]);

  const handleCreateScript = useCallback(async (title, chatId) => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, "users", user.uid, "scripts"), {
        title: title || "New Script",
        chatId: chatId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        type: "chat",
      });
      setCurrentScriptId(docRef.id);
      notify({ message: "Script created", type: "success" });
      return docRef.id;
    } catch (err) {
      console.error("Error creating script:", err);
      notify({ message: "Failed to create script", type: "error" });
    }
  }, [user, notify]);

  const handleDeleteScript = useCallback(async (id) => {
    if (!user || !id) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "scripts", id));
      if (currentScriptId === id) {
        setCurrentScriptId(null);
      }
      notify({ message: "Script deleted", type: "success" });
    } catch (err) {
      notify({ message: "Failed to delete script", type: "error" });
    }
  }, [user, currentScriptId, notify]);

  return {
    currentScriptId,
    setCurrentScriptId,
    currentScript,
    versionHistory,
    selectedVersionId,
    setSelectedVersionId,
    handleCreateScript,
    handleRenameScript,
    handleDeleteScript
  };
}
