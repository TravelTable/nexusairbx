import React, { useState, useMemo } from "react";
import { X, ChevronDown, ChevronRight, Folder, Code2, Zap, Tag, Layout, Server } from "lib/icons";

/**
 * Normalize projectContext for display (supports backend schema + legacy top-level remoteEvents/modules/tags).
 */
function normalizeForDisplay(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      remoteEvents: [],
      remoteFunctions: [],
      modules: [],
      tags: [],
      services: {
        ReplicatedStorage: { modules: [], remoteEvents: [], remoteFunctions: [] },
        ServerScriptService: { scripts: [] },
        StarterGui: { screens: [] },
        StarterPlayer: { scripts: [] },
      },
      gameState: null,
    };
  }
  const rs = raw.services?.ReplicatedStorage || {};
  const remoteEvents = Array.isArray(raw.remoteEvents) ? raw.remoteEvents : (rs.remoteEvents || []);
  const remoteFunctions = Array.isArray(raw.remoteFunctions) ? raw.remoteFunctions : (rs.remoteFunctions || []);
  const modules = Array.isArray(raw.modules) ? raw.modules : (rs.modules || []);
  const tags = Array.isArray(raw.tags) ? raw.tags : [];
  const services = {
    ReplicatedStorage: { modules: modules.length ? modules : (rs.modules || []), remoteEvents, remoteFunctions },
    ServerScriptService: raw.services?.ServerScriptService || { scripts: [] },
    StarterGui: raw.services?.StarterGui || { screens: [] },
    StarterPlayer: raw.services?.StarterPlayer || { scripts: [] },
  };
  const gameState = raw.gameState && typeof raw.gameState === "object" ? raw.gameState : null;
  return { remoteEvents, remoteFunctions, modules, tags, services, gameState };
}

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[var(--ds-border-subtle)] rounded-xl bg-[var(--ds-fill-subtle)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-[var(--ds-text)] hover:bg-[var(--ds-fill-subtle)] transition-colors"
      >
        {open ? <ChevronDown className="w-4 h-4 text-[var(--ds-text-secondary)]" /> : <ChevronRight className="w-4 h-4 text-[var(--ds-text-secondary)]" />}
        {Icon && <Icon className="w-4 h-4 text-[var(--ds-accent)]" />}
        {title}
      </button>
      {open && <div className="px-4 pb-3 border-t border-[var(--ds-border-subtle)]">{children}</div>}
    </div>
  );
}

function ListItems({ items, renderItem, emptyMessage = "None" }) {
  if (!items?.length) return <p className="text-xs text-[var(--ds-text-muted)] mt-1">{emptyMessage}</p>;
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-xs text-[var(--ds-text-secondary)] font-mono">
          {typeof renderItem === "function" ? renderItem(item, i) : String(item?.name ?? item ?? "")}
        </li>
      ))}
    </ul>
  );
}

