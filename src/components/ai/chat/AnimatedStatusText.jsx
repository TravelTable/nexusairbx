import React, { useEffect, useState } from "react";
import { useMotionPresence } from "../../../hooks/useMotionPresence";

function StatusValue({ value, current, changed }) {
  const { present } = useMotionPresence(current, 180);
  if (!present) return null;
  return <span aria-hidden={!current || undefined} className={!current ? "nexus-status-text-out" : changed ? "nexus-status-text-in" : ""}>{value}</span>;
}

export default function AnimatedStatusText({ value, className = "", announce = true }) {
  const normalized = String(value || "");
  const [display, setDisplay] = useState({ current: normalized, previous: "" });
  useEffect(() => {
    setDisplay(previous => previous.current === normalized ? previous : { current: normalized, previous: previous.current });
  }, [normalized]);
  return <span className={`nexus-status-text ${className}`.trim()} aria-live={announce ? "polite" : undefined} aria-atomic="true">
    {display.previous ? <StatusValue key={display.previous} value={display.previous} current={false} /> : null}
    <StatusValue key={display.current} value={display.current} current changed={Boolean(display.previous)} />
  </span>;
}
