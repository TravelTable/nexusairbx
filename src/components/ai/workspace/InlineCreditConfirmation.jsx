import React, { useEffect, useId, useRef } from "react";
import { useMotionPresence } from "../../../hooks/useMotionPresence";

export default function InlineCreditConfirmation({ confirmation, onResolve }) {
  const { present, phase } = useMotionPresence(Boolean(confirmation), 200);
  const last = useRef(confirmation);
  if (confirmation) last.current = confirmation;
  const cancelRef = useRef(null);
  const panelRef = useRef(null);
  const titleId = useId(), descriptionId = useId();
  useEffect(() => {
    if (!confirmation) return undefined;
    const previous = document.activeElement;
    const panel = panelRef.current;
    const frame = requestAnimationFrame(() => cancelRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      if (panel?.contains(document.activeElement) && previous?.isConnected) requestAnimationFrame(() => previous.focus());
    };
  }, [confirmation]);
  if (!present || !last.current) return null;
  return <section ref={panelRef} className="nx-credit-confirmation nx-presence" data-phase={phase}
    role="dialog" aria-modal="false" aria-labelledby={titleId} aria-describedby={descriptionId}
    inert={!confirmation ? "" : undefined}
    onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onResolve(false); } }}>
    <h2 id={titleId}>{last.current.title}</h2>
    <p id={descriptionId}>{last.current.description}</p>
    <div className="nx-credit-confirmation__actions">
      <button ref={cancelRef} type="button" onClick={() => onResolve(false)}>Cancel</button>
      <button type="button" className="nx-credit-confirmation__continue" onClick={() => onResolve(true)}>Continue</button>
    </div>
  </section>;
}
