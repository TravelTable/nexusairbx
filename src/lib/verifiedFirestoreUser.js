export const VERIFY_EMAIL_BEFORE_CHAT_WRITE =
  "Verify your email before creating or updating chats.";

export function isEmailVerificationError(error) {
  return error?.code === "auth/email-not-verified";
}

export async function requireVerifiedFirestoreUser(user, currentUser = user) {
  const requestedUid = String(user?.uid || "").trim();
  const activeUid = String(currentUser?.uid || "").trim();
  if (!requestedUid || !activeUid || requestedUid !== activeUid) {
    const error = new Error("Sign in again before creating or updating chats.");
    error.code = "auth/user-mismatch";
    throw error;
  }

  await currentUser.reload?.();
  await currentUser.getIdToken?.(true);
  const tokenResult = await currentUser.getIdTokenResult?.(true);
  const tokenVerified = tokenResult?.claims?.email_verified === true;
  if (currentUser.emailVerified !== true || !tokenVerified) {
    const error = new Error(VERIFY_EMAIL_BEFORE_CHAT_WRITE);
    error.code = "auth/email-not-verified";
    throw error;
  }
  return currentUser;
}
