"use client";

import { useMemo, useState } from "react";

function matches(section, query) {
  if (!query) return true;
  const haystack = [section.title, section.summary, ...(section.bullets || []), ...(section.prompts || [])]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export default function DocsExplorer({ sections }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => sections.filter((section) => matches(section, query.trim().toLowerCase())), [query, sections]);

  const copyPrompt = async (prompt, event) => {
    await navigator.clipboard.writeText(prompt);
    const button = event.currentTarget;
    const old = button.textContent;
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.textContent = old || "Copy prompt";
    }, 1200);
  };

  return (
    <div className="docs-layout">
      <aside className="docs-sidebar">
        <label className="docs-filter">
          <span>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="pair studio"
            aria-label="Filter documentation sections"
          />
        </label>
        <nav className="docs-nav" aria-label="Documentation sections">
          {filtered.map((section) => (
            <a key={section.id} href={`#${section.id}`}>{section.title}</a>
          ))}
        </nav>
      </aside>

      <div className="docs-content">
        {filtered.map((section) => (
          <section className="doc-card" id={section.id} key={section.id}>
            <h2>{section.title}</h2>
            <p>{section.summary}</p>
            <ul className="bullet-list">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            {section.prompts?.map((prompt) => (
              <div className="prompt-card" key={prompt}>
                <pre>{prompt}</pre>
                <button className="copy-button" type="button" onClick={(event) => copyPrompt(prompt, event)}>
                  Copy prompt
                </button>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
