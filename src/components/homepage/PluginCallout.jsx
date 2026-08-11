export default function PluginCallout({ className = "" }) {
  return (
    <div
      className={`pointer-events-none absolute left-1/2 top-[calc(100%-6px)] z-10 w-[min(270px,36vw)] -translate-x-[24%] aspect-[3.2/1] ${className}`}
      aria-hidden="true"
    >
      <span className="absolute left-[38%] top-[58%] whitespace-nowrap text-[13px] font-medium tracking-tight text-[var(--ds-text-muted)]">
        Download our plugin here!
      </span>
      <svg viewBox="0 0 300 94" fill="none" className="absolute inset-0 h-full w-full overflow-visible">
        <path
          d="M 122 61 C 94 47, 70 17, 24 5"
          stroke="var(--ds-accent)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M 34 2 L 23 5 L 29 15"
          stroke="var(--ds-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
