const STORAGE_KEY = "nexusrbx:starter_promo_dismissed_at";
const SNOOZE_MS = 24 * 60 * 60 * 1000;
const LONG_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

export function getStarterPromoDismissedAt() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function isStarterPromoSnoozed({ now = Date.now() } = {}) {
  const dismissedAt = getStarterPromoDismissedAt();
  if (!dismissedAt) return false;
  const kind = window.localStorage.getItem(`${STORAGE_KEY}:kind`) || "short";
  const ttl = kind === "long" ? LONG_SNOOZE_MS : SNOOZE_MS;
  return now - dismissedAt < ttl;
}

export function dismissStarterPromo(kind = "short") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
  window.localStorage.setItem(`${STORAGE_KEY}:kind`, kind === "long" ? "long" : "short");
}

export function clearStarterPromoDismissal() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(`${STORAGE_KEY}:kind`);
}

export function getChatRetentionDays(plan, limits = null) {
  if (limits?.chatRetentionDays != null) return limits.chatRetentionDays;
  const normalized = String(plan || "FREE").toUpperCase();
  if (normalized === "FREE" || normalized === "ANON") return 7;
  if (normalized === "STARTER") return 30;
  return null;
}

export function filterChatsByRetention(chats = [], retentionDays = null, now = Date.now()) {
  if (!retentionDays || retentionDays <= 0) return chats;
  const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
  return chats.filter((chat) => {
    const updatedAt = chat?.updatedAt?.toMillis?.()
      ?? chat?.updatedAt?.getTime?.()
      ?? (typeof chat?.updatedAt === "number" ? chat.updatedAt : 0);
    return updatedAt >= cutoff;
  });
}

export function countHiddenChats(chats = [], retentionDays = null, now = Date.now()) {
  if (!retentionDays) return 0;
  const visible = filterChatsByRetention(chats, retentionDays, now);
  return Math.max(0, chats.length - visible.length);
}
