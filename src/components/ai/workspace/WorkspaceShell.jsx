import React, { useEffect, useMemo, useRef } from "react";
import {
  Activity,
  ArrowLeft,
  Boxes,
  ChevronRight,
  ClipboardList,
  FileCode2,
  FolderTree,
} from "lib/icons";
import { useMotionPresence } from "../../../hooks/useMotionPresence";
import "./WorkspaceShell.css";

export const WORKSPACE_DRAWER_DEFAULT_WIDTH = 520;
export const WORKSPACE_DRAWER_MIN_WIDTH = 400;
export const WORKSPACE_DRAWER_MAX_WIDTH = 720;

export function clampWorkspaceDrawerWidth(width) {
  if (width == null || width === "") return WORKSPACE_DRAWER_DEFAULT_WIDTH;
  const numericWidth = Number(width);
  if (!Number.isFinite(numericWidth)) return WORKSPACE_DRAWER_DEFAULT_WIDTH;
  return Math.min(
    WORKSPACE_DRAWER_MAX_WIDTH,
    Math.max(WORKSPACE_DRAWER_MIN_WIDTH, Math.round(numericWidth)),
  );
}

export const WORKSPACE_DOCK_PANELS = [
  {
    id: "files",
    label: "Files",
    description: "Project files and Studio manifest",
    icon: FolderTree,
  },
  {
    id: "code",
    label: "Code",
    description: "Inspect and edit the selected script",
    icon: FileCode2,
  },
  {
    id: "activity",
    label: "Activity",
    description: "Agent runs, tasks, and approvals",
    icon: Activity,
  },
  {
    id: "assets",
    label: "Assets",
    description: "Project assets, Creator Store, and GLB files",
    icon: Boxes,
  },
  {
    id: "details",
    label: "Details",
    description: "Build summary, architecture, and diagnostics",
    icon: ClipboardList,
  },
];

function ToolButton({ tool, active, badge, onSelect }) {
  const Icon = tool.icon;
  const badgeLabel = typeof badge === "number" && badge > 9 ? "9+" : badge;

  return (
    <button
      type="button"
      className="workspace-tool-rail__button focus-ring"
      data-active={active ? "true" : "false"}
      aria-label={`${active ? "Close" : "Open"} ${tool.label}`}
      aria-pressed={active}
      aria-controls="workspace-context-drawer"
      onClick={() => onSelect(tool.id)}
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      {badge ? (
        <span
          className="workspace-tool-rail__badge"
          aria-label={typeof badge === "number" ? `${badge} unseen items` : "Unseen items"}
        >
          {badgeLabel === true ? "" : badgeLabel}
        </span>
      ) : null}
      <span className="workspace-tool-rail__tooltip" role="tooltip">{tool.label}</span>
    </button>
  );
}

export function WorkspaceEmptyState({ icon: Icon = FileCode2, title, description, action }) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center p-6 text-center">
      <div className="max-w-[260px]">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-gray-500">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        {description ? <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{description}</p> : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}

