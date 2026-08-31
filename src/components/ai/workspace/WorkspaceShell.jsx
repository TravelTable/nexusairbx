import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  ArrowLeft,
  Boxes,
  ClipboardList,
  FileCode2,
  FolderTree,
  Maximize2,
  X,
} from "lib/icons";
import { useMotionPresence } from "../../../hooks/useMotionPresence";
import "./WorkspaceShell.css";

export const WORKSPACE_DRAWER_DEFAULT_WIDTH = 520;
export const WORKSPACE_DRAWER_MIN_WIDTH = 400;
export const WORKSPACE_DRAWER_MAX_WIDTH = 720;
export const WORKSPACE_DRAWER_OVERLAY_BREAKPOINT = 1180;
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
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) => {
      let currentElement = element;
      while (currentElement) {
        const style = window.getComputedStyle(currentElement);
        if (
          currentElement.hidden ||
          style.display === "none" ||
          style.visibility === "hidden"
        ) {
          return false;
        }
        if (currentElement === container) break;
        currentElement = currentElement.parentElement;
      }
      return true;
    },
  );
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
    description: "Project files and the live Studio manifest",
    icon: FolderTree,
  },
  {
    id: "code",
    label: "Editor",
    description: "Inspect and edit the selected Roblox script",
    icon: FileCode2,
  },
  {
    id: "activity",
    label: "Run",
    description: "Request progress, agent runs, tests, and approvals",
    icon: Activity,
  },
  {
    id: "assets",
    label: "Assets",
    description: "Project assets and Creator Store references",
    icon: Boxes,
  },
  {
    id: "details",
    label: "Report",
    description: "Build summary, project structure, and validation evidence",
    icon: ClipboardList,
  },
];

export function WorkspaceEmptyState({ title, description, action }) {
  return (
    <div className="workspace-stage-empty">
      <div className="workspace-stage-empty__content">
        <span className="workspace-stage-empty__eyebrow">Waiting for evidence</span>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
        {action ? (
          <div className="workspace-stage-empty__action">{action}</div>
        ) : null}
      </div>
    </div>
  );
}

