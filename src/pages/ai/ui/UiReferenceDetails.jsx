import React, { useEffect, useState } from 'react';
import { downloadChatAttachment } from '../../../lib/chatAttachmentApi';
import { readUiPreview, readUiPreviewImage } from '../../../lib/uiPreviewApi';

export default function UiReferenceDetails({ document, build }) {
  const reference = document?.designMemory?.reference;
  const library = document?.designMemory?.libraryReferences || [];
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState({});
  const savedReview = document?.designMemory?.lastReview?.sourceRevision === document?.revision ? document?.designMemory?.lastReview : null;
  const slot = (build?.sourceRevision === document?.revision ? build?.matrix?.find(s => s.viewportId === 'reference') : null)
    || (savedReview?.referencePreviewId ? { jobId: savedReview.referencePreviewId } : null);
  const match = (build?.sourceRevision === document?.revision ? build?.referenceMatch : null) || savedReview?.referenceMatch;
  const key = JSON.stringify([document?.designId, reference?.attachment, slot?.jobId]);
  useEffect(() => {
    if (!open || !reference) return undefined;
    let active = true; const urls = []; const controller = new AbortController();
    setImages({});
    const url = blob => { const value = URL.createObjectURL(blob); urls.push(value); return value; };
    (async () => {
      try {
        const original = await downloadChatAttachment(reference.attachment);
        if (!active) return;
        setImages({ original: url(original) });
        if (slot?.jobId) {
          const result = await readUiPreview(document.designId, slot.jobId, controller.signal);
          const record = result.job || result;
          if (record.status !== 'ready') return;
          const rendered = await readUiPreviewImage(document.designId, slot.jobId, record.preview?.imageHash || record.imageHash, controller.signal);
          if (active) setImages(prev => ({ ...prev, rendered: url(rendered) }));
        }
      } catch (error) { if (active) setImages(prev => ({ ...prev, error: error.message })); }
    })();
    return () => { active = false; controller.abort(); urls.forEach(URL.revokeObjectURL); };
    // Immutable attachment version and preview job determine the image identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key, build?.stage]);
  if (!reference && !library.length) return null;
  return <details className="uc-reference-details" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{reference ? 'Reference & comparison' : 'Library references'}</summary>
    {reference && <>
      <p>{reference.attachment.name} · {reference.width} × {reference.height}</p>
      <p>{match?.exact ? 'Exact pixel match at reference size' : match ? 'Differences remain' : 'Awaiting reference comparison'}</p>
      <div className="uc-reference-images">
        {images.original && <figure><figcaption>Original</figcaption><a href={images.original} target="_blank" rel="noreferrer"><img src={images.original} alt="Uploaded UI reference" /></a></figure>}
        {images.rendered && <figure><figcaption>Result</figcaption><a href={images.rendered} target="_blank" rel="noreferrer"><img src={images.rendered} alt="Generated UI at reference dimensions" /></a></figure>}
      </div>
      {images.error && <p role="alert">{images.error}</p>}
      <details><summary>Visual spec · {reference.elements.length} elements</summary><p>{reference.summary}</p>
        {reference.elements.map(e => <p key={e.requirement.id}><strong>{e.requirement.label}</strong> · {e.bounds.width} × {e.bounds.height} at {e.bounds.x}, {e.bounds.y}<br />{e.typography} · {e.colors}</p>)}
        {reference.uncertainties.map((item, index) => <p key={index}>{item}</p>)}
      </details>
    </>}
    {library.map(entry => <details key={entry.ref}><summary>{entry.name}</summary><p>{entry.summary}</p><small>{entry.ref}</small></details>)}
  </details>;
}
