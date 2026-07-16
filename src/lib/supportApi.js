import { authedFetch } from "./billing";

const IDEMPOTENCY_PREFIX = "nexusrbx:support-create:";

function randomId() {
  if (typeof window !== "undefined" && typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `support-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

function requestFingerprint(body) {
  const input = `${body?.category || ""}|${body?.subject || ""}|${body?.message || ""}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function getCreationKey(body) {
  const storageKey = `${IDEMPOTENCY_PREFIX}${requestFingerprint(body)}`;
  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) return { key: existing, storageKey };
    const next = randomId();
    window.sessionStorage.setItem(storageKey, next);
    return { key: next, storageKey };
  } catch (_) {
    return { key: randomId(), storageKey: null };
  }
}

async function request(path, init = {}) {
  const response = await authedFetch(path, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || payload?.message || "Support request failed.");
    error.status = response.status;
    error.code = payload?.error?.code || payload?.code || "SUPPORT_REQUEST_FAILED";
    throw error;
  }
  return payload;
}

function queryString(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  });
  const value = params.toString();
  return value ? `?${value}` : "";
}

function notifyUnreadChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("nexusrbx:support-unread-changed"));
  }
}

export async function createSupportTicket(input) {
  const body = {
    category: input.category,
    subject: input.subject,
    message: input.message,
  };
  const creation = input.idempotencyKey
    ? { key: input.idempotencyKey, storageKey: null }
    : getCreationKey(body);
  const payload = await request("/api/support/tickets", {
    method: "POST",
    headers: { "Idempotency-Key": creation.key },
    body: JSON.stringify(body),
  });
  if (creation.storageKey) {
    try {
      window.sessionStorage.removeItem(creation.storageKey);
    } catch (_) {
      // A completed request remains valid when storage is unavailable.
    }
  }
  return payload;
}

export function listSupportTickets(filters) {
  return request(`/api/support/tickets${queryString(filters)}`);
}

export function getSupportTicket(ticketId) {
  return request(`/api/support/tickets/${encodeURIComponent(ticketId)}`);
}

export function replyToSupportTicket(ticketId, message) {
  return request(`/api/support/tickets/${encodeURIComponent(ticketId)}/replies`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function markSupportTicketRead(ticketId) {
  const payload = await request(`/api/support/tickets/${encodeURIComponent(ticketId)}/mark-read`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  notifyUnreadChanged();
  return payload;
}

export function closeSupportTicket(ticketId) {
  return request(`/api/support/tickets/${encodeURIComponent(ticketId)}/close`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function reopenSupportTicket(ticketId) {
  return request(`/api/support/tickets/${encodeURIComponent(ticketId)}/reopen`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getSupportUnreadCount() {
  const payload = await request("/api/support/tickets/unread-count");
  return Math.max(0, Number(payload?.unreadCount || 0));
}

export function listAdminSupportTickets(filters) {
  return request(`/api/admin/support/tickets${queryString(filters)}`);
}

export function getAdminSupportTicket(ticketId) {
  return request(`/api/admin/support/tickets/${encodeURIComponent(ticketId)}`);
}

export function adminReplyToSupportTicket(ticketId, message) {
  return request(`/api/admin/support/tickets/${encodeURIComponent(ticketId)}/replies`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function addSupportInternalNote(ticketId, message) {
  return request(`/api/admin/support/tickets/${encodeURIComponent(ticketId)}/internal-notes`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function updateSupportTicketStatus(ticketId, status) {
  return request(`/api/admin/support/tickets/${encodeURIComponent(ticketId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function updateSupportTicketPriority(ticketId, priority) {
  return request(`/api/admin/support/tickets/${encodeURIComponent(ticketId)}/priority`, {
    method: "PATCH",
    body: JSON.stringify({ priority }),
  });
}

export function setSupportAgentRole(uid, enabled) {
  return request(`/api/security/support-agents/${encodeURIComponent(uid)}`, {
    method: "PUT",
    body: JSON.stringify({ enabled: Boolean(enabled) }),
  });
}
