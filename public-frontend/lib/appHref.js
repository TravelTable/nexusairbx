const LOCAL_APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3000").replace(/\/+$/, "");

const APP_EXACT = new Set([
  "/signin",
  "/signup",
  "/settings",
  "/billing",
  "/subscribe",
  "/contact",
  "/onboarding",
  "/connect-roblox",
  "/forgot-password",
  "/verify-email",
]);

const APP_PREFIXES = ["/ai", "/assets", "/icons-market", "/support"];

function isPublicAppPath(href) {
  const path = String(href || "").split(/[?#]/)[0];
  if (APP_EXACT.has(path)) return true;
  return APP_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function resolvePublicAppHref(href) {
  if (process.env.NODE_ENV !== "development" || !isPublicAppPath(href)) return href;
  return `${LOCAL_APP_ORIGIN}${href}`;
}

function mapPublicNav(items) {
  return items.map((item) => ({ ...item, href: resolvePublicAppHref(item.href) }));
}

function mapPublicNavSections(sections) {
  return sections.map((section) => ({
    ...section,
    items: mapPublicNav(section.items),
  }));
}

module.exports = {
  isPublicAppPath,
  resolvePublicAppHref,
  mapPublicNav,
  mapPublicNavSections,
};
