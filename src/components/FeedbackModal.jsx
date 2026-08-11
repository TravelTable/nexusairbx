import React, { useState } from "react";
import Modal from "./Modal";
import { ThumbsUp, ThumbsDown } from "lib/icons";
import { Button, cx } from "./ui";

export default function FeedbackModal({ onClose, onSubmit }) {
  const [rating, setRating] = useState(null);
  const [feedback, setFeedback] = useState("");
  return (
    <Modal onClose={onClose} title="Rate this Script">
      <div className="flex items-center mb-4">
        <button
          className={cx(
            "mr-2 nexus-icon-button rounded-full",
            rating === 1 &&
              "border-[var(--ds-success-border)] bg-[var(--ds-success-soft)] text-[var(--ds-success)]"
          )}
          onClick={() => setRating(1)}
          aria-label="Thumbs up"
        >
          <ThumbsUp className="h-6 w-6" />
        </button>
        <button
          className={cx(
            "nexus-icon-button rounded-full",
            rating === 0 &&
              "border-[var(--ds-danger-border)] bg-[var(--ds-danger-soft)] text-[var(--ds-danger)]"
          )}
          onClick={() => setRating(0)}
          aria-label="Thumbs down"
        >
          <ThumbsDown className="h-6 w-6" />
        </button>
      </div>
      <textarea
        className="nexus-textarea mb-4"
        value={feedback}
        onChange={e => setFeedback(e.target.value)}
        placeholder="Optional feedback"
        rows={2}
      />
      <Button
        className="w-full"
        onClick={() => {
          if (rating !== null) onSubmit(rating, feedback);
        }}
        disabled={rating === null}
      >
        Submit Feedback
      </Button>
    </Modal>
  );
}
