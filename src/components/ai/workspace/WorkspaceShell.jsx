import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  ArrowLeft,
  Boxes,
  Check,
  ChevronDown,
  ClipboardList,
  FileCode2,
  FolderTree,
  Layers,
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
    description: "Project files and the live Studio manifest",
    icon: FolderTree,
  },
  {
    id: "code",
    label: "Code",
    description: "Inspect and edit the selected Roblox script",
    icon: FileCode2,
  },
  {
    id: "activity",
    label: "Activity",
    description: "Request progress, agent runs, and approvals",
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
    label: "Project",
    description: "Build summary, architecture, and diagnostics",
    icon: ClipboardList,
  },
];

export function WorkspaceEmptyState({ icon: Icon = FileCode2, title, description, action }) {
  return (
    <div className="workspace-stage-empty">
      <div className="workspace-stage-empty__content">
        <div className="workspace-stage-empty__icon" aria-hidden="true">
          <Icon className="h-5 w-5" />
        </div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
        {action ? <div className="workspace-stage-empty__action">{action}</div> : null}
      </div>
    </div>
  );
}

function StageViewMenu({
  open,
  activePanel,
  panelBadges,
  onSelect,
  onClose,
  anchorRef,
}) {
  const menuRef = useRef(null);

  const getMenuItems = useCallback(
    () => Array.from(menuRef.current?.querySelectorAll('[role="menuitemradio"]') || []),
    [],
  );

  useLayoutEffect(() => {
    if (!open) return;
    const menuItems = getMenuItems();
    const activeItem = menuItems.find((item) => item.getAttribute("aria-checked") === "true");
    (activeItem || menuItems[0])?.focus();
  }, [activePanel, getMenuItems, open]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (event) => {
      if (menuRef.current?.contains(event.target) || anchorRef.current?.contains(event.target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handlePointer);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
    };
  }, [anchorRef, onClose, open]);

  const handleMenuKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      anchorRef.current?.focus();
      return;
    }

    const menuItems = getMenuItems();
    if (!menuItems.length) return;
    const currentIndex = Math.max(0, menuItems.indexOf(document.activeElement));
    let nextIndex;
    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % menuItems.length;
    if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = menuItems.length - 1;
    if (nextIndex == null) return;
    event.preventDefault();
    menuItems[nextIndex].focus();
  };

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className="workspace-stage-menu"
      role="menu"
      aria-label="Stage views"
      onKeyDown={handleMenuKeyDown}
    >
      <div className="workspace-stage-menu__eyebrow">Show on Stage</div>
      {WORKSPACE_DOCK_PANELS.map((tool) => {
        const Icon = tool.icon;
        const badge = panelBadges[tool.id];
        return (
          <button
            key={tool.id}
            type="button"
            role="menuitemradio"
            tabIndex={-1}
            aria-checked={activePanel === tool.id}
            aria-label={`Open ${tool.label}`}
            className="workspace-stage-menu__item focus-ring"
            data-active={activePanel === tool.id ? "true" : "false"}
            onClick={(event) => onSelect(tool.id, event.currentTarget)}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="workspace-stage-menu__copy">
              <strong>{tool.label}</strong>
              <small>{tool.description}</small>
            </span>
            {badge ? (
              <span className="workspace-stage-menu__badge" aria-label={typeof badge === "number" ? `${badge} unseen items` : "Unseen items"}>
                {typeof badge === "number" ? Math.min(badge, 99) : ""}
              </span>
            ) : null}
            {activePanel === tool.id ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
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
}) {
  const presence = useMotionPresence(Boolean(activePanel), 300);
  const [containerWidth, setContainerWidth] = useState(null);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const shellRef = useRef(null);
  const stageRef = useRef(null);
  const backButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  const launcherRef = useRef(null);
  const viewMenuButtonRef = useRef(null);
  const openerRef = useRef(null);
  const restoreLauncherFocusRef = useRef(false);
  const resizeCleanupRef = useRef(null);
  const visiblePanelRef = useRef(activePanel || "details");
  if (activePanel) visiblePanelRef.current = activePanel;
  const visiblePanel = activePanel || visiblePanelRef.current;
  const selectedTool = useMemo(
    () => WORKSPACE_DOCK_PANELS.find((tool) => tool.id === visiblePanel) || WORKSPACE_DOCK_PANELS.at(-1),
    [visiblePanel],
  );
  const SelectedIcon = selectedTool.icon;
  const safeDrawerWidth = clampWorkspaceDrawerWidth(drawerWidth);
  const isOverlayBreakpoint = containerWidth != null
    && containerWidth < WORKSPACE_DRAWER_OVERLAY_BREAKPOINT;
  const isMobileBreakpoint = containerWidth != null
    && containerWidth < WORKSPACE_DRAWER_MOBILE_BREAKPOINT;
  const isModalStageOpen = Boolean(activePanel && (isOverlayBreakpoint || fullscreen));
  const hasAnyBadge = Object.values(panelBadges).some(Boolean);

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

  const closeStage = useCallback(() => {
    restoreLauncherFocusRef.current = true;
    setViewMenuOpen(false);
    setFullscreen(false);
    onPanelChange(null);
    openerRef.current = null;
  }, [onPanelChange]);

  useLayoutEffect(() => {
    if (activePanel || !restoreLauncherFocusRef.current || !launcherRef.current) return;
    restoreLauncherFocusRef.current = false;
    launcherRef.current.focus();
  }, [activePanel]);

  const openStage = useCallback((panelId = visiblePanel, trigger = launcherRef.current) => {
    openerRef.current = trigger || launcherRef.current;
    setViewMenuOpen(false);
    onPanelChange(panelId || "details");
  }, [onPanelChange, visiblePanel]);

  const selectPanel = useCallback((panelId) => {
    openStage(
      panelId,
      activePanel
        ? (openerRef.current || viewMenuButtonRef.current)
        : (viewMenuButtonRef.current || launcherRef.current),
    );
  }, [activePanel, openStage]);

  useEffect(() => {
    if (!activePanel) setFullscreen(false);
  }, [activePanel]);

  useEffect(() => {
    if (!activePanel) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (viewMenuOpen) return;
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
      const shouldWrapForward = !event.shiftKey
        && (currentIndex === -1 || currentIndex === focusableElements.length - 1);
      if (!shouldWrapBackward && !shouldWrapForward) return;
      event.preventDefault();
      focusableElements[shouldWrapBackward ? focusableElements.length - 1 : 0].focus();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activePanel, closeStage, fullscreen, isModalStageOpen, viewMenuOpen]);

  useLayoutEffect(() => {
    if (!isModalStageOpen) return;
    const activeElement = document.activeElement;
    if (!openerRef.current?.isConnected && activeElement && !stageRef.current?.contains(activeElement)) {
      openerRef.current = activeElement;
    }
    const initialFocus = isMobileBreakpoint ? backButtonRef.current : closeButtonRef.current;
    (initialFocus || stageRef.current)?.focus();
  }, [isMobileBreakpoint, isModalStageOpen, presence.present, visiblePanel]);

  useEffect(() => {
    if (!activePanel) return undefined;
    const timeoutId = window.setTimeout(() => window.dispatchEvent(new Event("resize")), 310);
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
      style={{ "--workspace-drawer-width": `${safeDrawerWidth}px` }}
      aria-label="AI workspace"
    >
      <div className="workspace-shell__ambient" aria-hidden="true">
        <span className="workspace-shell__blob workspace-shell__blob--one" />
        <span className="workspace-shell__blob workspace-shell__blob--two" />
        <span className="workspace-shell__blob workspace-shell__blob--three" />
      </div>

      <div
        className="workspace-shell__primary"
        role="group"
        aria-label="Workspace content"
        aria-hidden={isModalStageOpen ? "true" : undefined}
        {...(isModalStageOpen ? { inert: "" } : {})}
      >
        {children}
      </div>

      {!activePanel ? (
        <div className="workspace-stage-launcher">
          <button
            ref={launcherRef}
            type="button"
            className="workspace-stage-launcher__open focus-ring"
            aria-label="Open Stage"
            onClick={(event) => openStage(visiblePanel, event.currentTarget)}
          >
            <Layers className="h-4 w-4" aria-hidden="true" />
            <span>Stage</span>
            {hasAnyBadge ? <span className="workspace-stage-launcher__signal" aria-label="New Stage content" /> : null}
          </button>
          <button
            ref={viewMenuButtonRef}
            type="button"
            className="workspace-stage-launcher__menu focus-ring"
            aria-label="Choose Stage view"
            aria-haspopup="menu"
            aria-expanded={viewMenuOpen}
            onClick={() => setViewMenuOpen((current) => !current)}
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <StageViewMenu
            open={viewMenuOpen}
            activePanel={activePanel}
            panelBadges={panelBadges}
            onSelect={selectPanel}
            onClose={() => setViewMenuOpen(false)}
            anchorRef={viewMenuButtonRef}
          />
        </div>
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
          id="workspace-context-drawer"
          className={`workspace-stage ${presence.entering ? "is-entered" : ""}`}
          role={isModalStageOpen ? "dialog" : "complementary"}
          aria-modal={isModalStageOpen ? "true" : undefined}
          aria-labelledby="workspace-stage-title"
          aria-label={isModalStageOpen ? selectedTool.label : undefined}
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
              onDoubleClick={() => onDrawerWidthChange?.(WORKSPACE_DRAWER_DEFAULT_WIDTH)}
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
              <span className="workspace-stage__glyph" aria-hidden="true"><SelectedIcon className="h-4 w-4" /></span>
              <div className="min-w-0">
                <span className="workspace-stage__eyebrow">Stage</span>
                <h2 id="workspace-stage-title">{selectedTool.label}</h2>
              </div>
            </div>

            <div className="workspace-stage__actions">
              <div className="workspace-stage__switcher">
                <button
                  ref={viewMenuButtonRef}
                  type="button"
                  className="workspace-stage__action workspace-stage__switch focus-ring"
                  aria-label="Switch Stage view"
                  aria-haspopup="menu"
                  aria-expanded={viewMenuOpen}
                  onClick={() => setViewMenuOpen((current) => !current)}
                >
                  <span>{selectedTool.label}</span>
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <StageViewMenu
                  open={viewMenuOpen}
                  activePanel={activePanel}
                  panelBadges={panelBadges}
                  onSelect={selectPanel}
                  onClose={() => setViewMenuOpen(false)}
                  anchorRef={viewMenuButtonRef}
                />
              </div>
              {!isMobileBreakpoint ? (
                <button
                  type="button"
                  className="workspace-stage__action workspace-stage__icon-action focus-ring"
                  aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
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
          </header>

          <div className="workspace-stage__body">
            {selectedTool ? renderPanel?.(selectedTool.id) : null}
          </div>
        </aside>
      ) : null}
    </section>
  );
}