export default function ProjectArchitecturePanel({ context, onClose, onSync, embedded = false }) {
  const normalized = useMemo(() => normalizeForDisplay(context), [context]);
  const hasAny =
    normalized.remoteEvents?.length ||
    normalized.remoteFunctions?.length ||
    normalized.modules?.length ||
    normalized.tags?.length ||
    (normalized.services?.ServerScriptService?.scripts?.length) ||
    (normalized.services?.StarterGui?.screens?.length) ||
    (normalized.services?.StarterPlayer?.scripts?.length) ||
    (normalized.gameState && (normalized.gameState.events?.length || normalized.gameState.properties?.length));

  return (
    <div className={`flex h-full flex-col ${embedded ? "bg-transparent" : "border-l border-[var(--ds-border-subtle)] bg-[var(--ds-fill-hover)]"}`}>
      {!embedded ? (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ds-border-subtle)] shrink-0">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-[var(--ds-accent)]" />
            <h2 className="text-sm font-bold text-[var(--ds-text)] uppercase tracking-wider">Project Architecture</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--ds-fill-hover)] text-[var(--ds-text-secondary)] hover:text-[var(--ds-text)] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-subtle">
        {!hasAny ? (
          <div className="rounded-xl bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)] p-6 text-center">
            <p className="text-sm text-[var(--ds-text-secondary)] mb-2">No project context yet.</p>
            <p className="text-xs text-[var(--ds-text-muted)] mb-4">Add your game's Remotes, Modules, and services so the AI can generate code that fits your project.</p>
            {onSync && (
              <button
                type="button"
                onClick={onSync}
                className="px-4 py-2 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent)] text-xs font-semibold hover:bg-[var(--ds-accent-soft)] transition-colors"
              >
                Add Project Context
              </button>
            )}
          </div>
        ) : (
          <>
            <Section title="ReplicatedStorage" icon={Folder} defaultOpen={true}>
              <div className="pt-2">
                <span className="text-[10px] font-bold text-[var(--ds-text-muted)] uppercase tracking-wider">Remote Events</span>
                <ListItems
                  items={normalized.remoteEvents}
                  renderItem={(e) => (
                    <span>
                      {e.name}
                      {e.direction ? ` (${e.direction})` : ""}
                      {e.args?.length ? ` [${e.args.join(", ")}]` : ""}
                    </span>
                  )}
                />
              </div>
              <div className="pt-3">
                <span className="text-[10px] font-bold text-[var(--ds-text-muted)] uppercase tracking-wider">Remote Functions</span>
                <ListItems
                  items={normalized.remoteFunctions}
                  renderItem={(f) => (
                    <span>
                      {f.name}
                      {f.returns ? ` → ${f.returns}` : ""}
                      {f.args?.length ? ` [${f.args.join(", ")}]` : ""}
                    </span>
                  )}
                />
              </div>
              <div className="pt-3">
                <span className="text-[10px] font-bold text-[var(--ds-text-muted)] uppercase tracking-wider">Modules</span>
                <ListItems
                  items={normalized.modules}
                  renderItem={(m) => (
                    <span>
                      {m.name}
                      {m.path ? ` (${m.path})` : ""}
                      {m.description ? ` — ${m.description}` : ""}
                    </span>
                  )}
                />
              </div>
            </Section>

            <Section title="ServerScriptService" icon={Server} defaultOpen={true}>
              <ListItems
                items={normalized.services?.ServerScriptService?.scripts}
                renderItem={(s) => (typeof s === "string" ? s : s?.name || s?.path || JSON.stringify(s))}
              />
            </Section>

            <Section title="StarterGui" icon={Layout} defaultOpen={false}>
              <ListItems
                items={normalized.services?.StarterGui?.screens}
                renderItem={(s) => (typeof s === "string" ? s : s?.name || JSON.stringify(s))}
              />
            </Section>

            <Section title="StarterPlayer" icon={Code2} defaultOpen={false}>
              <ListItems
                items={normalized.services?.StarterPlayer?.scripts}
                renderItem={(s) => (typeof s === "string" ? s : s?.name || JSON.stringify(s))}
              />
            </Section>

            {normalized.tags?.length > 0 && (
              <Section title="Tags" icon={Tag} defaultOpen={true}>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {normalized.tags.map((t, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-[color-mix(in_srgb,var(--ds-info)_12%,transparent)] px-2 py-0.5 font-mono text-xs text-[var(--ds-info)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {normalized.gameState && (normalized.gameState.events?.length || normalized.gameState.properties?.length) && (
              <Section title="Game State" icon={Zap} defaultOpen={true}>
                {normalized.gameState.events?.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-[var(--ds-text-muted)] uppercase tracking-wider">Events</span>
                    <ListItems items={normalized.gameState.events} />
                  </div>
                )}
                {normalized.gameState.properties?.length > 0 && (
                  <div className="pt-3">
                    <span className="text-[10px] font-bold text-[var(--ds-text-muted)] uppercase tracking-wider">Properties</span>
                    <ListItems items={normalized.gameState.properties} />
                  </div>
                )}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
