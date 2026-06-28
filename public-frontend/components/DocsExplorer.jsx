"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";

const RECENT_SEARCH_KEY = "nexusrbx.docs.recentSearches";
const SEARCH_LIMIT = 8;
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
    await navigator.clipboard.writeText(value);
    return true;
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
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
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

function Sidebar({ categories, page, pages, mode, isOpen, onClose, openCategories, onToggleCategory }) {
  const pageMap = useMemo(() => new Map(pages.map((item) => [item.slug, item])), [pages]);

  return (
    <aside className={cx("docs-sidebar", isOpen && "docs-sidebar-open")} aria-label={mode === "legal" ? "Legal navigation" : "Documentation navigation"}>
      <div className="docs-sidebar-panel">
        <div className="docs-sidebar-header">
          <span><PageIcon mode={mode} /> {mode === "legal" ? "Legal" : "Docs"}</span>
          <button className="docs-icon-button docs-sidebar-close" type="button" onClick={onClose} aria-label="Close navigation">
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!normalizedQuery) {
      return documents.slice(0, SEARCH_LIMIT);
    }
    return documents
      .map((document) => ({ ...document, score: rankDocument(document, normalizedQuery) }))
      .filter((document) => document.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, SEARCH_LIMIT);
  }, [documents, normalizedQuery]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [normalizedQuery]);

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
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      openResult(results[selectedIndex]);
    }
  };

  return (
    <div className="docs-search-dialog" role="dialog" aria-modal="true" aria-label="Search NexusRBX docs">
      <button className="docs-search-backdrop" type="button" onClick={onClose} aria-label="Close search" />
      <div className="docs-search-panel" onKeyDown={handleKeyDown}>
        <div className="docs-search-input-row">
          <Search aria-hidden="true" size={19} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search docs, Studio bridge, legal..."
            aria-label="Search documentation and legal pages"
          />
          <button className="docs-icon-button" type="button" onClick={onClose} aria-label="Close search">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        {!normalizedQuery && recentSearches.length > 0 ? (
          <div className="docs-recent-searches" aria-label="Recent searches">
            {recentSearches.map((item) => (
              <button key={item} type="button" onClick={() => setQuery(item)}>
                {item}
              </button>
            ))}
          </div>
        ) : null}

        <div className="docs-search-results" role="listbox" aria-label="Search results">
          {results.length > 0 ? results.map((result, index) => (
            <button
              aria-selected={index === selectedIndex}
              className="docs-search-result"
              key={result.path}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => openResult(result)}
              role="option"
              type="button"
            >
              <span className="docs-search-result-kind">{result.kind}</span>
              <strong>{result.title}</strong>
              <span>{buildSnippet(result, query)}</span>
            </button>
          )) : (
            <div className="docs-empty" role="status">
              <FileText aria-hidden="true" size={22} />
              <strong>No matching pages</strong>
              <span>Try Studio bridge, uploads, privacy, billing, or Quick Script.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ block }) {
  const [copied, setCopied] = useState(false);
  const lines = String(block.code || "").split("\n");

  const copyCode = async () => {
    await writeClipboard(block.code || "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <figure className="docs-code-block">
      <figcaption className="docs-code-header">
        <span>{block.title || block.language || "Code"}</span>
        <span className="docs-code-language">{block.language}</span>
        <button type="button" onClick={copyCode}>
          {copied ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
          {copied ? "Copied" : "Copy"}
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
  const [copiedPage, setCopiedPage] = useState(false);
  const [copiedSectionId, setCopiedSectionId] = useState("");
  const [feedback, setFeedback] = useState("");
  const sectionIds = useMemo(() => page.sections.map((section) => section.id), [page.sections]);
  const sectionKey = sectionIds.join("|");
  const [activeSection, setActiveSection] = useState(sectionIds[0] || "");
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
        setIsSearchOpen(true);
      }
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setActiveSection(sectionIds[0] || "");
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return undefined;
    const headings = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
    if (!headings.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible?.target?.id) setActiveSection(visible.target.id);
    }, { rootMargin: "-120px 0px -68% 0px", threshold: 0.01 });
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [sectionKey]);

  const copyCurrentPage = async () => {
    await writeClipboard(resolveAbsoluteUrl(page.path));
    setCopiedPage(true);
    window.setTimeout(() => setCopiedPage(false), 1400);
  };

  const copySection = async (sectionId) => {
    await writeClipboard(resolveAbsoluteUrl(`${page.path}#${sectionId}`));
    setCopiedSectionId(sectionId);
    window.setTimeout(() => setCopiedSectionId(""), 1400);
  };

  return (
    <div className={cx("docs-shell", mode === "legal" && "docs-shell-legal")}>
      <header className="docs-topbar">
        <div className="docs-topbar-inner">
          <a className="docs-brand" href="/" aria-label="NexusRBX home">
            <span className="docs-brand-icon" aria-hidden="true">N</span>
            <span>NexusRBX</span>
          </a>
          <nav className="docs-topnav" aria-label="Public docs navigation">
            <a href="/docs">Docs</a>
            <a href="/docs/studio-plugin">Studio</a>
            <a href="/legal">Legal</a>
            <a href="/ai">AI Workspace</a>
          </nav>
          <div className="docs-topbar-actions">
            <button className="docs-search-button" type="button" onClick={() => setIsSearchOpen(true)}>
              <Search aria-hidden="true" size={17} />
              <span>Search</span>
              <kbd>⌘K</kbd>
            </button>
            <button className="docs-icon-button docs-mobile-menu" type="button" onClick={() => setIsSidebarOpen(true)} aria-label="Open navigation">
              <Menu aria-hidden="true" size={20} />
            </button>
          </div>
        </div>
      </header>

      {isSidebarOpen ? <button className="docs-mobile-backdrop" type="button" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation" /> : null}

      <div className="docs-main-grid">
        <Sidebar
          categories={categories}
          isOpen={isSidebarOpen}
          mode={mode}
          onClose={() => setIsSidebarOpen(false)}
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
                {copiedPage ? <Check aria-hidden="true" size={16} /> : <LinkIcon aria-hidden="true" size={16} />}
                {copiedPage ? "Copied" : "Copy link"}
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
                <button className="docs-copy-link" type="button" onClick={() => copySection(section.id)} aria-label={`Copy link to ${section.title}`}>
                  {copiedSectionId === section.id ? <Check aria-hidden="true" size={15} /> : <Hash aria-hidden="true" size={15} />}
                </button>
              </div>
              <div className="docs-blocks">
                {section.blocks.map((block, index) => renderBlock(block, `${section.id}-${index}`))}
              </div>
            </section>
          ))}

          <div className="docs-feedback" role="region" aria-label="Page feedback">
            <div>
              <MessageCircle aria-hidden="true" size={18} />
              <span>Was this page helpful?</span>
            </div>
            <div>
              <button className={feedback === "yes" ? "docs-feedback-selected" : undefined} type="button" onClick={() => setFeedback("yes")}>
                <Check aria-hidden="true" size={15} />
                Helpful
              </button>
              <button className={feedback === "no" ? "docs-feedback-selected" : undefined} type="button" onClick={() => setFeedback("no")}>
                Needs work
              </button>
            </div>
            {feedback ? <p role="status">Feedback saved for this session.</p> : null}
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
      </div>

      {isSearchOpen ? (
        <SearchDialog
          documents={searchDocuments}
          query={searchQuery}
          recentSearches={recentSearches}
          setQuery={setSearchQuery}
          setRecentSearches={setRecentSearches}
          onClose={() => setIsSearchOpen(false)}
        />
      ) : null}
    </div>
  );
}
