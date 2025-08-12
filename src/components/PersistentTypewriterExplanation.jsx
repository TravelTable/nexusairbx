import React, { useState, useEffect, useRef } from "react";

export default function PersistentTypewriterExplanation({
  text,
  speed = 40,
  scriptId,
  className = "",
  as = "div",
}) {
  const [finished, setFinished] = useState(() => {
    if (!scriptId) return false;
    return localStorage.getItem(`typewriter_finished_${scriptId}`) === "1";
  });
  const [displayed, setDisplayed] = useState(finished ? text : "");
  const words = text ? text.split(" ") : [];
  const indexRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (finished) {
      setDisplayed(text || "");
      return;
    }
    setDisplayed("");
    indexRef.current = 0;
    if (!text) return;

    function type() {
      if (indexRef.current < words.length) {
        setDisplayed((prev) =>
          prev
            ? prev + " " + words[indexRef.current]
            : words[indexRef.current]
        );
        indexRef.current += 1;
        timeoutRef.current = setTimeout(type, speed);
      } else {
        setFinished(true);
        if (scriptId) {
          localStorage.setItem(`typewriter_finished_${scriptId}`, "1");
        }
      }
    }
    type();

    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, [text, speed, finished, scriptId]);

  const Tag = as;
  return (
    <Tag className={className} aria-label={text}>
      {displayed}
      <span className="inline-block w-2 animate-blink" style={{ color: "#9b5de5" }}>
        {!finished && displayed.length < (text?.length || 0) ? "|" : ""}
      </span>
    </Tag>
  );
}