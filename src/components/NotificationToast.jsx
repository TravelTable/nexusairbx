import React, { useEffect, useRef, useState } from "react";

export default function NotificationToast({
  message,
  type = "info", // "info" | "success" | "error"
  duration = 4000,
  onClose,
}) {
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef();

  useEffect(() => {
    let start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const percent = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(percent);
      if (elapsed >= duration) {
        setLeaving(true);
        clearInterval(intervalRef.current);
        setTimeout(() => {
          if (onClose) onClose();
        }, 350);
      }
    }, 30);
    return () => clearInterval(intervalRef.current);
  }, [duration, onClose]);

  const handleClose = () => {
    setLeaving(true);
    clearInterval(intervalRef.current);
    setTimeout(() => {
      if (onClose) onClose();
    }, 350);
  };

  let color = "#9b5de5";
  if (type === "success") color = "#00f5d4";
  if (type === "error") color = "#ff3860";

  return (
    <div
      className={`relative min-w-[240px] max-w-xs px-5 py-4 rounded-lg shadow-xl border-l-4 bg-gray-900 text-white mb-4 transition-all duration-350 ease-in-out
        ${type === "success" ? "border-[#00f5d4]" : type === "error" ? "border-[#ff3860]" : "border-[#9b5de5]"}
        ${leaving ? "-translate-x-8 opacity-0" : "translate-x-0 opacity-100"}
        animate-fade-in
      `}
      style={{
        boxShadow: "0 6px 24px 0 rgba(0,0,0,0.25)",
        marginLeft: "8px",
      }}
    >
      <button
        className="absolute top-2 right-2 text-gray-400 hover:text-white text-lg font-bold focus:outline-none"
        onClick={handleClose}
        aria-label="Close notification"
        tabIndex={0}
      >
        ×
      </button>
      <div className="pr-6 text-base">{message}</div>
      <div
        className="absolute left-0 bottom-0 h-1 rounded-b-lg"
        style={{
          width: `${progress}%`,
          background: color,
          transition: "width 0.2s linear",
        }}
      />
    </div>
  );
}