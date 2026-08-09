import React from "react";

import CapabilityUnavailablePage from "../components/site/CapabilityUnavailablePage";

const COPY = {
  library: {
    title: "Asset library unavailable",
    description: "The asset library is not enabled in this environment yet. Your route is valid, and you can keep building in the AI workspace or browse the existing icon market.",
  },
  detail: {
    title: "Asset details unavailable",
    description: "Asset details are not enabled in this environment yet. Your link is valid, and you can keep building in the AI workspace or browse the existing icon market.",
  },
};

export default function AssetPlatformUnavailablePage({ view = "library" }) {
  const copy = COPY[view] || COPY.library;
  return (
    <CapabilityUnavailablePage
      title={copy.title}
      description={copy.description}
      pageTitle={`${copy.title} | NexusRBX`}
    />
  );
}
