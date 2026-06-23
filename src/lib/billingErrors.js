import PLAN_INFO from "./planInfo";

export const INSUFFICIENT_TOKENS_CODE = "INSUFFICIENT_TOKENS";
export const FREE_USAGE_ERROR_CODES = new Set([
  "FREE_DAILY_LIMIT_REACHED",
  "FREE_ROLLING_LIMIT_REACHED",
  "FREE_REQUEST_TOO_LARGE",
  "FREE_CONCURRENT_JOB_LIMIT",
  "FREE_FEATURE_REQUIRES_PRO",
  "FREE_MODEL_REQUIRES_PRO",
  "FREE_PRICING_NOT_CONFIGURED",
]);

const FREE_USAGE_MESSAGES = {
  FREE_DAILY_LIMIT_REACHED: "Daily Free usage reached. Your usage resets tomorrow, or you can upgrade to continue now.",
  FREE_ROLLING_LIMIT_REACHED: "You've reached the Free plan's fair-use limit. Upgrade to continue, or wait for usage to become available.",
  FREE_REQUEST_TOO_LARGE: "This request is larger than your remaining Free usage. Try generating the core script first, split the task into smaller steps, or upgrade to Pro.",
  FREE_CONCURRENT_JOB_LIMIT: "Free accounts can run one AI job at a time. Wait for the current job to finish.",
  FREE_FEATURE_REQUIRES_PRO: "This feature requires Pro.",
  FREE_MODEL_REQUIRES_PRO: "Premium model selection requires Pro. Upgrade to choose GPT, Claude, Gemini, Grok and other supported models.",
  FREE_PRICING_NOT_CONFIGURED: "Free usage is temporarily unavailable. Please try again later.",
};

export const DEFAULT_INSUFFICIENT_TOKENS_MESSAGE =
  "You're out of tokens. Upgrade to keep generating.";

export function isInsufficientTokensError(input) {
  if (!input) return false;
  const code = input.code || input.error || input.errorCode;
  if (code === INSUFFICIENT_TOKENS_CODE) return true;
  if (FREE_USAGE_ERROR_CODES.has(code)) return true;
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
    const code = payload.code || payload.error || INSUFFICIENT_TOKENS_CODE;
    return {
      code,
      message: FREE_USAGE_MESSAGES[code] || payload.message || DEFAULT_INSUFFICIENT_TOKENS_MESSAGE,
      retryable: false,
    };
  }
  return null;
}
