import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Backpack,
  Check,
  ChevronDown,
  Code2,
  History,
  Layers3,
  Plus,
  Settings2,
  ShoppingBag,
  X,
} from "lucide-react";

import WorkspaceRibbon from "../WorkspaceRibbon";
import "./UiCreatorChrome.css";

export const UI_TEMPLATES = [
  {
    title: "Shop Menu",
    Icon: ShoppingBag,
    description: "Storefront, currency, products and purchase states.",
    prompt:
      "Build a responsive Roblox shop menu with dark translucent panels, purple accents, item categories, a currency balance, a product grid, clear purchase actions, and empty and insufficient-currency states.",
  },
  {
    title: "Inventory",
    Icon: Backpack,
    description: "Search, filters, rarity and equip interactions.",
    prompt:
      "Build a responsive Roblox inventory with item search, category filters, rarity badges, selected item details, equip and unequip actions, and a friendly empty inventory state.",
  },
  {
    title: "Settings Panel",
    Icon: Settings2,
    description: "Volume, graphics, gameplay and save controls.",
    prompt:
      "Build a Roblox settings panel with accessible volume controls, graphics and gameplay settings, save and reset actions, and clear confirmation feedback.",
  },
];

const inspectTabs = [
  ["files", "Files"],
  ["luau", "Code"],
  ["assets", "Assets"],
  ["interactions", "Interactions"],
];

function StatusChip({ tone = "neutral", children }) {
  return (
    <span className={`uc-status-chip uc-status-chip--${tone}`}>
      {children}
    </span>
  );
}

function DesignStatus({
  saved,
  applied,
  applyState,
  visuallyReviewed,
  working,
  status,
}) {
  if (!saved) return null;

  const needsReview =
    /review|attention|unavailable|failed|budget|limitation/i.test(status || "");

  const applicationInFlight =
    /^(Applying|Awaiting Studio acknowledgement|Acknowledged · verifying|Application outcome uncertain|Apply failed)/.test(
      applyState || ""
    );

  return (
    <div className="uc-status-row" aria-label="UI status">
      <StatusChip tone={working ? "working" : "success"}>
        {working ? "Building" : "Saved"}
      </StatusChip>

      {applicationInFlight ? (
        <StatusChip tone="working">{applyState}</StatusChip>
      ) : applied ? (
        <StatusChip tone="success">Studio applied</StatusChip>
      ) : (
        <StatusChip tone="neutral">Not applied</StatusChip>
      )}

      {needsReview ? (
        <StatusChip tone="warning">Needs review</StatusChip>
      ) : visuallyReviewed ? (
        <StatusChip tone="success">Visual review passed</StatusChip>
      ) : (
        <StatusChip tone="warning">Runtime untested</StatusChip>
      )}
    </div>
  );
}

