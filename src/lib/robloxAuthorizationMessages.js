const CAPABILITY_COPY = {
  roblox_upload_asset: "upload assets to Roblox",
  roblox_search_creator_store: "search the Creator Store",
  roblox_get_asset: "read Roblox asset details",
  roblox_get_connection: "connect your Roblox account",
};

export function describeRobloxCapabilities(capabilityIds = []) {
  const labels = capabilityIds
    .map((id) => CAPABILITY_COPY[id] || null)
    .filter(Boolean);
  if (!labels.length) return "use Roblox features in NexusRBX";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

export function robloxAuthorizationHeadline({
  connected = false,
  upgradeRequired = false,
  capabilityIds = [],
} = {}) {
  if (upgradeRequired) return "Your Roblox connection needs a one-time permission upgrade.";
  if (!connected) return "Connect Roblox once to search the Creator Store and upload assets from NexusRBX.";
  return `Roblox needs additional permission to ${describeRobloxCapabilities(capabilityIds)}.`;
}

export function robloxAuthorizationBody({
  connected = false,
  upgradeRequired = false,
  capabilityIds = [],
} = {}) {
  if (upgradeRequired) {
    return "We will keep your selected creator and return you to this page after the upgrade.";
  }
  if (!connected) {
    return "Authorize once to unlock Creator Store search and asset uploads without repeated prompts.";
  }
  return `Continue with Roblox to grant access needed to ${describeRobloxCapabilities(capabilityIds)}.`;
}

export function formatRobloxErrorMessage(error) {
  if (!error) return "Roblox request failed.";
  if (typeof error === "string") return error;
  const code = String(error.code || "").trim();
  if (code === "ROBLOX_REAUTHORIZATION_REQUIRED" || code === "CREATOR_STORE_REAUTHORIZATION_REQUIRED") {
    return "Your Roblox connection needs updated permissions.";
  }
  if (code === "ROBLOX_NOT_CONNECTED") return "Connect Roblox to continue.";
  if (code === "ROBLOX_CREATOR_REQUIRED") return "Choose a Roblox creator target in Settings.";
  if (code === "ROBLOX_THUMBNAIL_PENDING") return "Roblox is still generating this preview.";
  if (code === "ROBLOX_THUMBNAIL_UNAVAILABLE") return "No Roblox preview is available for this asset.";
  return error.message || error.error || "Roblox request failed.";
}
