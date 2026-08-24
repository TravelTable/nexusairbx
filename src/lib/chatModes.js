export const DEFAULT_CHAT_MODE = "agent";

export function normalizeChatMode(mode) {
  return String(mode || "").trim().toLowerCase() === "plan"
    ? "plan"
    : DEFAULT_CHAT_MODE;
}

export function formatChatModeLabel(mode) {
  switch (String(mode || "").trim().toLowerCase()) {
    case "agent":
    case "act":
    case "debug":
      return "Build";
    case "plan":
      return "Plan";
    case "ask":
      return "Read only";
    default:
      return "";
  }
}
