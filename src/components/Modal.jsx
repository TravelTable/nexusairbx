import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function Modal({ onClose, title, children, isOpen = true }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    
    // Focus trapping logic could be added here or via a library like react-focus-lock
    
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
            className="bg-[#0b1220] border border-white/10 rounded-2xl p-8 shadow-2xl w-full max-w-lg relative mx-4"
          >
            <button
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/5 transition-colors group"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-gray-500 group-hover:text-white transition-colors" />
            </button>
            <h2 id="modal-title" className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              {title}
            </h2>
            <div className="text-gray-300">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
