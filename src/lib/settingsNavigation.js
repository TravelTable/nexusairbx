export function resolveSettingsTab({
  allowedTabs = [],
  requestedTab,
  currentTab,
  fallbackTab,
} = {}) {
  const allowed = new Set(allowedTabs.filter(Boolean));
  if (allowed.size === 0) return null;
  if (requestedTab && allowed.has(requestedTab)) return requestedTab;
  if (currentTab && allowed.has(currentTab)) return currentTab;
  if (fallbackTab && allowed.has(fallbackTab)) return fallbackTab;
  return allowed.values().next().value || null;
}
