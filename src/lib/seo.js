export const PUBLIC_SITE_ORIGIN = "https://www.nexusrbx.com";
export const DEFAULT_OG_IMAGE = `${PUBLIC_SITE_ORIGIN}/logo.png`;
export const SITE_NAME = "NexusRBX";

export function canonicalUrl(pathname = "/") {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return normalized === "/" ? `${PUBLIC_SITE_ORIGIN}/` : `${PUBLIC_SITE_ORIGIN}${normalized.replace(/\/+$/, "")}`;
}

export function absoluteUrl(pathnameOrUrl = "/") {
  const value = String(pathnameOrUrl || "/");
  if (/^https?:\/\//i.test(value)) return value;
  return canonicalUrl(value);
}

export function buildPublicMetadata({
  title,
  description,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  noindex = false,
  type = "website",
} = {}) {
  const canonical = canonicalUrl(path);
  const resolvedTitle = title || SITE_NAME;
  const resolvedDescription =
    description || "NexusRBX helps Roblox creators generate Luau scripts, UI systems, and Studio-ready workflows with AI.";

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    alternates: noindex ? undefined : { canonical },
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type,
      siteName: SITE_NAME,
      title: resolvedTitle,
      description: resolvedDescription,
      url: canonical,
      images: [{ url: absoluteUrl(image), width: 1200, height: 630, alt: `${SITE_NAME} preview` }],
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: resolvedDescription,
      images: [absoluteUrl(image)],
    },
  };
}

export function organizationStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: PUBLIC_SITE_ORIGIN,
    logo: absoluteUrl("/logo.png"),
    sameAs: ["https://github.com/TravelTable/nexusairbx"],
  };
}

export function softwareApplicationStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    description: "AI-powered Roblox script generation, UI building, and Studio workflow tooling.",
    offers: {
      "@type": "Offer",
      price: "14.99",
      priceCurrency: "USD",
    },
  };
}

export function docsStructuredData({ path = "/docs", title = "NexusRBX Documentation" } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    url: canonicalUrl(path),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: PUBLIC_SITE_ORIGIN,
    },
  };
}
