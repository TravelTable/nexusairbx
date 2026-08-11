import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowLeft, ChevronRight } from "lib/icons";

const MENU_WIDTH = 208;
const EDGE_GAP = 8;

export default function SidebarContextMenu({ menu, onClose }) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  const previousFocusRef = useRef(null);
  const restoreFocusRef = useRef(true);
  const [childItems, setChildItems] = useState(null);
  const [focusedItemId, setFocusedItemId] = useState(null);
  const isOpen = Boolean(menu);
  const position = useMemo(() => {
    if (!menu) return { left: 0, top: 0 };
    const viewportWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
    return {
      left: Math.max(EDGE_GAP, Math.min(menu.x, viewportWidth - MENU_WIDTH - EDGE_GAP)),
      top: Math.max(EDGE_GAP, Math.min(menu.y, viewportHeight - 280)),
    };
  }, [menu]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const requestClose = useCallback((restoreFocus = true) => {
    restoreFocusRef.current = restoreFocus;
    onCloseRef.current?.();
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    previousFocusRef.current = document.activeElement;
    restoreFocusRef.current = true;
    return () => {
      const previousFocus = previousFocusRef.current;
      if (!restoreFocusRef.current || !previousFocus?.isConnected) return;
      window.setTimeout(() => previousFocus.focus(), 0);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!menu) return undefined;
    const closeFromOutside = (event) => {
      if (!ref.current?.contains(event.target)) requestClose(false);
    };
    window.addEventListener("pointerdown", closeFromOutside);
    return () => {
      window.removeEventListener("pointerdown", closeFromOutside);
    };
  }, [menu, requestClose]);

  useEffect(() => {
    setChildItems(null);
    setFocusedItemId(null);
  }, [menu]);

  const items = menu ? (childItems || menu.items || []) : [];
  const enabledItemIds = [
    ...(childItems ? ["__back"] : []),
    ...items.filter((item) => !item.separator && !item.disabled).map((item) => item.id),
  ];
  const activeItemId = enabledItemIds.includes(focusedItemId)
    ? focusedItemId
    : enabledItemIds[0];

  useLayoutEffect(() => {
    if (!isOpen) return;
    const firstItem = ref.current?.querySelector('[role="menuitem"]:not(:disabled)');
    firstItem?.focus();
    setFocusedItemId(firstItem?.dataset.sidebarMenuItem || null);
  }, [childItems, isOpen, menu]);

  const focusMenuItem = (item) => {
    if (!item) return;
    setFocusedItemId(item.dataset.sidebarMenuItem || null);
    item.focus();
  };

  const onMenuKeyDown = (event) => {
    const menuItems = Array.from(
      ref.current?.querySelectorAll('[role="menuitem"]:not(:disabled)') || [],
    );
    if (!menuItems.length) return;
    const currentIndex = menuItems.indexOf(document.activeElement);

    if (event.key === "Escape") {
      event.preventDefault();
      requestClose(true);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (childItems) setChildItems(null);
      else requestClose(true);
      return;
    }
    if (event.key === "ArrowRight") {
      const currentItem = menuItems[currentIndex];
      if (currentItem?.dataset.hasChildren === "true") {
        event.preventDefault();
        currentItem.click();
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const startIndex = currentIndex === -1 ? (direction === 1 ? -1 : 0) : currentIndex;
      focusMenuItem(menuItems[(startIndex + direction + menuItems.length) % menuItems.length]);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      focusMenuItem(event.key === "Home" ? menuItems[0] : menuItems[menuItems.length - 1]);
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const search = event.key.toLocaleLowerCase();
      const candidates = [...menuItems.slice(currentIndex + 1), ...menuItems.slice(0, currentIndex + 1)];
      const match = candidates.find((item) => item.textContent.trim().toLocaleLowerCase().startsWith(search));
      if (match) {
        event.preventDefault();
        focusMenuItem(match);
      }
    }
  };

  if (!menu) return null;

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={menu.label || "Actions"}
      onKeyDown={onMenuKeyDown}
      onBlur={() => {
        window.setTimeout(() => {
          if (ref.current && !ref.current.contains(document.activeElement)) requestClose(false);
        }, 0);
      }}
      className="fixed z-[90] w-[208px] rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-overlay)] p-1.5"
      style={position}
    >
      {childItems && (
        <button
          type="button"
          role="menuitem"
          data-sidebar-menu-item="__back"
          tabIndex={activeItemId === "__back" ? 0 : -1}
          onFocus={() => setFocusedItemId("__back")}
          onClick={() => setChildItems(null)}
          className="mb-1 flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back
        </button>
      )}
      {items.map((item) => (
        item.separator ? (
          <div key={item.id} className="my-1 h-px bg-[var(--ds-fill-hover)]" role="separator" />
        ) : (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            data-sidebar-menu-item={item.id}
            data-has-children={item.children?.length ? "true" : undefined}
            aria-haspopup={item.children?.length ? "menu" : undefined}
            tabIndex={activeItemId === item.id ? 0 : -1}
            disabled={item.disabled}
            onFocus={() => setFocusedItemId(item.id)}
            onClick={() => {
              if (item.children?.length) {
                setChildItems(item.children);
                return;
              }
              item.onSelect?.();
              requestClose(true);
            }}
            className={`flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
              item.danger
                ? "text-[var(--ds-danger)] hover:bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)]"
                : "text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
            }`}
          >
            {item.icon && <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.children?.length ? <ChevronRight className="h-3.5 w-3.5 text-[var(--ds-text-muted)]" aria-hidden="true" /> : null}
          </button>
        )
      ))}
    </div>
  );
}
