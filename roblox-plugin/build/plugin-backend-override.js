function parsePluginBackendUrl(rawValue) {
  const raw = String(rawValue || "").trim().replace(/\/+$/, "");
  if (!raw) return null;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("--backend-url must be a valid absolute URL");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && loopback)) {
    throw new Error("Plugin backend URLs must use HTTPS; HTTP is allowed only for localhost");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("Plugin backend URLs cannot contain credentials, a query, or a fragment");
  }
  return { url: raw, hostname: parsed.hostname.replace(/^\[|\]$/g, "") };
}

function applyPluginBackendOverride(source, rawValue) {
  const target = parsePluginBackendUrl(rawValue);
  if (!target) return source;
  const withUrl = String(source).replace(
    /^local BACKEND_URL = "[^"]+"/m,
    `local BACKEND_URL = ${JSON.stringify(target.url)}`
  );
  const output = withUrl.replace(
    /^local BACKEND_HOST = "[^"]+"/m,
    `local BACKEND_HOST = ${JSON.stringify(target.hostname)}`
  );
  if (output === source || !output.includes(`local BACKEND_URL = ${JSON.stringify(target.url)}`)) {
    throw new Error("Could not apply the plugin backend override to the bundled plugin");
  }
  return output;
}

module.exports = { applyPluginBackendOverride, parsePluginBackendUrl };

