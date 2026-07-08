import React, { useEffect, useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import { sanitizeMermaidChart } from "../../../lib/sanitizeMermaid";

let mermaidInitialized = false;

function ensureMermaidInit() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "strict",
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif",
  });
  mermaidInitialized = true;
}

function MermaidBlock({ chart }) {
  const reactId = useId();
  const containerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!chart?.trim() || !containerRef.current) return;

    let cancelled = false;
    const renderId = `mermaid-${reactId.replace(/:/g, "")}`;

    async function renderChart() {
      const trimmed = chart.trim();
      const candidates = [trimmed, sanitizeMermaidChart(trimmed)].filter(
        (value, index, list) => value && list.indexOf(value) === index
      );

      try {
        ensureMermaidInit();
        let lastError = null;

        for (const candidate of candidates) {
          try {
            const { svg } = await mermaid.render(renderId, candidate);
            if (!cancelled && containerRef.current) {
              containerRef.current.innerHTML = svg;
              setError(null);
            }
            return;
          } catch (err) {
            lastError = err;
          }
        }

        throw lastError || new Error("Could not render diagram");
      } catch (err) {
        if (!cancelled) {
          if (containerRef.current) containerRef.current.innerHTML = "";
          setError(err?.message || "Could not render diagram");
        }
      }
    }

    renderChart();
    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  if (error) {
    return (
      <div className="my-4 space-y-2">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
          Could not render diagram. Showing source instead.
        </div>
        <pre className="p-3 rounded-xl border border-white/10 bg-black/40 text-[12px] text-gray-300 overflow-x-auto whitespace-pre-wrap font-mono">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 p-3 rounded-xl border border-white/10 bg-black/30 overflow-x-auto [&_svg]:max-w-full"
      data-testid="mermaid-block"
    />
  );
}

const markdownComponents = {
  h1: ({ children }) => (
    <h1 className="mt-4 mb-2 text-xl font-bold leading-tight text-gray-50 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-4 mb-2 text-lg font-bold leading-tight text-gray-100 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-1.5 text-base font-semibold leading-snug text-gray-100 first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-[15px] leading-7 text-gray-100 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1.5 pl-5 text-[15px] text-gray-200">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-[15px] text-gray-200">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-7">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
  em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#8befff] underline decoration-[#00f5d4]/35 underline-offset-4 transition-colors hover:text-white"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-[#00f5d4]/35 pl-3 text-gray-300">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-white/10" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-black/20">
      <table className="w-full text-left text-[13px] text-gray-200">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-white/5 text-gray-300">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-white/5">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 font-semibold text-[11px] uppercase tracking-wider">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2 align-top">{children}</td>,
  code: ({ inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || "");
    const language = match?.[1];
    const codeText = String(children).replace(/\n$/, "");

    if (!inline && language === "mermaid") {
      return <MermaidBlock chart={codeText} />;
    }

    if (inline) {
      return (
        <code
          className="rounded-md border border-white/10 bg-black/35 px-1.5 py-0.5 font-mono text-[13px] text-[#d8fbff]"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <div className="my-4 overflow-hidden rounded-2xl border border-white/10 bg-[#070810]">
        {language ? (
          <div className="border-b border-white/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
            {language}
          </div>
        ) : null}
        <pre className="overflow-x-auto p-3.5">
          <code className="font-mono text-[12px] leading-6 text-gray-300" {...props}>
            {codeText}
          </code>
        </pre>
      </div>
    );
  },
};

export default function MarkdownMessage({ text, className = "" }) {
  if (!text) return null;

  return (
    <div className={`markdown-message ${className}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
