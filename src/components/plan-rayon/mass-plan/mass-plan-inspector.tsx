"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Card } from "@/components/ui/card";
import type { ElementType, MassElement } from "@/components/plan-rayon/mass-plan/mass-plan-types";

type Props = {
  selected: MassElement | null;
  canWrite: boolean;
  onPatch: (patch: Partial<MassElement>) => void;
  onDelete: () => void;
};

const PRESET_COLORS = ["#0a4f98", "#d71920", "#059669", "#7c3aed", "#d97706", "#0891b2", "#374151", "#111827"];

export function MassPlanInspector({ selected, canWrite, onPatch, onDelete }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 });
  const [previewNaturalSize, setPreviewNaturalSize] = useState({ width: 0, height: 0 });
  const dragOriginRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [previewDragging, setPreviewDragging] = useState(false);

  useEffect(() => {
    setPreviewScale(1);
    setPreviewOffset({ x: 0, y: 0 });
    setPreviewNaturalSize({ width: 0, height: 0 });
    dragOriginRef.current = null;
    setPreviewDragging(false);
  }, [selected?.id, previewOpen]);

  useEffect(() => {
    if (!previewOpen || !previewNaturalSize.width || !previewNaturalSize.height) return;
    setPreviewScale(getBasePreviewScale(previewNaturalSize, viewportRef.current));
    setPreviewOffset({ x: 0, y: 0 });
  }, [previewOpen, previewNaturalSize.width, previewNaturalSize.height]);

  useEffect(() => {
    if (!previewDragging) return;

    const onMove = (event: MouseEvent) => {
      if (!dragOriginRef.current || previewScale <= 1) return;
      const dx = event.clientX - dragOriginRef.current.x;
      const dy = event.clientY - dragOriginRef.current.y;
      setPreviewOffset(
        clampPreviewOffset(
          {
            x: dragOriginRef.current.offsetX + dx,
            y: dragOriginRef.current.offsetY + dy,
          },
          previewScale,
          viewportRef.current,
          previewNaturalSize,
        ),
      );
    };

    const onUp = () => {
      dragOriginRef.current = null;
      setPreviewDragging(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [previewDragging, previewScale, previewNaturalSize]);

  function zoom(delta: number) {
    setPreviewScale((current) => {
      const next = Math.max(0.35, Math.min(4, Number((current + delta).toFixed(2))));
      setPreviewOffset((offset) => clampPreviewOffset(offset, next, viewportRef.current, previewNaturalSize));
      return next;
    });
  }

  function resetPreview() {
    setPreviewScale(getBasePreviewScale(previewNaturalSize, viewportRef.current));
    setPreviewOffset({ x: 0, y: 0 });
    dragOriginRef.current = null;
  }

  function startPreviewDrag(event: React.MouseEvent<HTMLDivElement>) {
    if (previewScale <= 1) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-preview-toolbar='true']")) return;
    dragOriginRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: previewOffset.x,
      offsetY: previewOffset.y,
    };
    setPreviewDragging(true);
  }

  if (!selected) {
    return (
      <div style={panelStyle}>
        <div style={sectionTitleStyle}>Propriétés</div>
        <div style={emptyStyle}>
          <span style={{ fontSize: 28 }}>🎯</span>
          Sélectionnez un élément pour modifier ses propriétés
        </div>
      </div>
    );
  }

  const currentColor = selected.color ?? selected.rayon_color ?? "#0a4f98";
  const showColor = selected.element_type !== "alley-h" && selected.element_type !== "alley-v";

  return (
    <div style={panelStyle}>
      <div style={sectionTitleStyle}>Propriétés</div>
      <div style={scrollStyle}>
        <Card static style={{ padding: 14, borderRadius: 14 }}>
          <div style={tinyTitleStyle}>Élément</div>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: "#13243b" }}>
            {selected.rayon_name ?? selected.label ?? getTypeLabel(selected.element_type)}
          </div>
          {selected.rayon_elem_count ? (
            <div style={badgeStyle}>📦 {selected.rayon_elem_count} éléments</div>
          ) : null}
          {selected.rayon_universe_name ? <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>{selected.rayon_universe_name}</div> : null}
        </Card>

        {selected.element_type === "rayon" ? (
          <Card static style={{ padding: 14, borderRadius: 14 }}>
            <div style={tinyTitleStyle}>Facing</div>
            {selected.rayon_facing_url ? (
              <button type="button" onClick={() => setPreviewOpen(true)} style={previewCardStyle}>
                <img src={selected.rayon_facing_url} alt={`Facing ${selected.rayon_name ?? selected.label ?? ""}`} style={previewImageStyle} />
                <div style={previewCaptionStyle}>
                  <span>Aperçu du facing</span>
                  <span style={{ color: "#0a4f98", fontWeight: 800 }}>Cliquer pour agrandir</span>
                </div>
              </button>
            ) : (
              <div style={emptyFacingStyle}>Aucun facing associé à ce rayon.</div>
            )}
          </Card>
        ) : null}

        <Card static style={{ padding: 14, borderRadius: 14 }}>
          <div style={tinyTitleStyle}>Dimensions & position</div>
          <div style={fieldGridStyle}>
            <Field label="X" value={selected.x} disabled={!canWrite} onChange={(value) => onPatch({ x: value })} />
            <Field label="Y" value={selected.y} disabled={!canWrite} onChange={(value) => onPatch({ y: value })} />
            <Field label="Largeur" value={selected.w} disabled={!canWrite} onChange={(value) => onPatch({ w: value })} />
            <Field label="Hauteur" value={selected.h} disabled={!canWrite} onChange={(value) => onPatch({ h: value })} />
          </div>
        </Card>

        <Card static style={{ padding: 14, borderRadius: 14 }}>
          <div style={tinyTitleStyle}>Orientation</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => onPatch({ rotated: false })} disabled={!canWrite} style={rotButtonStyle(!selected.rotated, canWrite)}>
              Horizontal
            </button>
            <button type="button" onClick={() => onPatch({ rotated: true })} disabled={!canWrite} style={rotButtonStyle(selected.rotated, canWrite)}>
              Vertical
            </button>
          </div>
        </Card>

        <Card static style={{ padding: 14, borderRadius: 14 }}>
          <div style={tinyTitleStyle}>Libellé</div>
          <input
            value={selected.label ?? ""}
            disabled={!canWrite}
            onChange={(event) => onPatch({ label: event.target.value })}
            style={inputStyle}
            placeholder="Nom affiché"
          />
        </Card>

        {showColor ? (
          <Card static style={{ padding: 14, borderRadius: 14 }}>
            <div style={tinyTitleStyle}>Couleur</div>
            <div style={colorGridStyle}>
              {PRESET_COLORS.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  disabled={!canWrite}
                  onClick={() => onPatch({ color: entry })}
                  style={colorDotStyle(entry, currentColor === entry, canWrite)}
                />
              ))}
            </div>
          </Card>
        ) : null}
      </div>
      <div style={actionBarStyle}>
        <button type="button" disabled={!canWrite} onClick={onDelete} style={deleteButtonStyle(canWrite)}>
          Supprimer l’élément
        </button>
      </div>

      {previewOpen && selected.rayon_facing_url ? (
        <div style={overlayStyle} onClick={() => setPreviewOpen(false)}>
          <div
            ref={viewportRef}
            style={overlayViewportStyle(previewScale > 1, previewDragging)}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={startPreviewDrag}
          >
            <div data-preview-toolbar="true" style={overlayToolbarStyle} onClick={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => zoom(-0.25)} style={toolButtonStyle}>
                −
              </button>
              <div style={zoomBadgeStyle}>{Math.round(previewScale * 100)}%</div>
              <button type="button" onClick={() => zoom(0.25)} style={toolButtonStyle}>
                +
              </button>
              <button type="button" onClick={resetPreview} style={toolButtonStyle}>
                Réinitialiser
              </button>
              <button type="button" onClick={() => setPreviewOpen(false)} style={closeOverlayStyle}>
                Fermer
              </button>
            </div>
            <div style={overlayStageStyle(previewOffset)}>
              <img
                src={selected.rayon_facing_url}
                alt={`Facing ${selected.rayon_name ?? selected.label ?? ""}`}
                style={overlayImageStyle(previewScale, previewScale > 1)}
                draggable={false}
                onLoad={(event) =>
                  setPreviewNaturalSize({
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  })
                }
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value, disabled, onChange }: { label: string; value: number; disabled: boolean; onChange: (value: number) => void }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={labelStyle}>{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        style={inputStyle}
      />
    </label>
  );
}

