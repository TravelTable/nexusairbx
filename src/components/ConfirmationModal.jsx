import React, { useState, useEffect } from "react";
import { Button } from "./ui";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  warningKeyword = "CONFIRM",
}) => {
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (isOpen) {
      setInputValue("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isMatch = inputValue === warningKeyword;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="nexus-page-card max-w-md w-full p-6">
        <h3 className="font-display text-xl font-bold text-red-300 mb-2">{title}</h3>
        <p className="text-gray-300 mb-4 text-sm leading-relaxed">{message}</p>

        <div className="mb-6">
          <label className="nexus-field-label mb-2">
            Type{" "}
            <span className="rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 text-white select-all">
              {warningKeyword}
            </span>{" "}
            to confirm
          </label>
          <input
            type="text"
            className="nexus-input focus:border-red-400/70 focus-visible:ring-red-400/50"
            placeholder={`Type "${warningKeyword}"`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={!isMatch}
          >
            Delete Data
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
