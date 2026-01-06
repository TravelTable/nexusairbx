import React, { useMemo } from "react";
import { useCanvas } from "./CanvasContext";

function sortByZ(items) {
  return items.slice().sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
}

export default function LayersPanel() {
  const {
    items,
    selectedId,
    setSelectedId,
    setItemVisible,
    setItemLocked,
    createGroup,
    collapsedGroups,
    toggleGroupCollapsed,
  } = useCanvas();

  const groups = useMemo(() => items.filter((it) => it.type === "Group"), [items]);
  const nonGroups = useMemo(() => items.filter((it) => it.type !== "Group"), [items]);

  const childrenByParent = useMemo(() => {
    const map = {};
    nonGroups.forEach((it) => {
      const pid = it.parentId || null;
      if (!map[pid]) map[pid] = [];
      map[pid].push(it);
    });
    Object.keys(map).forEach((k) => {
      map[k] = sortByZ(map[k]);
    });
    return map;
  }, [nonGroups]);

  const ungrouped = childrenByParent[null] || [];

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div style={{ fontWeight: 800, fontSize: 12 }}>Layers</div>
        <button style={ghostBtn} onClick={() => createGroup("Group")}>
          + Group
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {groups.length > 0 &&
          sortByZ(groups).map((g) => {
            const collapsed = collapsedGroups?.[g.id];
            const children = childrenByParent[g.id] || [];
            return (
              <div key={g.id} style={groupBlock}>
                <LayerRow
                  item={g}
                  selected={selectedId === g.id}
                  onSelect={() => setSelectedId(g.id)}
                  onToggleVisible={() => setItemVisible(g.id, !g.visible)}
                  onToggleLocked={() => setItemLocked(g.id, !g.locked)}
                  onToggleCollapse={() => toggleGroupCollapsed(g.id)}
                  collapsible
                  collapsed={collapsed}
                />
                {!collapsed && children.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                    {children.map((it) => (
                      <LayerRow
                        key={it.id}
                        item={it}
                        selected={selectedId === it.id}
                        onSelect={() => setSelectedId(it.id)}
                        onToggleVisible={() => setItemVisible(it.id, !it.visible)}
                        onToggleLocked={() => setItemLocked(it.id, !it.locked)}
                        indent
                      />
                    ))}
                  </div>
                )}
                {!collapsed && children.length === 0 && (
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, paddingLeft: 14 }}>Empty</div>
                )}
              </div>
            );
          })}

        <div style={{ fontWeight: 700, fontSize: 11, opacity: 0.8, marginTop: 4 }}>Ungrouped</div>
        {ungrouped.length === 0 && (
          <div style={{ fontSize: 11, opacity: 0.6 }}>No ungrouped items.</div>
        )}
        {ungrouped.map((it) => (
          <LayerRow
            key={it.id}
            item={it}
            selected={selectedId === it.id}
            onSelect={() => setSelectedId(it.id)}
            onToggleVisible={() => setItemVisible(it.id, !it.visible)}
            onToggleLocked={() => setItemLocked(it.id, !it.locked)}
          />
        ))}
      </div>
    </div>
  );
}

function LayerRow({
  item,
  selected,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onToggleCollapse,
  collapsible = false,
  collapsed = false,
  indent = false,
}) {
  const roleBadge =
    item.role === "layout"
      ? "layout"
      : item.role === "background"
      ? "bg"
      : item.export === false
      ? "no-export"
      : null;

  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        borderRadius: 10,
        border: selected ? "1px solid rgba(59,130,246,0.7)" : "1px solid rgba(148,163,184,0.16)",
        background: selected ? "rgba(59,130,246,0.1)" : "rgba(15,23,42,0.35)",
        cursor: "pointer",
        paddingLeft: indent ? 18 : 8,
      }}
    >
      {collapsible ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse?.();
          }}
          style={iconBtn}
          title="Collapse / expand"
        >
          {collapsed ? "▸" : "▾"}
        </button>
      ) : (
        <div style={{ width: 18 }} />
      )}

      <div style={{ flex: 1, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
        <span>{item.name || item.type}</span>
        {roleBadge && (
          <span style={badge}>{roleBadge}</span>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisible?.();
        }}
        style={iconBtn}
        title={item.visible ? "Hide" : "Show"}
      >
        {item.visible ? "👁" : "🚫"}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleLocked?.();
        }}
        style={iconBtn}
        title={item.locked ? "Unlock" : "Lock"}
      >
        {item.locked ? "🔒" : "🔓"}
      </button>
    </div>
  );
}

const panelStyle = {
  border: "1px solid rgba(148,163,184,0.2)",
  background: "rgba(2,6,23,0.45)",
  borderRadius: 14,
  padding: 10,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const iconBtn = {
  border: "1px solid rgba(148,163,184,0.22)",
  background: "rgba(15,23,42,0.65)",
  color: "#e5e7eb",
  borderRadius: 10,
  padding: "4px 6px",
  cursor: "pointer",
  fontSize: 11,
};

const ghostBtn = {
  ...iconBtn,
  padding: "6px 8px",
};

const groupBlock = {
  border: "1px solid rgba(148,163,184,0.18)",
  borderRadius: 12,
  padding: 6,
  background: "rgba(8,15,35,0.55)",
};

const badge = {
  fontSize: 10,
  padding: "2px 6px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(59,130,246,0.12)",
  textTransform: "uppercase",
};