function getTypeLabel(type: ElementType) {
  if (type === "alley-h") return "Allée horizontale";
  if (type === "alley-v") return "Allée verticale";
  if (type === "tete-gondole") return "Tête de gondole";
  if (type === "gondole-basse") return "Gondole basse";
  return "Rayon";
}

function clampPreviewOffset(
  offset: { x: number; y: number },
  scale: number,
  viewport: HTMLDivElement | null,
  naturalSize: { width: number; height: number },
) {
  if (scale <= 1) return { x: 0, y: 0 };
  if (!viewport || !naturalSize.width || !naturalSize.height) return offset;
  const viewportWidth = Math.max(0, viewport.clientWidth - 56);
  const viewportHeight = Math.max(0, viewport.clientHeight - 128);
  if (!viewportWidth || !viewportHeight) return offset;

  const containRatio = Math.min(viewportWidth / naturalSize.width, viewportHeight / naturalSize.height);
  const renderedWidth = naturalSize.width * containRatio;
  const renderedHeight = naturalSize.height * containRatio;
  const scaledWidth = renderedWidth * scale;
  const scaledHeight = renderedHeight * scale;
  const maxX = Math.max(0, Math.round((scaledWidth - renderedWidth) / 2));
  const maxY = Math.max(0, Math.round((scaledHeight - renderedHeight) / 2));
  return {
    x: Math.max(-maxX, Math.min(maxX, offset.x)),
    y: Math.max(-maxY, Math.min(maxY, offset.y)),
  };
}

