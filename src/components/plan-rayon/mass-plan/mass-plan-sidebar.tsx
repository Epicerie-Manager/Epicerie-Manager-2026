"use client";

import { useMemo, useState, type CSSProperties, type DragEvent } from "react";
import { Card } from "@/components/ui/card";
import type { DragLibraryPayload, RayonLibItem } from "@/components/plan-rayon/mass-plan/mass-plan-types";
import { GRID } from "@/components/plan-rayon/mass-plan/mass-plan-types";

type Props = {
  canWrite: boolean;
  library: RayonLibItem[];
};

const STRUCTURES: Array<{
  label: string;
  icon: string;
  elementType: "alley-h" | "alley-v" | "tete-gondole" | "gondole-basse" | "text";
  payloadLabel?: string;
  payloadColor?: string;
  payloadSize?: { w: number; h: number };
}> = [
  { label: "Allée H", icon: "↔", elementType: "alley-h" },
  { label: "Allée V", icon: "↕", elementType: "alley-v" },
  { label: "Tête de gondole", icon: "◫", elementType: "tete-gondole" },
  { label: "Gondole basse", icon: "▬", elementType: "gondole-basse" },
  { label: "Zone de texte", icon: "T", elementType: "text", payloadLabel: "Texte", payloadColor: "#1f2b4d", payloadSize: { w: GRID * 4, h: GRID * 2 } },
  { label: "Élément libre", icon: "▣", elementType: "gondole-basse", payloadLabel: "Bloc libre", payloadColor: "#475569", payloadSize: { w: GRID * 2, h: GRID * 2 } },
];

export function MassPlanSidebar({ canWrite, library }: Props) {
  const groups = useMemo(
    () =>
      library.reduce<Record<string, { title: string; color: string; icon: string; items: RayonLibItem[] }>>((acc, item) => {
        const key = item.universe_id;
        if (!acc[key]) {
          acc[key] = {
            title: item.universe_name,
            color: item.universe_color,
            icon: item.universe_icon,
            items: [],
          };
        }
        acc[key].items.push(item);
        return acc;
      }, {}),
    [library],
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  function handleDragStart(event: DragEvent, payload: DragLibraryPayload) {
    if (!canWrite) return;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/json", JSON.stringify(payload));
  }

  function toggleGroup(groupId: string) {
    setCollapsedGroups((current) => ({
      ...current,
      [groupId]: !(current[groupId] ?? false),
    }));
  }

  return (
    <div style={panelStyle}>
      <div style={sectionTitleStyle}>Bibliothèque</div>
      <div style={scrollStyle}>
        <Card static style={{ padding: 12, borderRadius: 16 }}>
          <div style={groupLabelStyle}>Structure</div>
          <div style={structureGridStyle}>
            {STRUCTURES.map((item) => (
              <button
                key={`${item.elementType}-${item.label}`}
                type="button"
                draggable={canWrite}
                onDragStart={(event) =>
                  handleDragStart(event, {
                    kind: "structure",
                    elementType: item.elementType,
                    label: item.payloadLabel,
                    color: item.payloadColor,
                    size: item.payloadSize,
                  })
                }
                style={{ ...structureItemStyle, cursor: canWrite ? "grab" : "not-allowed", opacity: canWrite ? 1 : 0.65 }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {Object.entries(groups).map(([key, group]) => {
          const collapsed = collapsedGroups[key] ?? false;
          return (
          <Card key={key} static style={groupCardStyle(collapsed)}>
            <button type="button" onClick={() => toggleGroup(key)} style={groupToggleStyle}>
              <span style={{ ...groupLabelStyle, color: group.color, marginBottom: 0 }}>
                <span>{group.icon}</span>
                <span>{group.title}</span>
              </span>
              <span style={groupCountStyle}>{group.items.length}</span>
              <span style={groupChevronStyle(collapsed)}>{collapsed ? "▸" : "▾"}</span>
            </button>
            <div style={groupItemsWrapStyle(!collapsed)}>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  draggable={canWrite}
                  onDragStart={(event) => handleDragStart(event, { kind: "rayon", rayon: item })}
                  style={{ ...rayonItemStyle, cursor: canWrite ? "grab" : "not-allowed", opacity: canWrite ? 1 : 0.7 }}
                >
                  <span style={{ ...swatchStyle, background: item.color }} />
                  <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <span style={rayonNameStyle}>{item.name}</span>
                    <span style={rayonMetaStyle}>{item.elem_count} éléments</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )})}
      </div>
    </div>
  );
}

const panelStyle: CSSProperties = {
  width: 240,
  flexShrink: 0,
  background: "#fff",
  borderRight: "1px solid #e6eaf0",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const sectionTitleStyle: CSSProperties = {
  padding: "12px 14px 8px",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#a6afbf",
  borderBottom: "1px solid #eef2f6",
};

const scrollStyle: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: 10,
  display: "grid",
  gap: 12,
};

const groupLabelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
  fontSize: 11,
  fontWeight: 800,
  color: "#617286",
};

const structureGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 6,
};

const structureItemStyle: CSSProperties = {
  minHeight: 72,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#1f2b4d",
  fontSize: 11,
  fontWeight: 700,
  display: "grid",
  placeItems: "center",
  gap: 4,
  padding: 8,
};

const rayonItemStyle: CSSProperties = {
  minHeight: 48,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#fff",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "0 10px",
};

const swatchStyle: CSSProperties = {
  width: 10,
  height: 30,
  borderRadius: 4,
  flexShrink: 0,
};

const rayonNameStyle: CSSProperties = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 700,
  color: "#1f2b4d",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const rayonMetaStyle: CSSProperties = {
  display: "block",
  marginTop: 2,
  fontSize: 10,
  color: "#94a3b8",
};

const groupToggleStyle: CSSProperties = {
  width: "100%",
  border: "none",
  background: "transparent",
  padding: 0,
  marginBottom: 0,
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
};

const groupCardStyle = (collapsed: boolean): CSSProperties => ({
  padding: collapsed ? "6px 10px" : 12,
  borderRadius: 16,
  minHeight: collapsed ? 0 : undefined,
});

const groupCountStyle: CSSProperties = {
  marginLeft: "auto",
  minWidth: 24,
  height: 20,
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 6px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  fontSize: 10,
  fontWeight: 800,
  color: "#64748b",
};

const groupChevronStyle = (collapsed: boolean): CSSProperties => ({
  fontSize: 14,
  color: "#94a3b8",
  lineHeight: 1,
  transform: collapsed ? "translateY(-1px)" : "translateY(-1px)",
});

const groupItemsWrapStyle = (open: boolean): CSSProperties => ({
  display: open ? "grid" : "none",
  gap: 6,
  maxHeight: 440,
  overflowY: "auto",
  paddingRight: 4,
  marginTop: 8,
});
