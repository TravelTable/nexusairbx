import React, { useEffect, useRef, useState } from "react";

export default function AnimatedStatusText({ value, className = "" }) {
  const normalizedValue = String(value || "");
  const currentValueRef = useRef(normalizedValue);
  const cleanupTimerRef = useRef(null);
  const [display, setDisplay] = useState({
    current: normalizedValue,
    previous: "",
    revision: 0,
  });

  useEffect(() => {
    if (currentValueRef.current === normalizedValue) return undefined;

    const previous = currentValueRef.current;
    currentValueRef.current = normalizedValue;
    window.clearTimeout(cleanupTimerRef.current);
    setDisplay((state) => ({
      current: normalizedValue,
      previous,
      revision: state.revision + 1,
    }));
    cleanupTimerRef.current = window.setTimeout(() => {
      setDisplay((state) => (
        state.current === normalizedValue
          ? { ...state, previous: "" }
          : state
      ));
    }, 140);

    return () => window.clearTimeout(cleanupTimerRef.current);
  }, [normalizedValue]);

  useEffect(() => () => window.clearTimeout(cleanupTimerRef.current), []);

  return (
    <span
      className={`nexus-status-text ${className}`.trim()}
      aria-live="polite"
      aria-atomic="true"
    >
      {display.previous ? (
        <span className="nexus-status-text-out" aria-hidden="true">
          {display.previous}
        </span>
      ) : null}
      <span
        key={`${display.revision}-${display.current}`}
        className={display.previous ? "nexus-status-text-in" : ""}
      >
        {display.current}
      </span>
    </span>
  );
}
