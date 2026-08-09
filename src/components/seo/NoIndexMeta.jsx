import React, { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";

export const NOINDEX_CONTENT = "noindex, nofollow";

let noIndexOwnerSequence = 0;

export default function NoIndexMeta({ title, description, children }) {
  const ownerRef = useRef(null);
  if (!ownerRef.current) {
    noIndexOwnerSequence += 1;
    ownerRef.current = `nexus-noindex-${noIndexOwnerSequence}`;
  }

  useEffect(() => {
    const owner = ownerRef.current;

    const ensureNoIndex = () => {
      let meta = document.head.querySelector('meta[name="robots"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "robots");
        document.head.appendChild(meta);
      }
      if (meta.getAttribute("content") !== NOINDEX_CONTENT) {
        meta.setAttribute("content", NOINDEX_CONTENT);
      }
      meta.setAttribute("data-nexus-noindex-owner", owner);
    };

    ensureNoIndex();
    const observer = typeof MutationObserver === "function"
      ? new MutationObserver(ensureNoIndex)
      : null;
    observer?.observe(document.head, { childList: true });

    return () => {
      observer?.disconnect();
      const meta = document.head.querySelector(
        `meta[name="robots"][data-nexus-noindex-owner="${owner}"]`,
      );
      meta?.remove();
    };
  }, []);

  return (
    <Helmet defer={false}>
      {title ? <title>{title}</title> : null}
      {description ? <meta name="description" content={description} /> : null}
      <meta name="robots" content={NOINDEX_CONTENT} />
      {children}
    </Helmet>
  );
}
