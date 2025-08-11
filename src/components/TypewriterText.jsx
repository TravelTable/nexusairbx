import React, { useEffect, useRef, useState } from "react";

/**
 * TypewriterText
 * Props:
 * - text: string (the text to animate)
 * - className: string (optional, for styling)
 * - speed: number (ms per character, default 24)
 * - instant: boolean (if true, show instantly, no animation)
 * - onDone: function (optional, called when animation finishes)
 */
export default function TypewriterText({
  text = "",
  className = "",
  speed = 24,
  instant = false,
  onDone
}) {
  const [displayed, setDisplayed] = useState(instant ? text : "");
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (instant) {
      setDisplayed(text);
      if (onDone) onDone();
      return;
    }
    let idx = 0;
    setDisplayed("");
    function type() {
      setDisplayed(text.slice(0, idx + 1));
      idx++;
      if (idx < text.length) {
        timeoutRef.current = setTimeout(type, speed + Math.floor(Math.random() * 16));
      } else if (onDone) {
        onDone();
      }
    }
    type();
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line
  }, [text, instant]);

  return (
    <span className={className} aria-live="polite">
      {displayed}
      <span className="inline-block w-2 h-5 align-middle animate-pulse bg-[#9b5de5] rounded ml-1" style={{ opacity: displayed.length < text.length ? 0.7 : 0 }}></span>
    </span>
  );
}