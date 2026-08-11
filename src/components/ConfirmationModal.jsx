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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="nexus-page-card w-full max-w-md p-6" role="alertdialog" aria-modal="true" aria-labelledby="confirmation-modal-title">
        <h3 id="confirmation-modal-title" className="mb-2 font-display text-xl font-bold text-destructive">{title}</h3>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{message}</p>

        <div className="mb-6">
          <label className="nexus-field-label mb-2">
            Type{" "}
            <span className="select-all rounded-md border border-border bg-muted px-1.5 py-0.5 text-foreground">
              {warningKeyword}
            </span>{" "}
            to confirm
          </label>
          <input
            type="text"
            className="nexus-input focus:border-destructive/70 focus-visible:ring-destructive/50"
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
