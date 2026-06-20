import PLAN_INFO from "./planInfo";

export const INSUFFICIENT_TOKENS_CODE = "INSUFFICIENT_TOKENS";

export const DEFAULT_INSUFFICIENT_TOKENS_MESSAGE =
  "You're out of tokens. Upgrade to keep generating.";

export function isInsufficientTokensError(input) {
  if (!input) return false;
  const code = input.code || input.error || input.errorCode;
  if (code === INSUFFICIENT_TOKENS_CODE) return true;
  const message = String(input.message || input.error || "");
  return message === INSUFFICIENT_TOKENS_CODE || message.includes("INSUFFICIENT_TOKENS");
}

export function insufficientTokensMessage(planKey = "free") {
  const key = String(planKey || "free").toLowerCase();
  return PLAN_INFO[key]?.toastZero || DEFAULT_INSUFFICIENT_TOKENS_MESSAGE;
}

export function insufficientTokensToast(planKey = "free", { navigate } = {}) {
  const key = String(planKey || "free").toLowerCase();
  const toast = {
    type: "error",
    message: insufficientTokensMessage(key),
    duration: 9000,
  };
  if (key !== "team") {
    toast.cta = {
      label: key === "pro" ? "Add tokens" : "View plans",
      primary: true,
      onClick: () => {
        if (typeof navigate === "function") {
          navigate(key === "pro" ? "/billing" : "/subscribe");
          return;
        }
        window.location.href = key === "pro" ? "/billing" : "/subscribe";
      },
    };
  }
  return toast;
}

export function parseApiErrorPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (isInsufficientTokensError(payload)) {
    return {
      code: INSUFFICIENT_TOKENS_CODE,
      message: payload.message || DEFAULT_INSUFFICIENT_TOKENS_MESSAGE,
      retryable: false,
    };
  }
  return null;
}
