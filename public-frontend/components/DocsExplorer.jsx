"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Copy,
  ExternalLink,
  FileText,
  Hash,
  Link as LinkIcon,
  Menu,
  MessageCircle,
  Search,
  Shield,
  X,
} from "../../src/lib/icons";
import PublicHeader from "./PublicHeader";

const RECENT_SEARCH_KEY = "nexusrbx.docs.recentSearches";
const SEARCH_LIMIT = 10;
const CLIPBOARD_NOTICE_DURATION_MS = 5000;
const CURATED_COMMON_TASKS = [
  "/docs/installation",
  "/docs/studio-plugin",
  "/docs/generating-your-first-script",
  "/docs/debugging-guide",
  "/docs/safety-permissions-privacy",
  "/legal/privacy",
];
const TOKEN_PATTERN =
  /(--.*$|\/\/.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:local|function|return|if|then|else|elseif|end|for|in|do|while|repeat|until|true|false|nil|const|let|await|async|type|export|from|import|class|new|try|catch|Connect|WaitForChild)\b|\b\d+(?:\.\d+)?\b)/g;

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

function isExternalHref(href = "") {
  return /^https?:\/\//i.test(href);
}

function collectText(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(collectText).join(" ");
  if (typeof value !== "object") return "";
  return Object.entries(value)
    .filter(([key]) => key !== "href" && key !== "path")
    .map(([, item]) => collectText(item))
    .join(" ");
}

function collectTextFromBlocks(blocks = []) {
  return blocks.map((block) => collectText(block)).join(" ");
}

function makePageDocument(page) {
  const sectionText = page.sections
    .map((section) => `${section.title} ${collectTextFromBlocks(section.blocks)}`)
    .join(" ");
  return {
    slug: page.slug,
    path: page.path,
    title: page.title,
    navTitle: page.navTitle || page.title,
    description: page.description,
    status: page.status,
    kind: page.path.startsWith("/legal") ? "Legal" : "Docs",
    searchable: `${page.title} ${page.navTitle || ""} ${page.description || ""} ${page.status || ""} ${sectionText}`.toLowerCase(),
  };
}

function buildSnippet(document, query) {
  const source = `${document.description || ""} ${document.searchable || ""}`.replace(/\s+/g, " ").trim();
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return document.description || "";
  const index = source.toLowerCase().indexOf(normalizedQuery.split(/\s+/)[0]);
  if (index < 0) return document.description || "";
  const start = Math.max(0, index - 54);
  const end = Math.min(source.length, index + normalizedQuery.length + 120);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < source.length ? "..." : "";
  return `${prefix}${source.slice(start, end)}${suffix}`;
}

function rankDocument(document, query) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return 0;
  let score = 0;
  const title = document.title.toLowerCase();
  const navTitle = document.navTitle.toLowerCase();

  for (const term of terms) {
    if (title === term || navTitle === term) score += 16;
    if (title.includes(term)) score += 10;
    if (navTitle.includes(term)) score += 8;
    if ((document.description || "").toLowerCase().includes(term)) score += 5;
    if (document.searchable.includes(term)) score += 2;
  }

  return terms.every((term) => document.searchable.includes(term)) ? score : 0;
}

function resolveAbsoluteUrl(path) {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).href;
}

