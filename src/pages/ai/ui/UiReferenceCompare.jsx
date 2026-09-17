import React from "react";

export default function UiReferenceCompare({
  generatedSrc,
  referenceSrc,
  generatedAlt = "Generated UI",
  referenceAlt = "Uploaded UI reference",
  position = 50,
  onPosition,
}) {
  return (
    <div className="uc-compare" style={{ "--uc-compare": `${position}%` }}>
      <div className="uc-compare__stage">
        <img
          className="uc-compare__generated"
          src={generatedSrc}
          alt={generatedAlt}
          draggable="false"
        />
        <img
          className="uc-compare__reference"
          src={referenceSrc}
          alt={referenceAlt}
          draggable="false"
        />
        <div className="uc-compare__rule" aria-hidden="true" />
        <span className="uc-compare__label uc-compare__label--left">Reference</span>
        <span className="uc-compare__label uc-compare__label--right">Generated</span>
      </div>
      <label className="uc-compare__slider">
        <span className="nx-ui-preview__sr">Compare reference and generated</span>
        <input
          type="range"
          min="0"
          max="100"
          value={position}
          aria-label="Compare reference and generated"
          onChange={(event) => onPosition?.(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
