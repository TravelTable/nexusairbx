import React, { useEffect, useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";

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
      try {
        ensureMermaidInit();
        const { svg } = await mermaid.render(renderId, chart.trim());
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
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
      <pre className="my-3 p-3 rounded-xl border border-white/10 bg-black/40 text-[12px] text-gray-300 overflow-x-auto whitespace-pre-wrap font-mono">
        {chart}
      </pre>
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
    <h1 className="text-xl font-bold text-gray-50 mt-4 mb-2 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold text-gray-100 mt-4 mb-2 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-gray-100 mt-3 mb-1.5 first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-[15px] leading-relaxed text-gray-100 mb-3 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 mb-3 space-y-1 text-[15px] text-gray-200">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 mb-3 space-y-1 text-[15px] text-gray-200">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="text-[#00f5d4] font-bold">{children}</strong>,
  em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#00f5d4] underline underline-offset-2 hover:text-[#9b5de5]"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#9b5de5]/50 pl-3 my-3 text-gray-300 italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-white/10" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-white/10">
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
          className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[13px] font-mono text-[#00f5d4]"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <pre className="my-3 p-3 rounded-xl border border-white/10 bg-black/40 overflow-x-auto">
        <code className="text-[12px] leading-relaxed font-mono text-gray-300" {...props}>
          {codeText}
        </code>
      </pre>
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
