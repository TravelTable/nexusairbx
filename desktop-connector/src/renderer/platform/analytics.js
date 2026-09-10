// Desktop analytics are local, bounded diagnostics. No Firebase listener or
// analytics provider is initialized by an imported website component.
const events = [];
export function trackProductEvent(name) {
  events.push({ name: String(name).slice(0, 80), at: Date.now() });
  if (events.length > 100) events.shift();
  return Promise.resolve();
}
export function categorizePrompt() { return 'desktop'; }
export function getProductAnalyticsHeaders() { return {}; }
