import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import useUiReferencePreview from "./useUiReferencePreview";
import { describeReferenceMode } from "../../../lib/uiReferenceSession";
import "./UiCreatorLanding.css";

export default function UiReferencePin({ mode = "replicate", image = null, onView }) {
  const src = useUiReferencePreview(image);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!image && !src) return null;
  const label = image?.alt || image?.name || "Reference screenshot";

  return (
    <>
      <div className="uc-reference-pin" aria-label="Pinned reference">
        <span className="uc-reference-pin__mark" aria-hidden="true">
          <img src={src} alt="" />
        </span>
        <span className="uc-reference-pin__copy">
          Reference · {describeReferenceMode(mode)}
        </span>
        <button
          type="button"
          className="uc-reference-pin__view"
          onClick={() => {
            setOpen(true);
            onView?.();
          }}
        >
          View
        </button>
      </div>
      {open ? (
        <div
          className="uc-reference-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Reference screenshot"
        >
          <button
            type="button"
            className="uc-reference-lightbox__close"
            aria-label="Close reference"
            onClick={() => setOpen(false)}
          >
            <X size={16} />
          </button>
          <img src={src} alt={label} />
        </div>
      ) : null}
    </>
  );
}
