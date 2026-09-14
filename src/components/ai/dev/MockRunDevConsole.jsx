import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripVertical, X } from "lucide-react";
import "./MockRunDevConsole.css";

export default function MockRunDevConsole({
  open,
  onOpenChange,
  enabled,
  onEnabledChange,
  playing,
  scenarios = [],
  activeScenarioId = "",
  onPlay,
  onStop,
}) {
  const panelRef = useRef(null);
  const drag = useRef(null);
  const [offset, setOffset] = useState({ x: 24, y: 88 });

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onOpenChange?.(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const onPointerDown = useCallback((event) => {
    if (event.button !== 0) return;
    const panel = panelRef.current;
    if (!panel) return;
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [offset.x, offset.y]);

  const onPointerMove = useCallback((event) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const maxX = Math.max(8, window.innerWidth - (panelRef.current?.offsetWidth || 280) - 8);
    const maxY = Math.max(8, window.innerHeight - (panelRef.current?.offsetHeight || 200) - 8);
    setOffset({
      x: Math.min(maxX, Math.max(8, state.originX + (event.clientX - state.startX))),
      y: Math.min(maxY, Math.max(8, state.originY + (event.clientY - state.startY))),
    });
  }, []);

  const onPointerUp = useCallback((event) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }, []);

  if (!open) return null;

  return createPortal(
    <aside
      ref={panelRef}
      className="mock-run-console"
      style={{ left: offset.x, top: offset.y }}
      role="dialog"
      aria-label="Mock run developer console"
      data-testid="mock-run-dev-console"
    >
      <header
        className="mock-run-console__header"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="mock-run-console__grip" aria-hidden="true"><GripVertical size={14} /></span>
        <strong>Mock runs</strong>
        <button type="button" className="mock-run-console__icon" aria-label="Close mock run console" onClick={() => onOpenChange?.(false)}>
          <X size={14} />
        </button>
      </header>

      <label className="mock-run-console__toggle">
        <input
          type="checkbox"
          checked={Boolean(enabled)}
          onChange={(event) => onEnabledChange?.(event.target.checked)}
        />
        <span>Mock mode (no API calls)</span>
      </label>

      {enabled ? (
        <div className="mock-run-console__body">
          <p className="mock-run-console__hint">Uses the same loading presentation as production.</p>
          <div className="mock-run-console__actions">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                className="mock-run-console__button"
                data-active={activeScenarioId === scenario.id && playing ? "true" : undefined}
                disabled={playing && activeScenarioId !== scenario.id}
                onClick={() => onPlay?.(scenario.id)}
                title={scenario.description}
              >
                {playing && activeScenarioId === scenario.id ? `Playing · ${scenario.label}` : scenario.label}
              </button>
            ))}
            <button type="button" className="mock-run-console__button mock-run-console__button--quiet" disabled={!playing} onClick={() => onStop?.()}>
              Stop / reset
            </button>
          </div>
        </div>
      ) : (
        <p className="mock-run-console__hint">Turn on mock mode to replay loading UI without calling the API. Real requests work while this is off.</p>
      )}
    </aside>,
    document.body
  );
}
