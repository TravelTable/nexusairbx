import React, { useEffect, useMemo, useState } from "react";
import { Check, ImageIcon, X } from "lucide-react";
import useUiReferencePreview from "./useUiReferencePreview";
import {
  inferReferenceFindings,
  inferReferenceKind,
  listUiReferenceImages,
  referenceAttachmentKey,
  REFERENCE_ROLE_OPTIONS,
} from "../../../lib/uiReferenceSession";

function prefersReducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function ControlGroup({ name, value, onChange, options, disabled }) {
  return (
    <div className="uc-reference-card__control">
      <span>{name}</span>
      <div className="uc-reference-card__seg" role="group" aria-label={name}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            className={value === option.id ? "is-active" : undefined}
            disabled={disabled}
            onClick={() => onChange?.(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function sampleFindings(imageNode, meta) {
  try {
    const canvas = document.createElement("canvas");
    const width = 24;
    const height = 16;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return inferReferenceFindings(meta);
    context.drawImage(imageNode, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);
    const columnLuma = Array.from({ length: width }, () => 0);
    const rowLuma = Array.from({ length: height }, () => 0);
    let total = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        const luma = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
        columnLuma[x] += luma / height;
        rowLuma[y] += luma / width;
        total += luma;
      }
    }
    return inferReferenceFindings({
      ...meta,
      meanLuma: total / (width * height),
      columnLuma,
      rowLuma,
    });
  } catch {
    return inferReferenceFindings(meta);
  }
}

function ReferencePreview({ item, onOpen, onReady }) {
  const src = useUiReferencePreview(item);
  if (!src) {
    return (
      <div className="uc-reference-card__preview uc-reference-card__preview--empty">
        <ImageIcon size={22} />
      </div>
    );
  }
  return (
    <button type="button" className="uc-reference-card__preview" onClick={onOpen}>
      <img
        className="uc-reference-card__preview-image"
        src={src}
        alt={item.name || "Reference screenshot"}
        onLoad={(event) => onReady?.(event.currentTarget)}
      />
    </button>
  );
}

export default function UiReferenceCard({
  attachments = [],
  findings: findingsProp,
  referenceMode = "replicate",
  onReferenceMode,
  referenceTarget = "responsive",
  onReferenceTarget,
  referenceBehaviour = "infer",
  onReferenceBehaviour,
  referenceRoles = {},
  onReferenceRole,
  onReplace,
  onClear,
  onAdd,
  onRemoveReference,
  disabled = false,
}) {
  const images = listUiReferenceImages(attachments);
  const primary =
    images.find((item) => referenceRoles[referenceAttachmentKey(item)] === "primary") ||
    images[0];
  const meta = {
    width: Number(primary?.width) || 0,
    height: Number(primary?.height) || 0,
    name: primary?.name || "",
  };
  const measured = useMemo(
    () => findingsProp || inferReferenceFindings(meta),
    [findingsProp, meta.width, meta.height, meta.name]
  );
  const [phase, setPhase] = useState(() =>
    findingsProp || prefersReducedMotion() ? "collapsed" : "analyzing"
  );
  const [visibleCount, setVisibleCount] = useState(() =>
    findingsProp || prefersReducedMotion() ? measured.length : 0
  );
  const [sampled, setSampled] = useState(measured);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [open, setOpen] = useState(false);
  const src = useUiReferencePreview(primary);

  useEffect(() => {
    setSampled(findingsProp || inferReferenceFindings(meta));
  }, [findingsProp, meta.width, meta.height, meta.name]);

  useEffect(() => {
    if (findingsProp || prefersReducedMotion()) {
      setPhase("collapsed");
      setVisibleCount(sampled.length);
      return undefined;
    }
    setPhase("analyzing");
    setVisibleCount(0);
    const timers = sampled.map((_, index) =>
      window.setTimeout(() => {
        setPhase("findings");
        setVisibleCount(index + 1);
      }, 280 * (index + 1))
    );
    const collapse = window.setTimeout(() => setPhase("collapsed"), 280 * sampled.length + 700);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(collapse);
    };
  }, [findingsProp, sampled]);

  if (!primary) return null;
  const kind = inferReferenceKind(primary);
  const width = meta.width || naturalSize.width;
  const height = meta.height || naturalSize.height;
  const sizeLabel = width && height ? `${width} × ${height}` : "Measuring…";
  const collapsedLabel = `Reference understood · ${sampled.length || 1} UI region${sampled.length === 1 ? "" : "s"}`;

  return (
    <article className="uc-reference-card" aria-label="Reference" data-reference-card="true">
      <header className="uc-reference-card__header">
        <span>Reference</span>
        <div className="uc-reference-card__header-actions">
          <button type="button" onClick={onReplace} disabled={disabled}>
            Replace
          </button>
          <button type="button" aria-label="Remove reference" onClick={onClear} disabled={disabled}>
            <X size={14} />
          </button>
        </div>
      </header>

      <ReferencePreview
        item={primary}
        onOpen={() => setOpen(true)}
        onReady={(imageNode) => {
          if (imageNode.naturalWidth && imageNode.naturalHeight) {
            setNaturalSize({ width: imageNode.naturalWidth, height: imageNode.naturalHeight });
          }
          if (!findingsProp) setSampled(sampleFindings(imageNode, {
            width: imageNode.naturalWidth || meta.width,
            height: imageNode.naturalHeight || meta.height,
            name: meta.name,
          }));
        }}
      />

      {phase !== "collapsed" ? (
        <div className="uc-reference-card__analysis" aria-live="polite">
          <p>Analyzing reference…</p>
          <ul>
            {sampled.slice(0, visibleCount).map((finding) => (
              <li key={finding}>
                <Check size={12} />
                {finding}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="uc-reference-card__understood">{collapsedLabel}</p>
      )}

      <div className="uc-reference-card__controls">
        <ControlGroup
          name="Match"
          value={referenceMode}
          onChange={onReferenceMode}
          disabled={disabled}
          options={[
            { id: "replicate", label: "Close replica" },
            { id: "inspiration", label: "Inspired by" },
          ]}
        />
        <ControlGroup
          name="Target"
          value={referenceTarget}
          onChange={onReferenceTarget}
          disabled={disabled}
          options={[
            { id: "desktop", label: "Desktop" },
            { id: "mobile", label: "Mobile" },
            { id: "responsive", label: "Responsive" },
          ]}
        />
        <ControlGroup
          name="Behaviour"
          value={referenceBehaviour}
          onChange={onReferenceBehaviour}
          disabled={disabled}
          options={[
            { id: "infer", label: "Infer interactions" },
            { id: "visual", label: "Visual only" },
          ]}
        />
      </div>

      <p className="uc-reference-card__meta">
        <span>{sizeLabel}</span>
        <span aria-hidden="true"> · </span>
        <span>{kind}</span>
      </p>

      {images.length > 1 ? (
        <section className="uc-reference-set" aria-label="Reference set">
          <h2>Reference set</h2>
          <ul>
            {images.map((item) => {
              const key = referenceAttachmentKey(item);
              const role = referenceRoles[key] || "other";
              return (
                <li key={key}>
                  <span className="uc-reference-set__star" aria-hidden="true">
                    {role === "primary" ? "★" : ""}
                  </span>
                  <div>
                    <select
                      aria-label={`${item.name} role`}
                      value={role}
                      disabled={disabled}
                      onChange={(event) => onReferenceRole?.(key, event.target.value)}
                    >
                      {REFERENCE_ROLE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <small>{item.name}</small>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => onRemoveReference?.(item)}
                    disabled={disabled}
                  >
                    <X size={12} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <button type="button" className="uc-reference-card__add" aria-label="Add reference" onClick={onAdd} disabled={disabled}>
        + Add reference
      </button>
      {open && src ? (
        <div className="uc-reference-lightbox" role="dialog" aria-modal="true" aria-label="Reference screenshot">
          <button type="button" className="uc-reference-lightbox__close" aria-label="Close reference" onClick={() => setOpen(false)}>
            <X size={16} />
          </button>
          <img src={src} alt={primary.name || "Reference screenshot"} />
        </div>
      ) : null}
    </article>
  );
}

export { sampleFindings };
