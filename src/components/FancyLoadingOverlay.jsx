import React, { useEffect, useState } from "react";

const STATUS_MESSAGES = [
  "Analyzing prompt…",
  "Searching resources…",
  "Generating outline…",
  "Consulting AI models…",
  "Polishing results…",
  "Finalizing output…",
];

export default function FancyLoadingOverlay({ visible }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!visible) {
      setIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 5000); // 5 seconds per message
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="flex items-center justify-center mb-4">
      <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-gray-900/90 border border-[#9b5de5] shadow-lg animate-fade-in">
        <span className="w-5 h-5 mr-2 relative flex items-center justify-center">
          <span className="absolute w-5 h-5 rounded-full border-2 border-[#9b5de5] border-t-transparent animate-spin"></span>
        </span>
        <span className="text-base font-medium text-[#9b5de5] animate-blink">
          {STATUS_MESSAGES[index]}
        </span>
      </div>
    </div>
  );
}