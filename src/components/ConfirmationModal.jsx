import React, { useState, useEffect } from "react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-xl font-bold text-red-500 mb-2">{title}</h3>
        <p className="text-gray-300 mb-4 text-sm">{message}</p>

        <div className="mb-6">
          <label className="block text-gray-400 text-xs uppercase font-bold mb-2">
            Type{" "}
            <span className="text-white bg-gray-700 px-1 rounded select-all">
              {warningKeyword}
            </span>{" "}
            to confirm
          </label>
          <input
            type="text"
            className="w-full bg-black border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-red-500 transition-colors"
            placeholder={`Type "${warningKeyword}"`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!isMatch}
            className={`px-4 py-2 rounded font-bold transition-all ${
              isMatch
                ? "bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-lg shadow-red-900/50"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            Delete Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
