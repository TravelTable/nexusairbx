import React, { useEffect, useRef, useState } from "react";

/**
 * TypewriterEffect
 * Props:
 * - text: string (required)
 * - speed: number (ms per word, default 30)
 * - onDone: function (optional, called when typing is finished)
 * - className: string (optional)
 * - as: string (optional, element type, default "span")
 */
export default function TypewriterEffect({
  text = "",
  speed = 30,
  onDone,
  className = "",
  as: Tag = "span",
}) {
  const [displayed, setDisplayed] = useState("");
  const words = text ? text.split(" ") : [];
  const indexRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setDisplayed("");
    indexRef.current = 0;
    if (!text) {
      if (onDone) onDone();
      return;
    }

    let cancelled = false;

    function type() {
      if (cancelled) return;
      if (indexRef.current < words.length) {
        setDisplayed((prev) =>
          prev
            ? prev + " " + words[indexRef.current]
            : words[indexRef.current]
        );
        indexRef.current += 1;
        timeoutRef.current = setTimeout(type, speed);
      } else {
        if (onDone) onDone();
      }
    }
    type();

    return () => {
      cancelled = true;
      clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line
  }, [text, speed]);

  return (
    <Tag className={className}>
      {displayed}
      <span className="animate-blink">|</span>
    </Tag>
  );
}