export default function WorkspaceShell({
  children,
  activePanel,
  onPanelChange,
  drawerWidth = WORKSPACE_DRAWER_DEFAULT_WIDTH,
  onDrawerWidthChange,
  panelBadges = {},
  renderPanel,
}) {
  const presence = useMotionPresence(Boolean(activePanel), 240);
  const resizeCleanupRef = useRef(null);
  const visiblePanelRef = useRef(activePanel);
  if (activePanel) visiblePanelRef.current = activePanel;
  const visiblePanel = activePanel || visiblePanelRef.current;
  const selectedTool = useMemo(
    () => WORKSPACE_DOCK_PANELS.find((tool) => tool.id === visiblePanel) || null,
    [visiblePanel],
  );
  const safeDrawerWidth = clampWorkspaceDrawerWidth(drawerWidth);

  useEffect(() => {
    if (!activePanel) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onPanelChange(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activePanel, onPanelChange]);

  useEffect(() => {
    if (!activePanel) return undefined;
    const timeoutId = window.setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [activePanel, safeDrawerWidth]);

  useEffect(() => () => resizeCleanupRef.current?.(), []);

  const beginResize = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = safeDrawerWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    const onPointerMove = (moveEvent) => {
      onDrawerWidthChange?.(clampWorkspaceDrawerWidth(startWidth + startX - moveEvent.clientX));
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      resizeCleanupRef.current = null;
      window.dispatchEvent(new Event("resize"));
    };

    resizeCleanupRef.current?.();
    resizeCleanupRef.current = cleanup;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", cleanup);
    window.addEventListener("pointercancel", cleanup);
  };

  const selectPanel = (panelId) => {
    onPanelChange(activePanel === panelId ? null : panelId);
  };

  const resizeWithKeyboard = (event) => {
    const step = event.shiftKey ? 40 : 16;
    let nextWidth;

    if (event.key === "ArrowLeft") nextWidth = safeDrawerWidth + step;
    if (event.key === "ArrowRight") nextWidth = safeDrawerWidth - step;
    if (event.key === "Home") nextWidth = WORKSPACE_DRAWER_MIN_WIDTH;
    if (event.key === "End") nextWidth = WORKSPACE_DRAWER_MAX_WIDTH;
    if (nextWidth == null) return;

    event.preventDefault();
    onDrawerWidthChange?.(clampWorkspaceDrawerWidth(nextWidth));
  };

  return (
    <section
      className="workspace-shell"
      data-drawer-open={presence.present ? "true" : "false"}
      style={{ "--workspace-drawer-width": `${safeDrawerWidth}px` }}
      aria-label="AI workspace"
    >
      <div className="workspace-shell__primary">{children}</div>

      {presence.present ? (
        <button
          type="button"
          className={`workspace-shell__backdrop ${presence.entering ? "is-entered" : ""}`}
          aria-label="Close workspace drawer"
          onClick={() => onPanelChange(null)}
        />
      ) : null}

      <div className="workspace-shell__dock">
        {presence.present ? (
          <div
            className="workspace-context-drawer__resizer"
            role="separator"
            aria-label="Resize workspace drawer"
            aria-orientation="vertical"
            aria-valuemin={WORKSPACE_DRAWER_MIN_WIDTH}
            aria-valuemax={WORKSPACE_DRAWER_MAX_WIDTH}
            aria-valuenow={safeDrawerWidth}
            tabIndex={0}
            onPointerDown={beginResize}
            onKeyDown={resizeWithKeyboard}
            onDoubleClick={() => onDrawerWidthChange?.(WORKSPACE_DRAWER_DEFAULT_WIDTH)}
          />
        ) : null}

        <nav className="workspace-tool-rail" aria-label="Workspace tools">
          <div className="workspace-tool-rail__group">
            {WORKSPACE_DOCK_PANELS.map((tool) => (
              <ToolButton
                key={tool.id}
                tool={tool}
                active={tool.id === activePanel}
                badge={panelBadges[tool.id]}
                onSelect={selectPanel}
              />
            ))}
          </div>
          <button
            type="button"
            className="workspace-tool-rail__button workspace-tool-rail__collapse focus-ring"
            disabled={!activePanel}
            aria-label="Collapse workspace drawer"
            onClick={() => onPanelChange(null)}
          >
            <ChevronRight className="h-[18px] w-[18px]" aria-hidden="true" />
            <span className="workspace-tool-rail__tooltip" role="tooltip">Collapse</span>
          </button>
        </nav>

        {presence.present ? (
          <aside
            id="workspace-context-drawer"
            className={`workspace-context-drawer ${presence.entering ? "is-entered" : ""}`}
            aria-label={selectedTool?.label || "Workspace drawer"}
          >
            <header className="workspace-context-drawer__header">
              <button
                type="button"
                className="workspace-context-drawer__back focus-ring"
                onClick={() => onPanelChange(null)}
                aria-label="Back to chat"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Back</span>
              </button>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-white">{selectedTool?.label}</h2>
                <p className="truncate text-[11px] text-gray-500">{selectedTool?.description}</p>
              </div>
              <button
                type="button"
                className="workspace-context-drawer__close focus-ring"
                onClick={() => onPanelChange(null)}
                aria-label="Close workspace drawer"
                title="Close drawer"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>
            <div className="workspace-context-drawer__body">
              {selectedTool ? renderPanel?.(selectedTool.id) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
