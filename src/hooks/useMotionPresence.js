import { useEffect, useState } from "react";

export function useMotionPresence(open, duration = 180) {
  const [present, setPresent] = useState(open);
  const [phase, setPhase] = useState(open ? "enter" : "exit");

  useEffect(() => {
    if (open) {
      setPresent(true);
      if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        const frameId = window.requestAnimationFrame(() => setPhase("enter"));
        return () => window.cancelAnimationFrame(frameId);
      }
      setPhase("enter");
      return undefined;
    }

    setPhase("exit");
    const timeoutId = setTimeout(() => setPresent(false), duration);
    return () => clearTimeout(timeoutId);
  }, [duration, open]);

  return {
    present,
    phase,
    entering: phase === "enter",
    exiting: phase === "exit",
  };
}