function EvidenceLensBar({
  activePanel,
  selectedPanel,
  panelBadges,
  onSelect,
  tabPanelId,
  tabIdPrefix,
  containerRef,
  compact = false,
}) {
  const moveFocus = (event) => {
    const tabs = Array.from(
      event.currentTarget.querySelectorAll('[role="tab"]'),
    );
    const currentIndex = tabs.indexOf(event.target.closest('[role="tab"]'));
    if (currentIndex < 0 || !tabs.length) return;
    let nextIndex;
    if (["ArrowRight", "ArrowDown"].includes(event.key))
      nextIndex = (currentIndex + 1) % tabs.length;
    if (["ArrowLeft", "ArrowUp"].includes(event.key))
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex == null) return;
    event.preventDefault();
    tabs[nextIndex].focus();
  };

  return (
    <div
      ref={containerRef}
      className={`workspace-evidence-lenses ${compact ? "workspace-evidence-lenses--compact" : ""}`}
      role="tablist"
      aria-label="Evidence lenses"
      onKeyDown={moveFocus}
    >
      {WORKSPACE_DOCK_PANELS.map((tool) => {
        const badge = panelBadges[tool.id];
        const isSelected = selectedPanel === tool.id;
        const ToolIcon = tool.icon;
        return (
          <button
            key={tool.id}
            id={`${tabIdPrefix}-${tool.id}`}
            type="button"
            role="tab"
            aria-controls={tabPanelId}
            aria-selected={isSelected}
            aria-label={`Open ${tool.label} evidence`}
            tabIndex={isSelected ? 0 : -1}
            className="workspace-evidence-lenses__item focus-ring"
            data-active={activePanel === tool.id ? "true" : "false"}
            data-evidence-lens={tool.id}
            onClick={(event) => onSelect(tool.id, event.currentTarget)}
          >
            <span
              className="workspace-evidence-lenses__label"
              aria-hidden={compact ? "true" : undefined}
            >
              <ToolIcon aria-hidden="true" />
              {!compact ? <span>{tool.label}</span> : null}
            </span>
            {badge ? (
              <span
                className="workspace-evidence-lenses__badge"
                aria-label={
                  typeof badge === "number"
                    ? `${badge} unseen items`
                    : "Unseen items"
                }
              >
                {typeof badge === "number" ? Math.min(badge, 99) : ""}
              </span>
            ) : null}
          </button>
        );
      })}
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
  hideEvidenceLauncher = false,
  evidenceLauncherRef = null,
}) {
  const shellId = useId().replace(/:/g, "");
  const stageId = `workspace-context-drawer-${shellId}`;
  const stageTitleId = `workspace-stage-title-${shellId}`;
  const tabPanelId = `workspace-evidence-panel-${shellId}`;
  const stageTabIdPrefix = `workspace-evidence-stage-tab-${shellId}`;
  const presence = useMotionPresence(Boolean(activePanel), 300);
  const [containerWidth, setContainerWidth] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const shellRef = useRef(null);
  const stageRef = useRef(null);
  const backButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  const internalLauncherRef = useRef(null);
  const launcherRef = evidenceLauncherRef || internalLauncherRef;
  const stageLensRef = useRef(null);
  const openerRef = useRef(null);
  const restoreLauncherFocusRef = useRef(false);
  const pendingInlineFocusRef = useRef(false);
  const previousActivePanelRef = useRef(activePanel);
  const previousModalStateRef = useRef(false);
  const resizeCleanupRef = useRef(null);
  const visiblePanelRef = useRef(activePanel || "details");
  if (activePanel) visiblePanelRef.current = activePanel;
  const visiblePanel = activePanel || visiblePanelRef.current;
  const selectedTool = useMemo(
    () =>
      WORKSPACE_DOCK_PANELS.find((tool) => tool.id === visiblePanel) ||
      WORKSPACE_DOCK_PANELS.at(-1),
    [visiblePanel],
  );
  const safeDrawerWidth = clampWorkspaceDrawerWidth(drawerWidth);
  const isOverlayBreakpoint =
    containerWidth != null &&
    containerWidth < WORKSPACE_DRAWER_OVERLAY_BREAKPOINT;
  const isMobileBreakpoint =
    containerWidth != null &&
    containerWidth < WORKSPACE_DRAWER_MOBILE_BREAKPOINT;
  const isModalStageOpen = Boolean(
    activePanel && (isOverlayBreakpoint || fullscreen),
  );
  const hasAnyBadge = Object.values(panelBadges).some(Boolean);
  const evidenceCount = Object.values(panelBadges).reduce(
    (total, badge) =>
      total + (typeof badge === "number" ? badge : badge ? 1 : 0),
    0,
  );

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;
    const updateWidth = (nextWidth) => {
      if (Number.isFinite(nextWidth) && nextWidth > 0)
        setContainerWidth(nextWidth);
    };
    const measure = () => updateWidth(shell.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver((entries) => {
        const entry =
          entries.find((candidate) => candidate.target === shell) || entries[0];
        updateWidth(entry?.contentRect?.width);
      });
      observer.observe(shell);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const closeStage = useCallback(() => {
    restoreLauncherFocusRef.current = true;
    setFullscreen(false);
    onPanelChange(null);
    openerRef.current = null;
  }, [onPanelChange]);

  useLayoutEffect(() => {
    if (activePanel || !restoreLauncherFocusRef.current || !launcherRef.current)
      return;
    restoreLauncherFocusRef.current = false;
    launcherRef.current.focus();
  }, [activePanel, launcherRef]);

  const openStage = useCallback(
    (panelId = visiblePanel, trigger = launcherRef.current) => {
      openerRef.current = trigger || launcherRef.current;
      onPanelChange(panelId || "details");
    },
    [launcherRef, onPanelChange, visiblePanel],
  );

  const selectPanel = useCallback(
    (panelId, trigger) => {
      openStage(panelId, trigger || openerRef.current || launcherRef.current);
    },
    [launcherRef, openStage],
  );

  useEffect(() => {
    if (!activePanel) setFullscreen(false);
  }, [activePanel]);

  useEffect(() => {
    if (!activePanel) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (fullscreen) {
          setFullscreen(false);
          closeButtonRef.current?.focus();
        } else {
          closeStage();
        }
        return;
      }
      if (event.key !== "Tab" || !isModalStageOpen) return;
      const focusableElements = getVisibleFocusableElements(stageRef.current);
      if (!focusableElements.length) {
        event.preventDefault();
        stageRef.current?.focus();
        return;
      }
      const currentIndex = focusableElements.indexOf(document.activeElement);
      const shouldWrapBackward = event.shiftKey && currentIndex <= 0;
      const shouldWrapForward =
        !event.shiftKey &&
        (currentIndex === -1 || currentIndex === focusableElements.length - 1);
      if (!shouldWrapBackward && !shouldWrapForward) return;
      event.preventDefault();
      focusableElements[
        shouldWrapBackward ? focusableElements.length - 1 : 0
      ].focus();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activePanel, closeStage, fullscreen, isModalStageOpen]);

  useLayoutEffect(() => {
    const wasOpen = Boolean(previousActivePanelRef.current);
    const isOpen = Boolean(activePanel);
    if (isOpen && !wasOpen) pendingInlineFocusRef.current = true;
    if (!isOpen) {
      pendingInlineFocusRef.current = false;
      previousModalStateRef.current = false;
    }
    previousActivePanelRef.current = activePanel;
  }, [activePanel]);

  useLayoutEffect(() => {
    if (!activePanel || !presence.present) return;

    const becameModal = isModalStageOpen && !previousModalStateRef.current;
    if (becameModal) {
      const activeElement = document.activeElement;
      if (
        !openerRef.current?.isConnected &&
        activeElement &&
        !stageRef.current?.contains(activeElement)
      ) {
        openerRef.current = activeElement;
      }
      const initialFocus = isMobileBreakpoint
        ? backButtonRef.current
        : closeButtonRef.current;
      (initialFocus || stageRef.current)?.focus();
      pendingInlineFocusRef.current = false;
    } else if (!isModalStageOpen && pendingInlineFocusRef.current) {
      const selectedLens = stageLensRef.current?.querySelector(
        `[data-evidence-lens="${activePanel}"]`,
      );
      (selectedLens || stageRef.current)?.focus();
      pendingInlineFocusRef.current = false;
    }

    previousModalStateRef.current = isModalStageOpen;
  }, [activePanel, isMobileBreakpoint, isModalStageOpen, presence.present]);

  useEffect(() => {
    if (!activePanel) return undefined;
    const timeoutId = window.setTimeout(
      () => window.dispatchEvent(new Event("resize")),
      310,
    );
    return () => window.clearTimeout(timeoutId);
  }, [activePanel, safeDrawerWidth, fullscreen]);

  useEffect(() => () => resizeCleanupRef.current?.(), []);

  const beginResize = (event) => {
    if (event.button !== 0 || isOverlayBreakpoint || fullscreen) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = safeDrawerWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    const onPointerMove = (moveEvent) => {
      onDrawerWidthChange?.(
        clampWorkspaceDrawerWidth(startWidth + startX - moveEvent.clientX),
      );
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
      data-stage-open={presence.present ? "true" : "false"}
      data-stage-modal={isModalStageOpen ? "true" : "false"}
      data-stage-fullscreen={fullscreen ? "true" : "false"}
      data-evidence-launcher={!activePanel && !hideEvidenceLauncher ? "true" : "false"}
      style={{ "--workspace-drawer-width": `${safeDrawerWidth}px` }}
      aria-label="AI workspace"
    >
      <div
        className="workspace-shell__primary"
        role="group"
        aria-label="Workspace content"
        aria-hidden={isModalStageOpen ? "true" : undefined}
        {...(isModalStageOpen ? { inert: "" } : {})}
      >
        {children}
      </div>

      {!activePanel && !hideEvidenceLauncher ? (
        <nav
          className="workspace-evidence-edge"
          aria-label="Open evidence stage"
        >
          <button
            ref={launcherRef}
            type="button"
            className="workspace-evidence-edge__label focus-ring"
            aria-label={
              evidenceCount
                ? `Open Stage evidence, ${evidenceCount} new ${evidenceCount === 1 ? "item" : "items"}`
                : "Open Stage evidence"
            }
            aria-controls={stageId}
            aria-expanded="false"
            onClick={(event) => openStage(visiblePanel, event.currentTarget)}
          >
            <span>Evidence</span>
            <span className="workspace-evidence-edge__count" aria-hidden="true">
              {evidenceCount}
            </span>
            {hasAnyBadge ? (
              <span
                className="workspace-evidence-edge__signal"
                aria-label="New evidence"
              />
            ) : null}
          </button>
        </nav>
      ) : null}

      {presence.present && isModalStageOpen ? (
        <button
          type="button"
          className={`workspace-shell__backdrop ${presence.entering ? "is-entered" : ""}`}
          aria-label="Close Stage"
          tabIndex={-1}
          onClick={closeStage}
        />
      ) : null}

      {presence.present ? (
        <aside
          ref={stageRef}
          id={stageId}
          className={`workspace-stage ${presence.entering ? "is-entered" : ""}`}
          role={isModalStageOpen ? "dialog" : "complementary"}
          aria-modal={isModalStageOpen ? "true" : undefined}
          aria-labelledby={stageTitleId}
          tabIndex={isModalStageOpen ? -1 : undefined}
        >
          {!isModalStageOpen ? (
            <div
              className="workspace-stage__resizer"
              role="separator"
              aria-label="Resize Stage"
              aria-orientation="vertical"
              aria-valuemin={WORKSPACE_DRAWER_MIN_WIDTH}
              aria-valuemax={WORKSPACE_DRAWER_MAX_WIDTH}
              aria-valuenow={safeDrawerWidth}
              tabIndex={0}
              onPointerDown={beginResize}
              onKeyDown={resizeWithKeyboard}
              onDoubleClick={() =>
                onDrawerWidthChange?.(WORKSPACE_DRAWER_DEFAULT_WIDTH)
              }
            />
          ) : null}

          <header className="workspace-stage__header">
            <button
              type="button"
              ref={backButtonRef}
              className="workspace-stage__back focus-ring"
              onClick={closeStage}
              aria-label="Back to conversation"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Conversation</span>
            </button>

            <div className="workspace-stage__identity">
              <div className="min-w-0">
                <span className="workspace-stage__eyebrow">Evidence stage</span>
                <h2 id={stageTitleId}>{selectedTool.label}</h2>
              </div>
            </div>

            <div className="workspace-stage__actions">
              {!isMobileBreakpoint ? (
                <button
                  type="button"
                  className="workspace-stage__action workspace-stage__icon-action focus-ring"
                  aria-label={
                    fullscreen ? "Exit full screen" : "Enter full screen"
                  }
                  aria-pressed={fullscreen}
                  onClick={() => setFullscreen((current) => !current)}
                >
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
              <button
                type="button"
                ref={closeButtonRef}
                className="workspace-stage__action workspace-stage__icon-action focus-ring"
                onClick={closeStage}
                aria-label="Close Stage"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <EvidenceLensBar
              activePanel={activePanel}
              selectedPanel={visiblePanel}
              panelBadges={panelBadges}
              onSelect={selectPanel}
              tabPanelId={tabPanelId}
              tabIdPrefix={stageTabIdPrefix}
              containerRef={stageLensRef}
            />
          </header>

          <div
            id={tabPanelId}
            className="workspace-stage__body"
            role="tabpanel"
            aria-labelledby={`${stageTabIdPrefix}-${selectedTool.id}`}
            tabIndex={0}
          >
            {selectedTool ? renderPanel?.(selectedTool.id) : null}
          </div>
        </aside>
      ) : null}
    </section>
  );
}
