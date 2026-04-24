"use client";

import type { CSSProperties, DragEvent } from "react";
import { Card } from "@/components/ui/card";
import type { DragLibraryPayload, RayonLibItem } from "@/components/plan-rayon/mass-plan/mass-plan-types";

type Props = {
  canWrite: boolean;
  library: RayonLibItem[];
};

const STRUCTURES: Array<{ label: string; icon: string; elementType: "alley-h" | "alley-v" | "tete-gondole" | "gondole-basse" }> = [
  { label: "Allée H", icon: "↔", elementType: "alley-h" },
  { label: "Allée V", icon: "↕", elementType: "alley-v" },
  { label: "Tête de gondole", icon: "◫", elementType: "tete-gondole" },
  { label: "Gondole basse", icon: "▬", elementType: "gondole-basse" },
];

export function MassPlanSidebar({ canWrite, library }: Props) {
  const groups = library.reduce<Record<string, { title: string; color: string; icon: string; items: RayonLibItem[] }>>((acc, item) => {
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
  }, {});

  function handleDragStart(event: DragEvent, payload: DragLibraryPayload) {
    if (!canWrite) return;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/json", JSON.stringify(payload));
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
                key={item.elementType}
                type="button"
                draggable={canWrite}
                onDragStart={(event) => handleDragStart(event, { kind: "structure", elementType: item.elementType })}
                style={{ ...structureItemStyle, cursor: canWrite ? "grab" : "not-allowed", opacity: canWrite ? 1 : 0.65 }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {Object.entries(groups).map(([key, group]) => (
          <Card key={key} static style={{ padding: 12, borderRadius: 16 }}>
            <div style={{ ...groupLabelStyle, color: group.color }}>
              <span>{group.icon}</span>
              <span>{group.title}</span>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
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
        ))}
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
