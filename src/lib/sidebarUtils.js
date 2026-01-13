// Normalize Firestore timestamp to ms
export const toMs = (t) =>
  t?.toMillis?.() ? t.toMillis() : +new Date(t) || Date.now();

// Utility: Safe filename for download
export const safeFile = (t) =>
  (t || "Script")
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40) + ".lua";

// Version string getter (always string)
export const getVersionStr = (v) =>
  String(v?.versionNumber ?? v?.version ?? v?.latestVersion ?? "");

// Stable key for scripts/versions
export const keyForScript = (s) => `${s.id}__${getVersionStr(s)}`;

// Utility: fromNow with ms support
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
export const fromNow = (ms) => {
  if (!ms || !Number.isFinite(ms)) return "—";
  const now = Date.now();
  const diff = ms - now;
  const mins = Math.round(diff / 60000);
  if (isFinite(mins) && Math.abs(mins) < 60) return rtf.format(mins, "minute");
  const hrs = Math.round(diff / 3600000);
  if (isFinite(hrs) && Math.abs(hrs) < 24) return rtf.format(hrs, "hour");
  const days = Math.round(diff / 86400000);
  if (isFinite(days)) return rtf.format(days, "day");
  return "—";
};
