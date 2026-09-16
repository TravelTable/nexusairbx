import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import ImageGeneration from "./ImageGeneration";
import "./UiGeneratedImageFeed.css";

function publishCopy(publish) {
  if (!publish?.status || publish.status === "idle") return "";
  if (publish.status === "publishing") return "Uploading to Roblox…";
  if (publish.status === "under_moderation") {
    return publish.robloxAssetId
      ? `Under Roblox moderation · rbxassetid://${publish.robloxAssetId}`
      : "Under Roblox moderation";
  }
  if (publish.status === "ready") {
    return publish.contentUri || (publish.robloxAssetId ? `rbxassetid://${publish.robloxAssetId}` : "Published to Roblox");
  }
  return publish.error || "Publish failed";
}

export default function UiGeneratedImageFeed({
  images = [],
  onPublish,
  publishingId = "",
  publishDisabledReason = "",
}) {
  const track = useRef(null);
  const [index, setIndex] = useState(0);
  const [openId, setOpenId] = useState("");
  const dialog = useRef(null);

  useEffect(() => {
    if (index >= images.length) setIndex(Math.max(0, images.length - 1));
  }, [images.length, index]);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return undefined;
    if (openId) {
      if (!node.open) node.showModal();
    } else if (node.open) {
      node.close();
    }
    return undefined;
  }, [openId]);

  if (!images.length) return null;
  const opened = images.find((image) => image.id === openId) || null;

  const scrollTo = (next) => {
    const clamped = Math.max(0, Math.min(images.length - 1, next));
    setIndex(clamped);
    const child = track.current?.children?.[clamped];
    child?.scrollIntoView?.({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <section className="uc-image-feed" aria-label="Generated artwork">
      <header className="uc-image-feed__header">
        <strong>Generated artwork</strong>
        <span>{index + 1} / {images.length}</span>
      </header>

      <div className="uc-image-feed__viewport">
        <button
          type="button"
          className="uc-image-feed__nav"
          aria-label="Previous image"
          disabled={index <= 0}
          onClick={() => scrollTo(index - 1)}
        >
          <ChevronLeft size={16} />
        </button>

        <div
          ref={track}
          className="uc-image-feed__track"
          onScroll={(event) => {
            const node = event.currentTarget;
            const width = node.clientWidth || 1;
            setIndex(Math.max(0, Math.min(images.length - 1, Math.round(node.scrollLeft / width))));
          }}
        >
          {images.map((image) => (
            <figure key={image.id} className="uc-image-feed__slide">
              <ImageGeneration state={image.state}>
                <button
                  type="button"
                  className="uc-image-feed__open"
                  onClick={() => setOpenId(image.id)}
                  aria-label={`Open ${image.alt || image.label || "generated image"}`}
                >
                  <img src={image.src} alt={image.alt || image.label || "Generated artwork"} />
                </button>
              </ImageGeneration>
              <figcaption>
                <span>{publishCopy(image.publish) || image.label}</span>
                {image.state === "completed" ? (
                  <button
                    type="button"
                    className="uc-image-feed__publish"
                    disabled={Boolean(publishingId)}
                    title={publishDisabledReason || undefined}
                    onClick={() => onPublish?.(image)}
                  >
                    {image.publish?.status === "ready" ? "Published" : publishingId === image.id ? "Publishing…" : "Publish to Roblox"}
                  </button>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>

        <button
          type="button"
          className="uc-image-feed__nav"
          aria-label="Next image"
          disabled={index >= images.length - 1}
          onClick={() => scrollTo(index + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <dialog
        ref={dialog}
        className="uc-image-feed__dialog"
        aria-label="Artwork preview"
        onClose={() => setOpenId("")}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpenId("");
        }}
      >
        {opened ? (
          <div className="uc-image-feed__lightbox">
            <button type="button" className="uc-image-feed__close" aria-label="Close artwork preview" onClick={() => setOpenId("")}>
              <X size={16} />
            </button>
            <img src={opened.src} alt={opened.alt || opened.label || "Generated artwork"} />
            <p>{publishCopy(opened.publish) || opened.label}</p>
            {opened.state === "completed" ? (
              <button
                type="button"
                className="uc-image-feed__publish"
                disabled={Boolean(publishingId)}
                title={publishDisabledReason || undefined}
                onClick={() => onPublish?.(opened)}
              >
                {opened.publish?.status === "ready" ? "Published" : "Publish to Roblox"}
              </button>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </section>
  );
}
