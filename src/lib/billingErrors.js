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
  "INCLUDED_USAGE_LIMIT_REACHED",
  "INCLUDED_REQUEST_TOO_LARGE",
  "PREMIUM_BALANCE_INSUFFICIENT",
  "MODEL_REQUIRES_PREMIUM_BALANCE",
  "MODEL_PRICING_NOT_CONFIGURED",
  "PLAN_REQUIRED",
  "TEAM_SEAT_LIMIT_REACHED",
  "TEAM_BILLING_PERMISSION_REQUIRED",
]);

const FREE_USAGE_MESSAGES = {
  FREE_DAILY_LIMIT_REACHED: "Daily Free usage reached. Your usage resets tomorrow, or you can upgrade to continue now.",
  FREE_ROLLING_LIMIT_REACHED: "You've reached the Free plan's fair-use limit. Upgrade to continue, or wait for usage to become available.",
  FREE_REQUEST_TOO_LARGE: "This request is larger than your remaining Free usage. Try generating the core script first, split the task into smaller steps, or upgrade to Pro.",
  FREE_CONCURRENT_JOB_LIMIT: "Free accounts can run one AI job at a time. Wait for the current job to finish.",
  FREE_FEATURE_REQUIRES_PRO: "This feature requires Pro.",
  FREE_MODEL_REQUIRES_PRO: "Premium model selection requires Pro. Upgrade to choose GPT, Claude, Gemini, Grok and other supported models.",
  FREE_PRICING_NOT_CONFIGURED: "Free usage is temporarily unavailable. Please try again later.",
  INCLUDED_USAGE_LIMIT_REACHED: "Included usage reached. Continue with Premium Balance where supported, or wait until your usage resets.",
  INCLUDED_REQUEST_TOO_LARGE: "This request is larger than your remaining Included Usage. Reduce the request, choose Premium Balance where supported, or wait for the reset.",
  PREMIUM_BALANCE_INSUFFICIENT: "Your Premium Balance is too low for this request. Add funds, choose an included model, or reduce the request size.",
  MODEL_REQUIRES_PREMIUM_BALANCE: "This model uses Premium Balance. Add funds or choose an included model.",
  MODEL_PRICING_NOT_CONFIGURED: "This model is temporarily unavailable because usage pricing is not configured.",
  PLAN_REQUIRED: "This feature requires Starter or higher.",
  TEAM_SEAT_LIMIT_REACHED: "Team seat count must stay within the allowed seat limits.",
  TEAM_BILLING_PERMISSION_REQUIRED: "Only team owners or billing administrators can manage team billing.",
};

export const DEFAULT_INSUFFICIENT_TOKENS_MESSAGE =
  "Usage limit reached. Upgrade, add Premium Balance, or wait for your reset.";

const INFRASTRUCTURE_ERROR_CODES = new Set([
  "FIRESTORE_QUOTA_EXCEEDED",
  "SERVICE_CAPACITY_EXCEEDED",
]);

const INFRASTRUCTURE_ERROR_MESSAGES = {
  FIRESTORE_QUOTA_EXCEEDED:
    "Our database is temporarily busy. Please wait a moment and try again.",
  SERVICE_CAPACITY_EXCEEDED:
    "The AI service is temporarily at capacity. Please try again shortly.",
};

function looksLikeInfrastructureQuotaError(input) {
  const code = input?.code;
  if (INFRASTRUCTURE_ERROR_CODES.has(code)) return true;
  const message = String(input?.message || input?.error || input || "").toLowerCase();
  return message.includes("resource_exhausted") || message.includes("quota exceeded");
}

export function formatUserFacingError(input) {
  if (!input) return "Something went wrong. Please try again.";
  if (typeof input === "string") {
    if (looksLikeInfrastructureQuotaError({ message: input })) {
      return INFRASTRUCTURE_ERROR_MESSAGES.FIRESTORE_QUOTA_EXCEEDED;
    }
    return input;
  }
  const code = input?.code || input?.errorCode || null;
  if (INFRASTRUCTURE_ERROR_CODES.has(code)) {
    return INFRASTRUCTURE_ERROR_MESSAGES[code] || INFRASTRUCTURE_ERROR_MESSAGES.FIRESTORE_QUOTA_EXCEEDED;
  }
  if (looksLikeInfrastructureQuotaError(input)) {
    return INFRASTRUCTURE_ERROR_MESSAGES.FIRESTORE_QUOTA_EXCEEDED;
  }
  const parsed = parseApiErrorPayload(input);
  if (parsed?.message) return parsed.message;
  return String(input?.message || input?.error || DEFAULT_INSUFFICIENT_TOKENS_MESSAGE);
}

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
      label: key === "pro" || key === "pro_plus" ? "Add balance" : "View plans",
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
  if (INFRASTRUCTURE_ERROR_CODES.has(payload.code)) {
    return {
      code: payload.code,
      message: INFRASTRUCTURE_ERROR_MESSAGES[payload.code] || payload.message || formatUserFacingError(payload),
      retryable: payload.retryable !== false,
    };
  }
  if (looksLikeInfrastructureQuotaError(payload)) {
    return {
      code: "FIRESTORE_QUOTA_EXCEEDED",
      message: INFRASTRUCTURE_ERROR_MESSAGES.FIRESTORE_QUOTA_EXCEEDED,
      retryable: true,
    };
  }
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
