"use client";

import { track } from "@vercel/analytics";

export default function LandingAnalyticsLink({ href, label, slug, category, className = "" }) {
  const handleClick = async () => {
    const payload = {
      landing_page: `/${slug}`,
      landing_page_category: category,
      destination: href,
      link_label: label,
    };
    track("internal_tool_link_clicked", payload);
    try {
      const { trackProductEvent } = await import("../../src/lib/productAnalytics");
      await trackProductEvent("internal_tool_link_clicked", payload);
    } catch (_) {
      // Best-effort central analytics bridge.
    }
  };

  return (
    <a className={className} href={href} onClick={handleClick}>
      {label}
    </a>
  );
}