function getBasePreviewScale(
  naturalSize: { width: number; height: number },
  viewport: HTMLDivElement | null,
) {
  if (!viewport || !naturalSize.width || !naturalSize.height) return 1;
  const viewportWidth = Math.max(0, viewport.clientWidth - 56);
  const viewportHeight = Math.max(0, viewport.clientHeight - 128);
  if (!viewportWidth || !viewportHeight) return 1;
  const containRatio = Math.min(viewportWidth / naturalSize.width, viewportHeight / naturalSize.height);
  if (!Number.isFinite(containRatio) || containRatio <= 0) return 1;
  return Math.min(1, Number(containRatio.toFixed(3)));
}

const panelStyle: CSSProperties = {
  width: 230,
  flexShrink: 0,
  background: "#fff",
  borderLeft: "1px solid #e6eaf0",
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

const emptyStyle: CSSProperties = {
  flex: 1,
  display: "grid",
  placeItems: "center",
  gap: 8,
  textAlign: "center",
  color: "#94a3b8",
  fontSize: 12,
  padding: 20,
};

const scrollStyle: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: 14,
  display: "grid",
  gap: 12,
  alignContent: "start",
};

const tinyTitleStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#a6afbf",
};

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  marginTop: 10,
  minHeight: 28,
  padding: "0 10px",
  borderRadius: 999,
  background: "#f8fafc",
  color: "#334155",
  fontSize: 12,
  fontWeight: 700,
};

const fieldGridStyle: CSSProperties = {
  marginTop: 10,
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
};

const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#617286",
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 36,
  borderRadius: 8,
  border: "1px solid #d5d9e6",
  padding: "0 10px",
  fontSize: 12,
  color: "#13243b",
};

const colorGridStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 10,
};

