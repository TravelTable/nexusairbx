import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
export const WORKSPACE_DRAWER_OVERLAY_BREAKPOINT = 1500;
export const WORKSPACE_DRAWER_MOBILE_BREAKPOINT = 600;

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getVisibleFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
    let currentElement = element;
    while (currentElement) {
      const style = window.getComputedStyle(currentElement);
      if (currentElement.hidden || style.display === "none" || style.visibility === "hidden") {
        return false;
      }
      if (currentElement === container) break;
      currentElement = currentElement.parentElement;
    }
    return true;
  });
}

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
      onClick={(event) => onSelect(tool.id, event.currentTarget)}
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
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-muted)]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--ds-text)]">{title}</h3>
        {description ? <p className="mt-1.5 text-xs leading-relaxed text-[var(--ds-text-muted)]">{description}</p> : null}
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
  const [containerWidth, setContainerWidth] = useState(null);
  const shellRef = useRef(null);
  const dockRef = useRef(null);
  const drawerRef = useRef(null);
  const backButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  const openerRef = useRef(null);
  const resizeCleanupRef = useRef(null);
  const visiblePanelRef = useRef(activePanel);
  if (activePanel) visiblePanelRef.current = activePanel;
  const visiblePanel = activePanel || visiblePanelRef.current;
  const selectedTool = useMemo(
    () => WORKSPACE_DOCK_PANELS.find((tool) => tool.id === visiblePanel) || null,
    [visiblePanel],
  );
  const safeDrawerWidth = clampWorkspaceDrawerWidth(drawerWidth);
  const isOverlayBreakpoint = containerWidth != null
    && containerWidth < WORKSPACE_DRAWER_OVERLAY_BREAKPOINT;
  const isMobileBreakpoint = containerWidth != null
    && containerWidth < WORKSPACE_DRAWER_MOBILE_BREAKPOINT;
  const isModalDrawerOpen = Boolean(activePanel && isOverlayBreakpoint);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;

    const updateWidth = (nextWidth) => {
      if (Number.isFinite(nextWidth) && nextWidth > 0) setContainerWidth(nextWidth);
    };
    const measure = () => updateWidth(shell.getBoundingClientRect().width);
    measure();

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver((entries) => {
        const entry = entries.find((candidate) => candidate.target === shell) || entries[0];
        updateWidth(entry?.contentRect?.width);
      });
      observer.observe(shell);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const closePanel = useCallback(() => {
    const shouldRestoreFocus = isModalDrawerOpen;
    const opener = openerRef.current;
    onPanelChange(null);
    if (shouldRestoreFocus && opener?.isConnected) opener.focus();
    openerRef.current = null;
  }, [isModalDrawerOpen, onPanelChange]);

  useEffect(() => {
    if (!activePanel) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
        return;
      }

      if (event.key !== "Tab" || !isModalDrawerOpen) return;
      const focusableElements = getVisibleFocusableElements(dockRef.current);
      if (!focusableElements.length) {
        event.preventDefault();
        drawerRef.current?.focus();
        return;
      }

      const currentIndex = focusableElements.indexOf(document.activeElement);
      const shouldWrapBackward = event.shiftKey && currentIndex <= 0;
      const shouldWrapForward = !event.shiftKey
        && (currentIndex === -1 || currentIndex === focusableElements.length - 1);
      if (!shouldWrapBackward && !shouldWrapForward) return;

      event.preventDefault();
      focusableElements[
        shouldWrapBackward ? focusableElements.length - 1 : 0
      ].focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activePanel, closePanel, isModalDrawerOpen]);

  useLayoutEffect(() => {
    if (!isModalDrawerOpen) return;
    const activeElement = document.activeElement;
    if (!openerRef.current?.isConnected && activeElement && !dockRef.current?.contains(activeElement)) {
      openerRef.current = activeElement;
    }
    const initialFocus = isMobileBreakpoint ? backButtonRef.current : closeButtonRef.current;
    (initialFocus || drawerRef.current)?.focus();
  }, [isMobileBreakpoint, isModalDrawerOpen, presence.present, visiblePanel]);

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

  const selectPanel = (panelId, trigger) => {
    if (activePanel === panelId) {
      closePanel();
      return;
    }
    openerRef.current = trigger;
    onPanelChange(panelId);
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
      ref={shellRef}
      className="workspace-shell"
      data-drawer-open={presence.present ? "true" : "false"}
      style={{ "--workspace-drawer-width": `${safeDrawerWidth}px` }}
      aria-label="AI workspace"
    >
      <div
        className="workspace-shell__primary"
        role="group"
        aria-label="Workspace content"
        aria-hidden={isModalDrawerOpen ? "true" : undefined}
        {...(isModalDrawerOpen ? { inert: "" } : {})}
      >
        {children}
      </div>

      {presence.present ? (
        <button
          type="button"
          className={`workspace-shell__backdrop ${presence.entering ? "is-entered" : ""}`}
          aria-label="Close workspace drawer"
          aria-hidden={isModalDrawerOpen ? "true" : undefined}
          tabIndex={isModalDrawerOpen ? -1 : undefined}
          onClick={closePanel}
        />
      ) : null}

      <div
        ref={dockRef}
        className="workspace-shell__dock"
        role={isModalDrawerOpen ? "dialog" : undefined}
        aria-modal={isModalDrawerOpen ? "true" : undefined}
        aria-labelledby={isModalDrawerOpen ? "workspace-context-drawer-title" : undefined}
      >
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
            onClick={closePanel}
          >
            <ChevronRight className="h-[18px] w-[18px]" aria-hidden="true" />
            <span className="workspace-tool-rail__tooltip" role="tooltip">Collapse</span>
          </button>
        </nav>

        {presence.present ? (
          <aside
            ref={drawerRef}
            id="workspace-context-drawer"
            className={`workspace-context-drawer ${presence.entering ? "is-entered" : ""}`}
            aria-label={selectedTool?.label || "Workspace drawer"}
            role={isModalDrawerOpen ? "document" : undefined}
            tabIndex={isModalDrawerOpen ? -1 : undefined}
          >
            <header className="workspace-context-drawer__header">
              <button
                type="button"
                ref={backButtonRef}
                className="workspace-context-drawer__back focus-ring"
                onClick={closePanel}
                aria-label="Back to chat"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Back</span>
              </button>
              <div className="min-w-0">
                <h2 id="workspace-context-drawer-title" className="truncate text-sm font-semibold text-[var(--ds-text)]">{selectedTool?.label}</h2>
                <p className="truncate text-[11px] text-[var(--ds-text-muted)]">{selectedTool?.description}</p>
              </div>
              <button
                type="button"
                ref={closeButtonRef}
                className="workspace-context-drawer__close focus-ring"
                onClick={closePanel}
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
