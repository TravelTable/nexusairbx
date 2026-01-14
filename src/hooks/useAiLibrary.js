import { useState, useEffect } from "react";
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  toMs
} from "firebase/firestore";

export function useAiLibrary(user) {
  const [chats, setChats] = useState([]);
  const [savedScripts, setSavedScripts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setChats([]);
      setSavedScripts([]);
      setLoading(false);
      return;
    }

    const db = getFirestore();
    
    // Subscribe to chats
    const chatsRef = collection(db, "users", user.uid, "chats");
    const qChats = query(chatsRef, orderBy("updatedAt", "desc"), limit(100));
    const unsubChats = onSnapshot(qChats, (snap) => {
      const arr = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        updatedAt: d.data().updatedAt?.toMillis?.() || Date.now(),
        createdAt: d.data().createdAt?.toMillis?.() || Date.now(),
      }));
      setChats(arr);
    });

    // Subscribe to saved scripts
    const savedRef = collection(db, "users", user.uid, "savedScripts");
    const qSaved = query(savedRef, orderBy("updatedAt", "desc"));
    const unsubSaved = onSnapshot(qSaved, (snap) => {
      const arr = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        updatedAt: d.data().updatedAt?.toMillis?.() || Date.now(),
        createdAt: d.data().createdAt?.toMillis?.() || Date.now(),
      }));
      setSavedScripts(arr);
      setLoading(false);
    });

    return () => {
      unsubChats();
      unsubSaved();
    };
  }, [user]);

  return { chats, savedScripts, loading };
}