async function writeClipboard(value) {
  if (typeof navigator !== "undefined" && navigator.clipboard && typeof window !== "undefined" && window.isSecureContext) {
    const clipboardWrite = navigator.clipboard.writeText(value)
      .then(() => true)
      .catch(() => false);
    const copied = await Promise.race([
      clipboardWrite,
      new Promise((resolve) => window.setTimeout(() => resolve(false), 800)),
    ]);
    if (copied) return true;
    // Some browsers expose the Clipboard API but deny or indefinitely defer
    // the write. Try the selection fallback before reporting failure.
  }

  if (typeof document === "undefined") return false;
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return Boolean(document.execCommand("copy"));
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

function readRecentSearches() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(RECENT_SEARCH_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

function rememberSearch(query, setRecentSearches) {
  const trimmed = query.trim();
  if (!trimmed) return;
  setRecentSearches((current) => {
    const next = [trimmed, ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
    try {
      window.sessionStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
    } catch {
      // Session storage is optional progressive enhancement.
    }
    return next;
  });
}

function tokenClassName(token) {
  if (token.startsWith("--") || token.startsWith("//")) return "docs-token-comment";
  if (/^["'`]/.test(token)) return "docs-token-string";
  if (/^\d/.test(token)) return "docs-token-number";
  return "docs-token-keyword";
}

function tokenizeLine(line) {
  const parts = [];
  let lastIndex = 0;
  let tokenIndex = 0;
  const regex = new RegExp(TOKEN_PATTERN.source, "g");
  let match = regex.exec(line);

  while (match) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    parts.push(
      <span className={tokenClassName(match[0])} key={`${match[0]}-${tokenIndex}`}>
        {match[0]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
    tokenIndex += 1;
    match = regex.exec(line);
  }

  if (lastIndex < line.length) parts.push(line.slice(lastIndex));
  return parts.length ? parts : <span aria-hidden="true"> </span>;
}

function PageIcon({ mode }) {
  return mode === "legal" ? <Shield aria-hidden="true" size={18} /> : <BookOpen aria-hidden="true" size={18} />;
}

function searchOptionId(result) {
  return `docs-search-option-${result.path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`;
}

function Sidebar({ categories, page, pages, mode, isOpen, onClose, openCategories, onToggleCategory }) {
  const pageMap = useMemo(() => new Map(pages.map((item) => [item.slug, item])), [pages]);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen]);

  return (
    <aside className={cx("docs-sidebar", isOpen && "docs-sidebar-open")} aria-label={mode === "legal" ? "Legal navigation" : "Documentation navigation"}>
      <div className="docs-sidebar-panel">
        <div className="docs-sidebar-header">
          <span><PageIcon mode={mode} /> {mode === "legal" ? "Legal" : "Docs"}</span>
          <button ref={closeButtonRef} className="docs-icon-button docs-sidebar-close" type="button" onClick={onClose} aria-label="Close navigation">
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <nav className="docs-nav" aria-label={mode === "legal" ? "Legal pages" : "Documentation pages"}>
          {categories.map((category) => (
            <div className="docs-category" key={category.id}>
              <button
                className="docs-category-button"
                type="button"
                onClick={() => onToggleCategory(category.id)}
                aria-expanded={Boolean(openCategories[category.id])}
              >
                <span>{category.title}</span>
                <ChevronDown aria-hidden="true" size={16} />
              </button>
              <div className="docs-category-pages" hidden={!openCategories[category.id]}>
                {category.pages.map((slug) => {
                  const target = pageMap.get(slug);
                  if (!target) return null;
                  const isCurrent = target.slug === page.slug;
                  return (
                    <a
                      aria-current={isCurrent ? "page" : undefined}
                      className={cx("docs-nav-link", isCurrent && "docs-nav-link-current")}
                      href={target.path}
                      key={target.slug}
                      onClick={onClose}
                    >
                      {target.navTitle || target.title}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function SearchDialog({ documents, query, setQuery, onClose, recentSearches, setRecentSearches }) {
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!normalizedQuery) {
      const byPath = new Map(documents.map((document) => [document.path, document]));
      return CURATED_COMMON_TASKS.map((path) => byPath.get(path)).filter(Boolean).slice(0, SEARCH_LIMIT);
    }
    return documents
      .map((document) => ({ ...document, score: rankDocument(document, normalizedQuery) }))
      .filter((document) => document.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, SEARCH_LIMIT);
  }, [documents, normalizedQuery]);
  const groupedResults = useMemo(() => (
    ["Docs", "Legal"]
      .map((kind) => ({ kind, results: results.filter((result) => result.kind === kind) }))
      .filter((group) => group.results.length > 0)
  ), [results]);
  const orderedResults = useMemo(() => groupedResults.flatMap((group) => group.results), [groupedResults]);
  const activeResult = orderedResults[selectedIndex];

  useEffect(() => {
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [normalizedQuery]);

  useEffect(() => {
    if (!activeResult) return;
    document.getElementById(searchOptionId(activeResult))?.scrollIntoView({ block: "nearest" });
  }, [activeResult]);

  const openResult = (result) => {
    if (!result) return;
    rememberSearch(query || result.title, setRecentSearches);
    window.location.assign(result.path);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "Tab") {
      const focusable = [...(panelRef.current?.querySelectorAll(
        'button:not([disabled]):not([tabindex="-1"]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) || [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (event.target !== inputRef.current) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((index) => orderedResults.length ? (index + 1) % orderedResults.length : 0);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((index) => orderedResults.length ? (index - 1 + orderedResults.length) % orderedResults.length : 0);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setSelectedIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setSelectedIndex(Math.max(orderedResults.length - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      openResult(orderedResults[selectedIndex]);
    }
  };

  return (
    <div className="docs-search-dialog" role="dialog" aria-modal="true" aria-labelledby="docs-search-title">
      <button className="docs-search-backdrop" type="button" onClick={onClose} aria-label="Close search" />
      <div className="docs-search-panel" onKeyDown={handleKeyDown} ref={panelRef}>
        <h2 className="sr-only" id="docs-search-title">Search NexusRBX documentation</h2>
        <div className="docs-search-input-row">
          <Search aria-hidden="true" size={19} />
          <input
            aria-activedescendant={activeResult ? searchOptionId(activeResult) : undefined}
            aria-autocomplete="list"
            aria-controls="docs-search-results"
            aria-expanded="true"
            aria-label="Search documentation and legal pages"
            ref={inputRef}
            role="combobox"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search docs, Studio bridge, legal..."
          />
          <button className="docs-icon-button" type="button" onClick={onClose} aria-label="Close search">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        {!normalizedQuery && recentSearches.length > 0 ? (
          <div className="docs-recent-searches" aria-label="Recent searches">
            {recentSearches.map((item) => (
              <button key={item} type="button" onClick={() => { setQuery(item); inputRef.current?.focus(); }}>
                {item}
              </button>
            ))}
          </div>
        ) : null}

        <div className="docs-search-results">
          {!normalizedQuery ? <p className="docs-search-results-heading">Common tasks</p> : null}
          <div id="docs-search-results" role="listbox" aria-label={normalizedQuery ? "Search results" : "Common tasks"}>
            {groupedResults.map((group) => (
              <div aria-labelledby={`docs-search-group-${group.kind.toLowerCase()}`} className="docs-search-group" key={group.kind} role="group">
                <span className="docs-search-group-label" id={`docs-search-group-${group.kind.toLowerCase()}`}>{group.kind}</span>
                {group.results.map((result) => {
                  const index = orderedResults.indexOf(result);
                  return (
                    <button
                      aria-selected={index === selectedIndex}
                      className="docs-search-result"
                      id={searchOptionId(result)}
                      key={result.path}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => openResult(result)}
                      role="option"
                      tabIndex={-1}
                      type="button"
                    >
                      <strong>{result.title}</strong>
                      <span>{buildSnippet(result, query)}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {results.length === 0 ? (
            <div className="docs-empty" role="status">
              <FileText aria-hidden="true" size={22} />
              <strong>No matching pages</strong>
              <span>Try Studio bridge, uploads, privacy, billing, or Quick.</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ block }) {
  const [copyStatus, setCopyStatus] = useState("idle");
  const lines = String(block.code || "").split("\n");

  const copyCode = async () => {
    const success = await writeClipboard(block.code || "");
    setCopyStatus(success ? "success" : "error");
    window.setTimeout(() => setCopyStatus("idle"), 1800);
  };

  return (
    <figure className="docs-code-block">
      <figcaption className="docs-code-header">
        <span>{block.title || block.language || "Code"}</span>
        <span className="docs-code-language">{block.language}</span>
        <button type="button" onClick={copyCode}>
          {copyStatus === "success" ? <Check aria-hidden="true" size={15} /> : copyStatus === "error" ? <X aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
          {copyStatus === "success" ? "Copied" : copyStatus === "error" ? "Copy failed" : "Copy"}
        </button>
      </figcaption>
      <pre>
        <code>
          {lines.map((line, index) => (
            <span className="docs-code-line" key={`${index}-${line}`}>
              <span className="docs-line-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span className="docs-code-text">{tokenizeLine(line)}</span>
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

function TabBlock({ block }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTab = block.tabs?.[activeIndex] || block.tabs?.[0];

  if (!block.tabs?.length) return null;

  return (
    <div className="docs-tabs">
      <div className="docs-tab-list" role="tablist" aria-label="Documentation tabs">
        {block.tabs.map((tab, index) => (
          <button
            aria-selected={index === activeIndex}
            className={index === activeIndex ? "docs-tab-active" : undefined}
            key={tab.label}
            onClick={() => setActiveIndex(index)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="docs-tab-panel" role="tabpanel">
        {activeTab?.blocks?.map((childBlock, index) => renderBlock(childBlock, `${activeTab.label}-${index}`))}
      </div>
    </div>
  );
}

function renderBlock(block, key) {
  if (!block) return null;

  switch (block.type) {
    case "paragraph":
      return <p className="docs-paragraph" key={key}>{block.text}</p>;
    case "list":
      return (
        <ul className={cx("docs-list", block.style === "checks" && "docs-check-list")} key={key}>
          {(block.items || []).map((item) => (
            <li key={item}>
              {block.style === "checks" ? <Check aria-hidden="true" size={16} /> : null}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <aside className={cx("docs-callout", `docs-callout-${block.tone || "info"}`)} key={key}>
          <Shield aria-hidden="true" size={18} />
          <div>
            <strong>{block.title}</strong>
            <p>{block.text}</p>
          </div>
        </aside>
      );
    case "cards":
      return (
        <div className="docs-card-grid" key={key}>
          {(block.items || []).map((item) => {
            const content = (
              <>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
                {item.href ? (
                  <span className="docs-card-link">
                    Open {isExternalHref(item.href) ? <ExternalLink aria-hidden="true" size={15} /> : <ArrowRight aria-hidden="true" size={15} />}
                  </span>
                ) : null}
              </>
            );
            return item.href ? (
              <a className="docs-mini-card" href={item.href} key={item.title}>
                {content}
              </a>
            ) : (
              <article className="docs-mini-card" key={item.title}>{content}</article>
            );
          })}
        </div>
      );
    case "steps":
      return (
        <ol className="docs-step-list" key={key}>
          {(block.items || []).map((item, index) => (
            <li key={item.title}>
              <span className="docs-step-number">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      );
    case "image":
      return (
        <figure className="docs-product-shot" key={key}>
          <img
            alt={block.alt || ""}
            height={block.height}
            loading="lazy"
            src={block.src}
            width={block.width}
          />
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    case "code":
      return <CodeBlock block={block} key={key} />;
    case "tabs":
      return <TabBlock block={block} key={key} />;
    case "table":
      return (
        <div className="docs-table-wrap" key={key}>
          <table>
            <thead>
              <tr>{(block.columns || []).map((column) => <th scope="col" key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {(block.rows || []).map((row) => (
                <tr key={row.join("-")}>{row.map((cell, index) => <td key={`${cell}-${index}`}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "params":
      return (
        <dl className="docs-parameter-list" key={key}>
          {(block.items || []).map((item) => (
            <div key={item.name}>
              <dt><code>{item.name}</code><span>{item.type}</span></dt>
              <dd>{item.description}</dd>
            </div>
          ))}
        </dl>
      );
    case "api":
      return (
        <div className="docs-api-block" key={key}>
          <div>
            <span>{block.method}</span>
            <code>{block.endpoint}</code>
          </div>
          <p>{block.summary}</p>
        </div>
      );
    case "tree":
      return (
        <div className="docs-tree" key={key}>
          <strong>{block.title}</strong>
          <ul>
            {(block.items || []).map((item) => <li key={item}><code>{item}</code></li>)}
          </ul>
        </div>
      );
    case "path":
      return (
        <div className="docs-path" key={key}>
          <h3>{block.title}</h3>
          <ol>
            {(block.items || []).map((item) => <li key={item}>{item}</li>)}
          </ol>
        </div>
      );
    case "accordion":
      return (
        <div className="docs-accordion" key={key}>
          {(block.items || []).map((item) => (
            <details key={item.title}>
              <summary>{item.title}</summary>
              <p>{item.body}</p>
            </details>
          ))}
        </div>
      );
    default:
      return null;
  }
}

export default function DocsExplorer({
  mode = "docs",
  page,
  pages,
  categories,
  legalPages = [],
  previousPage,
  nextPage,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);
  const [pageCopyStatus, setPageCopyStatus] = useState("idle");
  const [sectionCopyState, setSectionCopyState] = useState({ id: "", status: "idle" });
  const [clipboardNotice, setClipboardNotice] = useState("");
  const searchTriggerRef = useRef(null);
  const sidebarTriggerRef = useRef(null);
  const sectionIds = useMemo(() => page.sections.map((section) => section.id), [page.sections]);
  const sectionKey = sectionIds.join("|");
  const [activeSection, setActiveSection] = useState(sectionIds[0] || "");
  const showToc = useMemo(() => (
    page.sections.length >= 5 || collectText(page.sections).length > 3500
  ), [page.sections]);
  const pageMap = useMemo(() => new Map(pages.map((item) => [item.slug, item])), [pages]);
  const categoryLinks = useMemo(() => categories.map((category) => {
    const target = category.pages.map((slug) => pageMap.get(slug)).find(Boolean);
    return target ? { ...category, path: target.path } : null;
  }).filter(Boolean), [categories, pageMap]);
  const defaultOpenCategories = useMemo(() => (
    categories.reduce((result, category) => ({
      ...result,
      [category.id]: category.pages.includes(page.slug) || category.id === page.category,
    }), {})
  ), [categories, page.category, page.slug]);
  const [openCategories, setOpenCategories] = useState(defaultOpenCategories);
  const searchDocuments = useMemo(() => {
    const byPath = new Map();
    [...pages, ...legalPages].forEach((item) => byPath.set(item.path, makePageDocument(item)));
    return [...byPath.values()];
  }, [legalPages, pages]);
  const canonicalArticleUrl = `https://www.nexusrbx.com${page.path}`;
  const supportMessage = `I found something unclear or incorrect on \"${page.title}\" (${canonicalArticleUrl}). Please describe what should change:`;
  const supportHref = mode === "docs"
    ? `/contact?subject=support&source=docs&article=${encodeURIComponent(canonicalArticleUrl)}&message=${encodeURIComponent(supportMessage)}`
    : `/contact?subject=support&source=legal&article=${encodeURIComponent(canonicalArticleUrl)}&message=${encodeURIComponent(supportMessage)}`;

  const openSearch = (trigger) => {
    searchTriggerRef.current = trigger || document.activeElement;
    setIsSearchOpen(true);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    window.requestAnimationFrame(() => searchTriggerRef.current?.focus?.());
  };

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    window.requestAnimationFrame(() => sidebarTriggerRef.current?.focus?.());
  }, []);

  useEffect(() => {
    setOpenCategories(defaultOpenCategories);
  }, [defaultOpenCategories]);

  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchTriggerRef.current = document.activeElement;
        setIsSearchOpen(true);
      }
      if (event.key === "Escape") {
        if (isSidebarOpen) closeSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeSidebar, isSidebarOpen]);

  useEffect(() => {
    setActiveSection(sectionIds[0] || "");
    if (!showToc) return undefined;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return undefined;
    const headings = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
    if (!headings.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible?.target?.id) setActiveSection(visible.target.id);
    }, { rootMargin: "-120px 0px -68% 0px", threshold: 0.01 });
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [sectionKey, showToc]);

  const copyCurrentPage = async () => {
    const success = await writeClipboard(resolveAbsoluteUrl(page.path));
    setPageCopyStatus(success ? "success" : "error");
    setClipboardNotice(success ? "Page link copied." : "The page link could not be copied. Copy it from the address bar instead.");
    window.setTimeout(() => {
      setPageCopyStatus("idle");
      setClipboardNotice("");
    }, CLIPBOARD_NOTICE_DURATION_MS);
  };

  const copySection = async (sectionId) => {
    const success = await writeClipboard(resolveAbsoluteUrl(`${page.path}#${sectionId}`));
    setSectionCopyState({ id: sectionId, status: success ? "success" : "error" });
    setClipboardNotice(success ? "Section link copied." : "The section link could not be copied. Copy it from the address bar instead.");
    window.setTimeout(() => {
      setSectionCopyState({ id: "", status: "idle" });
      setClipboardNotice("");
    }, CLIPBOARD_NOTICE_DURATION_MS);
  };

  return (
    <div className={cx("docs-shell", mode === "legal" && "docs-shell-legal")}>
      <div className="docs-public-header">
        <PublicHeader />
      </div>
      <div className="docs-context-bar">
        <div className="docs-context-inner">
          <a className="docs-context-title" href={mode === "legal" ? "/legal" : "/docs"}>
            <PageIcon mode={mode} />
            <span>{mode === "legal" ? "Legal" : "Documentation"}</span>
          </a>
          <nav className="docs-context-categories" aria-label={mode === "legal" ? "Legal categories" : "Documentation categories"}>
            {categoryLinks.map((category) => (
              <a
                aria-current={category.id === page.category ? "location" : undefined}
                className={category.id === page.category ? "docs-context-category-current" : undefined}
                href={category.path}
                key={category.id}
              >
                {category.title}
              </a>
            ))}
          </nav>
          <div className="docs-context-actions">
        <button
          aria-label="Search documentation and legal pages"
          className="docs-search-button"
          type="button"
          onClick={(event) => openSearch(event.currentTarget)}
        >
              <Search aria-hidden="true" size={17} />
              <span>Search</span>
              <kbd>⌘K</kbd>
            </button>
            <button
              className="docs-icon-button docs-mobile-menu"
              type="button"
              onClick={(event) => {
                sidebarTriggerRef.current = event.currentTarget;
                setIsSidebarOpen(true);
              }}
              aria-label="Open navigation"
            >
              <Menu aria-hidden="true" size={20} />
            </button>
          </div>
        </div>
      </div>

      {isSidebarOpen ? <div aria-hidden="true" className="docs-mobile-backdrop" onClick={closeSidebar} /> : null}

      <div className={cx("docs-main-grid", !showToc && "docs-main-grid-no-toc")}>
        <Sidebar
          categories={categories}
          isOpen={isSidebarOpen}
          mode={mode}
          onClose={closeSidebar}
          onToggleCategory={(categoryId) => setOpenCategories((current) => ({ ...current, [categoryId]: !current[categoryId] }))}
          openCategories={openCategories}
          page={page}
          pages={pages}
        />

        <main className="docs-article" id="content">
          <nav className="docs-breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <ChevronRight aria-hidden="true" size={14} />
            <a href={mode === "legal" ? "/legal" : "/docs"}>{mode === "legal" ? "Legal" : "Docs"}</a>
            <ChevronRight aria-hidden="true" size={14} />
            <span>{page.navTitle || page.title}</span>
          </nav>

          <header className="docs-article-header">
            <span className="docs-kicker"><PageIcon mode={mode} /> {page.status}</span>
            <h1>{page.title}</h1>
            <p>{page.description}</p>
            <div className="docs-meta" aria-label="Page metadata">
              <span>Updated {page.updated}</span>
              <span>{page.readingTime}</span>
            </div>
            <div className="docs-actions" aria-label="Page actions">
              {page.primaryAction ? <a className="docs-primary-action" href={page.primaryAction.href}>{page.primaryAction.label}<ArrowRight aria-hidden="true" size={16} /></a> : null}
              {page.secondaryAction ? <a className="docs-secondary-action" href={page.secondaryAction.href}>{page.secondaryAction.label}</a> : null}
              <button type="button" onClick={copyCurrentPage}>
                {pageCopyStatus === "success" ? <Check aria-hidden="true" size={16} /> : pageCopyStatus === "error" ? <X aria-hidden="true" size={16} /> : <LinkIcon aria-hidden="true" size={16} />}
                {pageCopyStatus === "success" ? "Copied" : pageCopyStatus === "error" ? "Copy failed" : "Copy link"}
              </button>
              <button type="button" onClick={() => window.print()}>
                <Clipboard aria-hidden="true" size={16} />
                Print
              </button>
            </div>
          </header>

          {page.sections.map((section) => (
            <section className="docs-section" aria-labelledby={section.id} key={section.id}>
              <div className="docs-heading-row">
                <h2 id={section.id}>{section.title}</h2>
                <button
                  className="docs-copy-link"
                  type="button"
                  onClick={() => copySection(section.id)}
                  aria-label={sectionCopyState.id === section.id && sectionCopyState.status === "error" ? `Copy failed for ${section.title}` : `Copy link to ${section.title}`}
                >
                  {sectionCopyState.id === section.id && sectionCopyState.status === "success" ? <Check aria-hidden="true" size={15} /> : sectionCopyState.id === section.id && sectionCopyState.status === "error" ? <X aria-hidden="true" size={15} /> : <Hash aria-hidden="true" size={15} />}
                </button>
              </div>
              <div className="docs-blocks">
                {section.blocks.map((block, index) => renderBlock(block, `${section.id}-${index}`))}
              </div>
            </section>
          ))}

          <div className="docs-feedback" role="region" aria-label="Documentation support">
            <div className="docs-feedback-copy">
              <MessageCircle aria-hidden="true" size={18} />
              <div>
                <strong>Spot something unclear?</strong>
                <p>Send the page title and link to support so the report reaches the right context.</p>
              </div>
            </div>
            <a className="docs-feedback-link" href={supportHref}>
              Report an issue with this page
              <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>

          <nav className="docs-pager" aria-label="Adjacent pages">
            {previousPage ? (
              <a href={previousPage.path}>
                <ArrowLeft aria-hidden="true" size={16} />
                <span>
                  <small>Previous</small>
                  {previousPage.navTitle || previousPage.title}
                </span>
              </a>
            ) : <span />}
            {nextPage ? (
              <a href={nextPage.path}>
                <span>
                  <small>Next</small>
                  {nextPage.navTitle || nextPage.title}
                </span>
                <ArrowRight aria-hidden="true" size={16} />
              </a>
            ) : null}
          </nav>
        </main>

        {showToc ? (
          <aside className="docs-toc" aria-label="On this page">
            <strong>On this page</strong>
            <nav>
              {page.sections.map((section) => (
                <a className={cx("docs-toc-link", activeSection === section.id && "docs-toc-link-active")} href={`#${section.id}`} key={section.id}>
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>
        ) : null}
      </div>

      {clipboardNotice ? <div className="docs-clipboard-notice" role="status" aria-live="polite">{clipboardNotice}</div> : null}

      {isSearchOpen ? (
        <SearchDialog
          documents={searchDocuments}
          query={searchQuery}
          recentSearches={recentSearches}
          setQuery={setSearchQuery}
          setRecentSearches={setRecentSearches}
          onClose={closeSearch}
        />
      ) : null}
    </div>
  );
}
