import React, { useEffect, useState } from "react";
import { authedFetch } from "../../lib/billing";
import { useNexusAutoPreferences } from "../../hooks/useNexusAutoPreferences";
import ModelRoutingNotice from "./ModelRoutingNotice";

export default function ModelRequestEstimate({ prompt, model, projectId, requestCategory = "coding", contextChars = 0, enabled = true }) {
  const { autoPreferences } = useNexusAutoPreferences();
  const [state, setState] = useState(null);
  useEffect(() => {
    setState(null);
    if (!enabled || !String(prompt || "").trim()) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await authedFetch("/api/models/estimate", { method: "POST", signal: controller.signal,
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: model || "nexus-free-auto", projectId,
            autoPreferences, request: { prompt: String(prompt).slice(0, 16000), requestCategory,
              estimatedInputTokens: Math.max(1, Math.ceil((String(prompt).length + contextChars) / 3) + 1024), maxOutputTokens: 8000 } }) });
        const result = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) throw new Error(result.error?.message || result.error || result.message || "Model estimate is unavailable.");
        setState({ quote: result });
      } catch (error) { if (!controller.signal.aborted) setState({ error: error.message }); }
    }, 650);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [prompt, model, projectId, autoPreferences, requestCategory, contextChars, enabled]);
  if (state?.error) return <p className="px-4 py-2 text-xs text-[var(--nx-text-muted)]" role="status">{state.error}</p>;
  const quote = state?.quote;
  if (!quote) return null;
  const routing = quote.modelRouting || (quote.autoSelected ? quote : null);
  if (routing) return <ModelRoutingNotice routing={routing} preview />;
  const credits = quote.estimatedCredits;
  return credits ? <p className="px-4 py-2 text-xs text-[var(--nx-text-muted)]" role="status">
    {quote.modelName || "Selected model"} · Estimated usage: {credits.min}–{credits.max} credits for the starting request.
  </p> : null;
}
