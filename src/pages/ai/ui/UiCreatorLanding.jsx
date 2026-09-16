import React, { useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import "./UiCreatorLanding.css";

export default function UiCreatorLanding({
  composer,
  onFileUpload,
  onTemplate,
  attachments = [],
  templates = [],
  ...rest
}) {
  const fileInput = useRef(null);
  const [over, setOver] = useState(false);
  const preview = attachments.find((item) => item.isImage || item.kind === "image" || item.previewUrl || item.url);
  const takeFiles = (files) => {
    if (!files?.length) return;
    onFileUpload?.({ target: { files } });
  };

  return (
    <section className="uc-landing" aria-label="Start a UI" {...rest}>
      <div className="uc-landing__inner">
        <h1 className="uc-landing__title">What can I help you ship?</h1>

        <button
          type="button"
          className={`uc-landing__drop${over ? " is-over" : ""}`}
          data-dropzone="dashed"
          aria-label="Drop a screenshot to replicate"
          onClick={() => fileInput.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setOver(false);
            takeFiles(event.dataTransfer?.files);
          }}
        >
          {preview ? (
            <img src={preview.previewUrl || preview.url || preview.dataUrl} alt="" />
          ) : (
            <>
              <ImageIcon size={18} />
              <span>Drop a screenshot to replicate</span>
            </>
          )}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="uc-landing__file"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => takeFiles(event.target.files)}
        />

        <div className="uc-landing__composer">{composer}</div>

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
