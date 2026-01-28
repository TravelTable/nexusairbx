import { useState, useEffect } from "react";
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot
} from "firebase/firestore";

export function useAiLibrary(user) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const unsubChats = onSnapshot(qChats, (snap) => {
      const arr = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        updatedAt: d.data().updatedAt?.toMillis?.() || Date.now(),
        createdAt: d.data().createdAt?.toMillis?.() || Date.now(),
      }));
      setChats(arr);
      setLoading(false);
    });

    return () => {
      unsubChats();
    };
  }, [user]);

  return { chats, loading };
}
