import React, { useState } from "react";
import Modal from "./Modal";
import { ThumbsUp, ThumbsDown } from "lucide-react";

export default function FeedbackModal({ onClose, onSubmit }) {
  const [rating, setRating] = useState(null);
  const [feedback, setFeedback] = useState("");
  return (
    <Modal onClose={onClose} title="Rate this Script">
      <div className="flex items-center mb-4">
        <button
          className={`mr-2 p-2 rounded-full ${rating === 1 ? "bg-green-600" : "bg-gray-800"}`}
          onClick={() => setRating(1)}
          aria-label="Thumbs up"
        >
          <ThumbsUp className="h-6 w-6" />
        </button>
        <button
          className={`p-2 rounded-full ${rating === 0 ? "bg-red-600" : "bg-gray-800"}`}
          onClick={() => setRating(0)}
          aria-label="Thumbs down"
        >
          <ThumbsDown className="h-6 w-6" />
        </button>
      </div>
      <textarea
        className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 mb-4 text-white"
        value={feedback}
        onChange={e => setFeedback(e.target.value)}
        placeholder="Optional feedback"
        rows={2}
      />
      <button
        className={`w-full py-3 rounded-lg font-bold transition-all duration-300 ${
          rating !== null
            ? "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white hover:shadow-lg"
            : "bg-gray-700 text-gray-400 cursor-not-allowed"
        }`}
        onClick={() => {
          if (rating !== null) onSubmit(rating, feedback);
        }}
        disabled={rating === null}
      >
        Submit Feedback
      </button>
    </Modal>
  );
}