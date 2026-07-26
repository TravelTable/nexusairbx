import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight } from "lib/icons";

const MENU_WIDTH = 208;
const EDGE_GAP = 8;

export default function SidebarContextMenu({ menu, onClose }) {
  const ref = useRef(null);
  const [childItems, setChildItems] = useState(null);
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
    if (!menu) return undefined;
    const closeFromOutside = (event) => {
      if (!ref.current?.contains(event.target)) onClose();
    };
    const closeFromKeyboard = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", closeFromOutside);
    window.addEventListener("keydown", closeFromKeyboard);
    return () => {
      window.removeEventListener("pointerdown", closeFromOutside);
      window.removeEventListener("keydown", closeFromKeyboard);
    };
  }, [menu, onClose]);

  useEffect(() => {
    setChildItems(null);
  }, [menu]);

  if (!menu) return null;
  const items = childItems || menu.items;

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={menu.label || "Actions"}
      className="fixed z-[90] w-[208px] rounded-lg border border-white/10 bg-[#151517]/98 p-1.5 shadow-2xl backdrop-blur-xl"
      style={position}
    >
      {childItems && (
        <button
          type="button"
          role="menuitem"
          onClick={() => setChildItems(null)}
          className="mb-1 flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-gray-400 hover:bg-white/[.06] hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
      )}
      {items.map((item) => (
        item.separator ? (
          <div key={item.id} className="my-1 h-px bg-white/[.07]" role="separator" />
        ) : (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              if (item.children?.length) {
                setChildItems(item.children);
                return;
              }
              item.onSelect?.();
              onClose();
            }}
            className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
              item.danger
                ? "text-red-300 hover:bg-red-400/10"
                : "text-gray-300 hover:bg-white/[.06] hover:text-white"
            }`}
          >
            {item.icon && <item.icon className="h-3.5 w-3.5 shrink-0" />}
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.children?.length ? <ChevronRight className="h-3.5 w-3.5 text-gray-600" /> : null}
          </button>
        )
      ))}
    </div>
  );
}
