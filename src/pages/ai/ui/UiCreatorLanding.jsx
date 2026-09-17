import React, { useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import UiReferenceCard from "./UiReferenceCard";
import { listUiReferenceImages } from "../../../lib/uiReferenceSession";
import "./UiCreatorLanding.css";

export default function UiCreatorLanding({
  composer,
  onFileUpload,
  onTemplate,
  onBuild,
  onRemoveReferences,
  onRemoveReference,
  attachments = [],
  templates = [],
  referenceMode = "replicate",
  onReferenceMode,
  referenceTarget = "responsive",
  onReferenceTarget,
  referenceBehaviour = "infer",
  onReferenceBehaviour,
  referenceRoles = {},
  onReferenceRole,
  findings,
  buildDisabled = false,
  placeholder: _placeholder,
  ...rest
}) {
  const fileInput = useRef(null);
  const addInput = useRef(null);
  const [over, setOver] = useState(false);
  const [replaceNext, setReplaceNext] = useState(false);
  const images = listUiReferenceImages(attachments);

  const takeFiles = (files, replace = false) => {
    if (!files?.length) return;
    onFileUpload?.({ target: { files }, replace });
  };

  return (
    <section
      className="uc-landing"
      aria-label="Start a UI"
      data-has-reference={images.length ? "true" : "false"}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        if (!event.dataTransfer?.files?.length) return;
        event.preventDefault();
        setOver(false);
        takeFiles(event.dataTransfer.files);
      }}
      {...rest}
    >
      <div className="uc-landing__inner">
        {images.length ? null : (
          <h1 className="uc-landing__title">What can I help you ship?</h1>
        )}

        {images.length ? (
          <UiReferenceCard
            attachments={attachments}
            findings={findings}
            referenceMode={referenceMode}
            onReferenceMode={onReferenceMode}
            referenceTarget={referenceTarget}
            onReferenceTarget={onReferenceTarget}
            referenceBehaviour={referenceBehaviour}
            onReferenceBehaviour={onReferenceBehaviour}
            referenceRoles={referenceRoles}
            onReferenceRole={onReferenceRole}
            onReplace={() => {
              setReplaceNext(true);
              fileInput.current?.click();
            }}
            onClear={onRemoveReferences}
            onAdd={() => addInput.current?.click()}
            onRemoveReference={onRemoveReference}
            disabled={buildDisabled}
          />
        ) : (
          <button
            type="button"
            className={`uc-landing__drop${over ? " is-over" : ""}`}
            data-dropzone="dashed"
            aria-label="Drop a screenshot to replicate"
            onClick={() => fileInput.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
          >
            <ImageIcon size={18} />
            <span>Drop a screenshot to replicate</span>
          </button>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="uc-landing__file"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            takeFiles(event.target.files, replaceNext);
            setReplaceNext(false);
            event.target.value = "";
          }}
        />
        <input
          ref={addInput}
          type="file"
          accept="image/*"
          multiple
          className="uc-landing__file"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            takeFiles(event.target.files);
            event.target.value = "";
          }}
        />

        <div className="uc-landing__composer">{composer}</div>
        {images.length ? (
          <p className="uc-landing__hint">
            Leave blank to reproduce the layout and visual style as closely as possible.
          </p>
        ) : null}
        {images.length ? (
          <button
            type="button"
            className="uc-button uc-primary uc-landing__build"
            disabled={buildDisabled}
            onClick={() => onBuild?.()}
          >
            Build from reference
          </button>
        ) : null}

        <div className="uc-landing__actions">
          {templates.map((template) => (
            <button
              key={template.title}
              type="button"
              className="uc-landing__chip"
              onClick={() => onTemplate?.(template)}
            >
              {template.Icon ? <template.Icon size={16} /> : null}
              <span>{template.title}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
