import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { authedFetch } from "./billing";
import { readAskResponse } from "./chatTransport";
import { getChatOperationStatus } from "./workflowApi";
import { sanitizeTranscriptMessagePayload } from "./firestorePayloads";

export function watchUiConversation(uid, chatId, onMessages, onError) {
  return onSnapshot(query(collection(db, "users", uid, "chats", chatId, "messages"), orderBy("createdAt", "desc"), limit(50)),
    snapshot => onMessages(snapshot.docs.map(entry => ({ id: entry.id, ...entry.data() })).reverse()), onError);
}

// Reuse Ask's reservation, streaming, cancellation, and operation recovery path.
export async function askUiQuestion({ uid, chatId, projectId, prompt, modelVersion, attachments, operationId, conversation, signal, onText }) {
  const save = (role, content) => setDoc(doc(db, "users", uid, "chats", chatId, "messages", operationId + "-" + role),
    sanitizeTranscriptMessagePayload({ role, content, selectedMode: "ask", responseKind: "answer", requestId: operationId, createdAt: serverTimestamp() }));
  await save("user", prompt);
  const response = await authedFetch("/api/ai/chat", { method: "POST", signal,
    headers: { "Content-Type": "application/json", "Idempotency-Key": operationId },
    body: JSON.stringify({ chatId, projectId, prompt, modelVersion, attachments, selectedMode: "ask", responseKind: "answer",
      studioEnabled: false, conversation: conversation.slice(-10).map(message => ({ role: message.role, content: message.content })) }) });
  const text = await readAskResponse(response, { operationId, readOperation: getChatOperationStatus, signal, onText });
  signal?.throwIfAborted();
  await save("assistant", text);
  return text;
}
