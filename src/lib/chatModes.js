export const DEFAULT_CHAT_MODE = "agent";

export function normalizeChatMode(mode) {
  const normalized = String(mode || "")
    .trim()
    .toLowerCase();
  if (normalized === "plan" || normalized === "ask") return normalized;
  return DEFAULT_CHAT_MODE;
}

export function formatChatModeLabel(mode) {
  switch (
    String(mode || "")
      .trim()
      .toLowerCase()
  ) {
    case "agent":
    case "act":
    case "debug":
      return "Agent";
    case "plan":
      return "Plan";
    case "ask":
      return "Ask";
    default:
      return "";
  }
}
