export function getGravatarUrl(email, size = 40) {
  if (!email) return null;
  function fallbackMd5(str) {
    let hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
      chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
  const hash = fallbackMd5(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=${size}`;
}

export function getUserInitials(email) {
  if (!email) return "U";
  const parts = email.split("@")[0].split(/[._]/);
  return parts.map((p) => p[0]?.toUpperCase()).join("").slice(0, 2);
}

export function getExplanationBlocks(explanation = "") {
  if (!explanation.trim()) return [];
  return explanation
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const isBulletList = lines.length > 0 && lines.every((line) => /^[-*•]\s+/.test(line));
      const isNumberList = lines.length > 0 && lines.every((line) => /^\d+\.\s+/.test(line));
      if (isBulletList) {
        return { type: "list", ordered: false, items: lines.map((line) => line.replace(/^[-*•]\s+/, "")) };
      }
      if (isNumberList) {
        return { type: "list", ordered: true, items: lines.map((line) => line.replace(/^\d+\.\s+/, "")) };
      }
      if (lines.length === 1) {
        const line = lines[0];
        if (line.startsWith("#")) return { type: "header", text: line.replace(/^#+\s*/, "") };
        if (line.startsWith("**") && line.endsWith("**") && line.length < 60) return { type: "header", text: line.replace(/\*\*/g, "") };
        if (/^[A-Z][a-zA-Z ]+:$/.test(line)) return { type: "header", text: line };
      }
      return { type: "paragraph", text: block };
    });
}

export async function authedFetch(user, url, init = {}, retry = true) {
  let idToken = await user.getIdToken();
  let res = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${idToken}` },
    signal: init.signal,
  });
  if (res.status === 401 && retry) {
    await user.getIdToken(true);
    idToken = await user.getIdToken();
    res = await fetch(url, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${idToken}` },
      signal: init.signal,
    });
  }
  return res;
}

export async function pollJob(user, jobId, onTick, { signal, backendUrl }) {
  let delay = 1200;
  while (true) {
    if (signal?.aborted) throw new Error("Aborted");
    const res = await authedFetch(user, `${backendUrl}/api/jobs/${jobId}`, { method: "GET", signal });
    if (res.status === 429) {
      const ra = Number(res.headers.get("Retry-After")) || 2;
      await new Promise((r) => setTimeout(r, ra * 1000));
      continue;
    }
    const data = await res.json();
    onTick?.(data);
    if (data.status === "succeeded" || data.status === "failed") return data;
    
    // Use a local variable to avoid no-loop-func warning
    const currentDelay = delay;
    await new Promise((r) => setTimeout(r, currentDelay));
    delay = Math.min(delay + 300, 3000);
  }
}

export function safeGet(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export function safeSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export function getAiBubbleSizing(text = "") {
  const len = text.length;
  if (len < 240) return { wrapClass: "max-w-2xl", bubbleClass: "text-base px-5 py-4" };
  if (len < 1200) return { wrapClass: "max-w-3xl", bubbleClass: "text-[15px] leading-6 px-6 py-5" };
  return { wrapClass: "max-w-4xl", bubbleClass: "text-[14px] leading-7 px-7 py-6" };
}

export function formatNumber(n) {
  if (typeof n !== "number") return n;
  return n.toLocaleString();
}

export function formatResetDate(date) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export const toLocalTime = (ts) => {
  if (!ts) return "";
  const d = new Date(typeof ts === "number" ? ts : Date.parse(ts) || Date.now());
  return isNaN(d.getTime()) ? "" : d.toLocaleString();
};

export const safeFile = (title) =>
  ((title || "Script").replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").slice(0, 40) || "Script") + ".lua";
