/**
 * Global Configuration for NexusRBX
 */

const isDev = process.env.NODE_ENV === "development";

const PRODUCTION_BACKEND_URL = "https://api.nexusrbx.com";
const LOCAL_BACKEND_URL = "http://localhost:5001";

function isLoopbackHostname(hostname) {
  const value = String(hostname || "")
    .trim()
    .toLowerCase();

  return (
    value === "localhost" ||
    value === "127.0.0.1" ||
    value === "::1" ||
    value === "[::1]"
  );
}

function cleanOrigin(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

function resolveBackendUrl() {
  const configured = cleanOrigin(
    process.env.REACT_APP_BACKEND_URL
  );

  // Explicit configuration always wins. The canonical local development
  // launcher supplies http://localhost:5001 here.
  if (configured) {
    return configured;
  }

  const browserIsLocal =
    typeof window !== "undefined"
      ? isLoopbackHostname(window.location.hostname)
      : isDev;

  // A development build accidentally exposed through a public hostname must
  // never start sending the user's API traffic to their own localhost.
  if (isDev && browserIsLocal) {
    return LOCAL_BACKEND_URL;
  }

  return PRODUCTION_BACKEND_URL;
}

export const BACKEND_URL =
  resolveBackendUrl();

export const STREAM_V2_ENABLED =
  process.env.REACT_APP_STREAM_V2 !== "false";

export const SHOW_RAW_REASONING =
  process.env.REACT_APP_SHOW_RAW_REASONING === "true";

export const SYSTEM_ONLY_PREMIUM_ENABLED =
  process.env.REACT_APP_SYSTEM_ONLY_PREMIUM === "true";

export const AI_PAGE_V2_ENABLED =
  process.env.REACT_APP_AI_PAGE_V2 !== "false";

export const CONFIG = {
  BACKEND_URL,
  IS_DEV: isDev,
  STREAM_V2_ENABLED,
  SHOW_RAW_REASONING,
  SYSTEM_ONLY_PREMIUM_ENABLED,
  AI_PAGE_V2_ENABLED,
};

export default CONFIG;