const colorDotStyle = (color: string, active: boolean, enabled: boolean): CSSProperties => ({
  width: 22,
  height: 22,
  borderRadius: 999,
  border: `2px solid ${active ? "#111827" : "transparent"}`,
  background: color,
  cursor: enabled ? "pointer" : "not-allowed",
  opacity: enabled ? 1 : 0.6,
});

const rotButtonStyle = (active: boolean, enabled: boolean): CSSProperties => ({
  flex: 1,
  minHeight: 34,
  borderRadius: 8,
  border: `1px solid ${active ? "#1a1a2e" : "#d5d9e6"}`,
  background: active ? "#1a1a2e" : "#fff",
  color: active ? "#fff" : "#334155",
  fontSize: 11,
  fontWeight: 700,
  cursor: enabled ? "pointer" : "not-allowed",
  opacity: enabled ? 1 : 0.6,
});

const actionBarStyle: CSSProperties = {
  padding: 14,
  borderTop: "1px solid #eef2f6",
};

const deleteButtonStyle = (enabled: boolean): CSSProperties => ({
  width: "100%",
  minHeight: 38,
  borderRadius: 10,
  border: "1px solid #fecaca",
  background: "#fff5f5",
  color: "#b91c1c",
  fontSize: 12,
  fontWeight: 800,
  cursor: enabled ? "pointer" : "not-allowed",
  opacity: enabled ? 1 : 0.6,
});

const previewCardStyle: CSSProperties = {
  marginTop: 10,
  width: "100%",
  border: "1px solid #dbe4f0",
  background: "#f8fbff",
  borderRadius: 12,
  padding: 0,
  overflow: "hidden",
  cursor: "zoom-in",
  display: "grid",
};

const previewImageStyle: CSSProperties = {
  display: "block",
  width: "100%",
  height: 148,
  objectFit: "contain",
  background: "#ffffff",
};

const previewCaptionStyle: CSSProperties = {
  display: "grid",
  gap: 2,
  padding: "10px 12px",
  textAlign: "left",
  fontSize: 11,
  color: "#64748b",
};

const emptyFacingStyle: CSSProperties = {
  marginTop: 10,
  minHeight: 90,
  borderRadius: 12,
  border: "1px dashed #d5d9e6",
  background: "#f8fafc",
  display: "grid",
  placeItems: "center",
  textAlign: "center",
  color: "#94a3b8",
  fontSize: 12,
  padding: 12,
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.78)",
  display: "grid",
  placeItems: "center",
  padding: 20,
  zIndex: 1500,
};

const overlayToolbarStyle: CSSProperties = {
  position: "absolute",
  top: 14,
  right: 14,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 10,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(15,23,42,0.86)",
  boxShadow: "0 12px 40px rgba(0,0,0,0.28)",
  zIndex: 3,
};

const toolButtonStyle: CSSProperties = {
  minHeight: 36,
  padding: "0 14px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const zoomBadgeStyle: CSSProperties = {
  minWidth: 64,
  textAlign: "center",
  color: "#fff",
  fontSize: 12,
  fontWeight: 800,
};

const overlayViewportStyle = (grabbable: boolean, dragging: boolean): CSSProperties => ({
  position: "relative",
  width: "min(96vw, 1600px)",
  height: "min(90vh, 1000px)",
  overflow: "hidden",
  borderRadius: 14,
  background: "#fff",
  boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
  cursor: grabbable ? (dragging ? "grabbing" : "grab") : "default",
  touchAction: "none",
});

const overlayStageStyle = (offset: { x: number; y: number }): CSSProperties => ({
  position: "absolute",
  inset: "84px 28px 28px",
  display: "grid",
  placeItems: "center",
  transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
});

const overlayImageStyle = (scale: number, grabbable: boolean): CSSProperties => ({
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
  userSelect: "none",
  transform: `scale(${scale})`,
  transformOrigin: "center center",
  transition: grabbable ? "none" : "transform 0.16s ease",
  cursor: grabbable ? "grab" : "default",
  position: "relative",
  zIndex: 1,
  pointerEvents: "none",
});

const closeOverlayStyle: CSSProperties = {
  minHeight: 36,
  padding: "0 14px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};
