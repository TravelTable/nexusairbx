import React, { useEffect } from "react";
import CapabilityUnavailablePage from "../components/site/CapabilityUnavailablePage";
import {
  deactivateGenerationIntent,
  GENERATION_INTENT_MODES,
  getActiveGenerationIntentId,
  restoreGenerationIntent,
} from "../lib/generationIntent";

export default function IconGeneratorUnavailablePage() {
  useEffect(() => {
    const activeIntentId = getActiveGenerationIntentId();
    if (!activeIntentId) return;

    const activeIntent = restoreGenerationIntent(activeIntentId);
    if (activeIntent?.mode === GENERATION_INTENT_MODES.ASSET) {
      deactivateGenerationIntent(activeIntent.id);
    }
  }, []);

  return (
    <CapabilityUnavailablePage
      title="Icon generator unavailable"
      description="Asset generation is not enabled in this environment yet. You can keep building in the AI workspace or browse the existing icon market."
      pageTitle="Icon Generator Unavailable | NexusRBX"
    />
  );
}