export default function UiCreatorChrome({
  document,
  designs = [],
  projectTitle,
  studioReady,
  working,
  loading,
  status,
  saved,
  applied,
  applyState = "Not applied to this Studio",
  visuallyReviewed = false,
  error,
  onDismissError,
  modelControl,
  studioControl,
  onModeChange,
  onChangeProject,
  onOpenEvidence,
  onOpenStudio,
  onAccount,
  onNew,
  onLoad,
  onApply,
  onDrawer,
  onPrompt,
  onTemplate,
  drawer,
  onCloseDrawer,
  drawerContent,
  composer,
  conversation,
  livePreview,
  onRename,
  onDelete,
  undo,
  onUndo,
  sharedHeader = false,
  headerActionTarget = null,
  onHeaderModalChange,
}) {
  const session = useRef(null);
  const panel = useRef(null);
  const picker = useRef(null);
  const titleInput = useRef(null);
  const inspectTrigger = useRef(null);
  const closeDrawerRef = useRef(onCloseDrawer);

  const [chatWidth, setChatWidth] = useState(() => {
    try {
      const stored = Number(window.localStorage.getItem("nexusrbx:ui:chat-width"));
      return Number.isFinite(stored)
        ? Math.max(280, Math.min(520, stored))
        : 350;
    } catch {
      return 350;
    }
  });

  const [pickerOpen, setPickerOpen] = useState(false);
  const [mobileView, setMobileView] = useState("chat");
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState("");
  const [mobile, setMobile] = useState(
    () => window.matchMedia?.("(max-width: 900px)").matches || false
  );

  closeDrawerRef.current = onCloseDrawer;

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "nexusrbx:ui:chat-width",
        String(chatWidth)
      );
    } catch {}
  }, [chatWidth]);

  useEffect(() => {
    if (renaming) titleInput.current?.focus();
  }, [renaming]);

  const drawerOpen = Boolean(drawer);

  useEffect(() => {
    onHeaderModalChange?.(mobile && drawerOpen);
    return () => onHeaderModalChange?.(false);
  }, [mobile, drawerOpen, onHeaderModalChange]);

  useEffect(() => {
    const media = window.matchMedia?.("(max-width: 900px)");
    if (!media) return undefined;

    const change = () => setMobile(media.matches);
    change();

    media.addEventListener?.("change", change);
    return () => media.removeEventListener?.("change", change);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;

    const previous = window.document.activeElement;
    const trigger = inspectTrigger.current;

    panel.current?.querySelector("button")?.focus();

    const keyboard = (event) => {
      if (
        event.defaultPrevented ||
        event.target.closest?.('[role="listbox"]')
      ) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawerRef.current?.();
        return;
      }

      if (
        event.key !== "Tab" ||
        !window.matchMedia?.("(max-width: 900px)").matches
      ) {
        return;
      }

      const controls = [
        ...(panel.current?.querySelectorAll(
          'button:not(:disabled), input, select, textarea, [tabindex="0"]'
        ) || []),
      ];

      const first = controls[0];
      const last = controls.at(-1);

      if (event.shiftKey && window.document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        window.document.activeElement === last
      ) {
        event.preventDefault();
        first?.focus();
      }
    };

    window.document.addEventListener("keydown", keyboard);

    return () => {
      window.document.removeEventListener("keydown", keyboard);

      let attempts = 0;

      const restoreFocus = () => {
        const target = sharedHeader ? trigger : previous;

        if (target?.closest?.("[inert]") && attempts++ < 60) {
          window.requestAnimationFrame(restoreFocus);
          return;
        }

        if (target?.isConnected) target.focus();
      };

      if (sharedHeader) {
        window.requestAnimationFrame(restoreFocus);
      } else {
        restoreFocus();
      }
    };
  }, [drawerOpen, sharedHeader]);

  useEffect(() => {
    if (!pickerOpen) return undefined;

    const closeOnOutside = (event) => {
      if (
        !picker.current?.contains(event.target) &&
        !event.target.closest?.("[data-ui-picker-trigger]")
      ) {
        setPickerOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setPickerOpen(false);
    };

    window.document.addEventListener("pointerdown", closeOnOutside);
    window.document.addEventListener("keydown", closeOnEscape);

    return () => {
      window.document.removeEventListener("pointerdown", closeOnOutside);
      window.document.removeEventListener("keydown", closeOnEscape);
    };
  }, [pickerOpen]);

  const inspectOpen = ["files", "luau", "assets", "interactions"].includes(
    drawer
  );

  const designTitle = document?.title || "New UI";

  const workspaceActions = (
    <div className="uc-workspace-actions">
      <button
        type="button"
        data-ui-picker-trigger
        aria-expanded={pickerOpen}
        aria-controls="ui-design-picker"
        onClick={() => setPickerOpen((value) => !value)}
      >
        <Plus size={15} />
        New UI
      </button>

      <button
        ref={inspectTrigger}
        type="button"
        aria-expanded={inspectOpen}
        aria-controls="ui-build-drawer"
        onClick={() => onDrawer("files")}
      >
        <Code2 size={15} />
        Inspect
      </button>

      <button
        type="button"
        aria-expanded={drawer === "history"}
        aria-controls="ui-build-drawer"
        onClick={() => onDrawer("history")}
      >
        <History size={15} />
        History
      </button>

      <button
        type="button"
        className="uc-action-primary"
        disabled={!saved || working}
        onClick={studioReady ? onApply : onOpenStudio}
      >
        {studioReady ? "Apply to Studio" : "Connect Studio"}
      </button>
    </div>
  );

  const sortedDesigns = useMemo(
    () => [...designs],
    [designs]
  );

  return (
    <div className={`uc-app ${sharedHeader ? "uc-app--shared-header" : ""}`}>
      {!sharedHeader ? (
        <WorkspaceRibbon
          mode="ui"
          projectTitle={projectTitle}
          onChangeProject={onChangeProject}
          onModeChange={onModeChange}
          modelControl={modelControl}
          studioControl={studioControl}
          inert={mobile && drawerOpen}
        />
      ) : null}

      {headerActionTarget
        ? createPortal(workspaceActions, headerActionTarget)
        : null}

      <section
        className="uc-main"
        aria-label="UI Creator"
        inert={mobile && drawerOpen ? "" : undefined}
      >
        <header className="uc-local-toolbar">
          <div
            className="uc-view-tabs"
            role="tablist"
            aria-label="UI workspace view"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobileView === "chat"}
              onClick={() => setMobileView("chat")}
            >
              Chat
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileView === "preview"}
              onClick={() => setMobileView("preview")}
            >
              Preview
            </button>
          </div>

          {!headerActionTarget ? workspaceActions : null}
        </header>

        {error ? (
          <div className="uc-error" role="alert">
            <span>{error}</span>
            <button aria-label="Dismiss error" onClick={onDismissError}>
              <X size={16} />
            </button>
          </div>
        ) : null}

        {undo ? (
          <div className="uc-notice" role="status">
            UI moved to recently deleted.
            <button onClick={onUndo}>Undo</button>
          </div>
        ) : null}

        {pickerOpen ? (
          <section
            ref={picker}
            id="ui-design-picker"
            className="uc-picker"
            aria-label="Choose or create a UI"
          >
            <header>
              <div>
                <strong>UI Library</strong>
                <span>Create a UI or continue working on a saved design.</span>
              </div>

              <button
                type="button"
                aria-label="Close UI Library"
                onClick={() => setPickerOpen(false)}
              >
                <X size={17} />
              </button>
            </header>

            <div className="uc-picker-create">
              <button
                type="button"
                className="uc-template-card uc-template-card--blank"
                aria-label="Blank UI"
                disabled={working}
                onClick={() => {
                  setPickerOpen(false);
                  onNew();
                }}
              >
                <div className="uc-template-card__preview">
                  <Plus size={24} />
                </div>

                <div>
                  <strong>Blank UI</strong>
                  <small>Start from your own description.</small>
                </div>
              </button>

              {UI_TEMPLATES.map((template) => {
                const Icon = template.Icon;

                return (
                  <button
                    type="button"
                    className="uc-template-card"
                    key={template.title}
                    aria-label={template.title}
                    disabled={working}
                    onClick={() => {
                      setPickerOpen(false);
                      onTemplate(template);
                    }}
                  >
                    <div className="uc-template-card__preview">
                      <Icon size={24} aria-hidden="true" />
                    </div>

                    <div>
                      <strong>{template.title}</strong>
                      <small>{template.description}</small>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="uc-picker-recents">
              <span>Recent UIs</span>

              {sortedDesigns.length ? (
                sortedDesigns.map((design) => (
                  <button
                    type="button"
                    key={design.designId}
                    disabled={loading}
                    aria-current={
                      document?.designId === design.designId
                        ? "true"
                        : undefined
                    }
                    onClick={() => {
                      onLoad(design.designId);
                      setPickerOpen(false);
                    }}
                  >
                    <span className="uc-recent-thumb">
                      <Layers3 size={16} />
                    </span>

                    <span className="uc-recent-copy">
                      <strong>{design.title || "Untitled UI"}</strong>
                      <small>
                        Revision {design.revision || 1}
                      </small>
                    </span>

                    {document?.designId === design.designId ? (
                      <Check size={15} />
                    ) : null}
                  </button>
                ))
              ) : (
                <p>No saved UIs yet.</p>
              )}
            </div>

            <footer>
              <button
                type="button"
                onClick={() => {
                  setPickerOpen(false);
                  onDrawer("trash");
                }}
              >
                Recently deleted
              </button>
            </footer>
          </section>
        ) : null}

        <div
          ref={session}
          className="uc-session"
          data-mobile-view={mobileView}
          style={{ "--uc-chat-width": `${chatWidth}px` }}
        >
          <section
            className="uc-conversation"
            aria-label="AI build conversation"
          >
            <header className="uc-pane-header">
              <span>Assistant</span>
            </header>

            {conversation}

            <div className="uc-composer">{composer}</div>
          </section>

          <div
            className="uc-resize"
            role="separator"
            aria-label="Resize conversation"
            aria-orientation="vertical"
            aria-valuemin={280}
            aria-valuemax={520}
            aria-valuenow={chatWidth}
            tabIndex={0}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;

              event.preventDefault();

              setChatWidth((width) =>
                Math.max(
                  280,
                  Math.min(
                    520,
                    width + (event.key === "ArrowRight" ? 20 : -20)
                  )
                )
              );
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (
                !event.currentTarget.hasPointerCapture(event.pointerId)
              ) {
                return;
              }

              const bounds = session.current.getBoundingClientRect();

              setChatWidth(
                Math.max(
                  280,
                  Math.min(
                    520,
                    session.current.clientWidth - 320,
                    event.clientX - bounds.left
                  )
                )
              );
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }}
          />

          <section
            className="uc-preview-pane"
            aria-label="UI preview"
          >
            <header className="uc-preview-header">
              <div className="uc-preview-heading">
                <span>UI Preview</span>

                {renaming ? (
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();

                      if (!title.trim()) return;

                      await onRename(title.trim());
                      setRenaming(false);
                    }}
                  >
                    <input
                      aria-label="UI name"
                      ref={titleInput}
                      maxLength={120}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />

                    <button aria-label="Save UI name">
                      <Check size={16} />
                    </button>

                    <button
                      type="button"
                      aria-label="Cancel rename"
                      onClick={() => setRenaming(false)}
                    >
                      <X size={16} />
                    </button>
                  </form>
                ) : (
                  <div className="uc-design-title">
                    <button
                      type="button"
                      data-ui-picker-trigger
                      aria-label={`Choose UI. Current: ${designTitle}`}
                      aria-expanded={pickerOpen}
                      aria-controls="ui-design-picker"
                      onClick={() => setPickerOpen((value) => !value)}
                    >
                      <strong>{designTitle}</strong>
                      <ChevronDown size={15} />
                    </button>

                    {document ? (
                      <button
                        type="button"
                        className="uc-rename"
                        disabled={working}
                        onClick={() => {
                          setTitle(document.title || "");
                          setRenaming(true);
                        }}
                      >
                        Rename
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              <DesignStatus
                saved={saved}
                applied={applied}
                applyState={applyState}
                visuallyReviewed={visuallyReviewed}
                working={working}
                status={status}
              />
            </header>

            <div className="uc-preview-stage">{livePreview}</div>
          </section>
        </div>
      </section>

      {drawer ? (
        <>
          <button
            className="uc-drawer-backdrop"
            aria-label="Close drawer backdrop"
            tabIndex={-1}
            onClick={onCloseDrawer}
          />

          <aside
            id="ui-build-drawer"
            ref={panel}
            className="uc-drawer nx-workspace-drawer"
            role="dialog"
            aria-modal={mobile || undefined}
            aria-label={
              drawer === "history"
                ? "UI history"
                : drawer === "trash"
                  ? "Recently deleted UIs"
                  : "Inspect UI"
            }
          >
            <header>
              <div>
                {drawer === "history" ? (
                  <History size={18} />
                ) : (
                  <Code2 size={18} />
                )}

                <strong>
                  {drawer === "history"
                    ? "History"
                    : drawer === "trash"
                      ? "Recently deleted"
                      : "Inspect"}
                </strong>
              </div>

              <button
                aria-label="Close drawer"
                onClick={onCloseDrawer}
              >
                <X size={19} />
              </button>
            </header>

            {inspectOpen ? (
              <nav aria-label="Inspect views">
                {inspectTabs.map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={drawer === id}
                    onClick={() => onDrawer(id)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            ) : null}

            <div className="uc-drawer-content">{drawerContent}</div>

            <footer>
              <button
                className="uc-text-button"
                disabled={!document || working}
                onClick={onDelete}
              >
                Move UI to recently deleted
              </button>
            </footer>
          </aside>
        </>
      ) : null}
    </div>
  );
}
