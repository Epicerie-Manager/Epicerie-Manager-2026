"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Card } from "@/components/ui/card";
import { PLAN_RAYON_COLOR_PALETTE } from "@/components/plan-rayon/color-palette";
import type { ElementType, MassElement, TextModuleAlign, TextModuleBorderStyle, TextModuleFontFamily } from "@/components/plan-rayon/mass-plan/mass-plan-types";
import { getDefaultTextModuleStyle, getTextModuleStyle } from "@/lib/mass-plan-text";

type Props = {
  selected: MassElement | null;
  selectedElements: MassElement[];
  canWrite: boolean;
  onPatch: (patch: Partial<MassElement>) => void;
  onSetSelectedRotation: (rotated: boolean) => void;
  onSetSelectedColor: (color: string) => void;
  onDelete: () => void;
};

export function MassPlanInspector({
  selected,
  selectedElements,
  canWrite,
  onPatch,
  onSetSelectedRotation,
  onSetSelectedColor,
  onDelete,
}: Props) {
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

  if (!selectedElements.length) {
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

  if (selectedElements.length > 1) {
    const colorableSelection = selectedElements.filter(
      (element) => element.element_type !== "alley-h" && element.element_type !== "alley-v",
    );
    const firstColor = colorableSelection[0]?.color ?? colorableSelection[0]?.rayon_color ?? null;
    const sharedColor =
      firstColor && colorableSelection.every((element) => (element.color ?? element.rayon_color ?? null) === firstColor)
        ? firstColor
        : null;
    const allRotated = selectedElements.every((element) => element.rotated);
    const allHorizontal = selectedElements.every((element) => !element.rotated);

    return (
      <div style={panelStyle}>
        <div style={sectionTitleStyle}>Propriétés</div>
        <div style={scrollStyle}>
          <Card static style={{ padding: 14, borderRadius: 14 }}>
            <div style={tinyTitleStyle}>Sélection</div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: "#13243b" }}>
              {selectedElements.length} éléments sélectionnés
            </div>
            <div style={multiHintStyle}>
              Appliquez une action à toute la sélection sans repasser élément par élément.
            </div>
          </Card>

          <Card static style={{ padding: 14, borderRadius: 14 }}>
            <div style={tinyTitleStyle}>Orientation</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => onSetSelectedRotation(false)}
                disabled={!canWrite}
                style={rotButtonStyle(allHorizontal, canWrite)}
              >
                Horizontal
              </button>
              <button
                type="button"
                onClick={() => onSetSelectedRotation(true)}
                disabled={!canWrite}
                style={rotButtonStyle(allRotated, canWrite)}
              >
                Vertical
              </button>
            </div>
          </Card>

          {colorableSelection.length ? (
            <Card static style={{ padding: 14, borderRadius: 14 }}>
              <div style={tinyTitleStyle}>Couleur</div>
              <div style={multiHintStyle}>
                {colorableSelection.length === selectedElements.length
                  ? "Appliquer une couleur à toute la sélection."
                  : `Appliquer une couleur aux ${colorableSelection.length} éléments compatibles.`}
              </div>
              <div style={colorGridStyle}>
                {PLAN_RAYON_COLOR_PALETTE.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    disabled={!canWrite}
                    onClick={() => onSetSelectedColor(entry)}
                    style={colorDotStyle(entry, sharedColor === entry, canWrite)}
                  />
                ))}
              </div>
            </Card>
          ) : null}
        </div>
        <div style={actionBarStyle}>
          <button type="button" disabled={!canWrite} onClick={onDelete} style={deleteButtonStyle(canWrite)}>
            Supprimer la sélection
          </button>
        </div>
      </div>
    );
  }

  if (!selected) {
    return null;
  }

  const currentColor = selected.color ?? selected.rayon_color ?? "#0a4f98";
  const isTextElement = selected.element_type === "text";
  const textStyle = getTextModuleStyle(selected);
  const showColor = selected.element_type !== "alley-h" && selected.element_type !== "alley-v";

  function patchTextStyle(patch: Partial<NonNullable<MassElement["text_style"]>>) {
    if (!isTextElement) return;
    onPatch({
      text_style: {
        ...(textStyle ?? getDefaultTextModuleStyle()),
        ...patch,
      },
      color: patch.textColor ?? selected?.color ?? textStyle?.textColor ?? currentColor,
    });
  }

  return (
    <div style={panelStyle}>
      <div style={sectionTitleStyle}>Propriétés</div>
      <div style={scrollStyle}>
        <Card static style={{ padding: 14, borderRadius: 14 }}>
          <div style={tinyTitleStyle}>Élément</div>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: "#13243b" }}>
            {selected.label ?? selected.rayon_name ?? getTypeLabel(selected.element_type)}
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
                <img src={selected.rayon_facing_url} alt={`Facing ${selected.label ?? selected.rayon_name ?? ""}`} style={previewImageStyle} />
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
          <div style={tinyTitleStyle}>{isTextElement ? "Contenu" : "Libellé"}</div>
          {isTextElement ? (
            <textarea
              value={selected.label ?? ""}
              disabled={!canWrite}
              onChange={(event) => onPatch({ label: event.target.value })}
              style={{ ...textareaStyle, minHeight: 120 }}
              placeholder={"Texte libre\nUne ligne par point si vous activez les puces"}
            />
          ) : (
            <input
              value={selected.label ?? ""}
              disabled={!canWrite}
              onChange={(event) => onPatch({ label: event.target.value })}
              style={inputStyle}
              placeholder="Nom affiché"
            />
          )}
        </Card>

        {isTextElement ? (
          <>
            <Card static style={{ padding: 14, borderRadius: 14 }}>
              <div style={tinyTitleStyle}>Typographie</div>
              <div style={fieldStackStyle}>
                <label style={fieldLabelWrapStyle}>
                  <span style={labelStyle}>Police</span>
                  <select
                    value={textStyle?.fontFamily ?? "dm-sans"}
                    disabled={!canWrite}
                    onChange={(event) => patchTextStyle({ fontFamily: event.target.value as TextModuleFontFamily })}
                    style={inputStyle}
                  >
                    <option value="dm-sans">DM Sans</option>
                    <option value="fraunces">Fraunces</option>
                    <option value="geist-sans">Geist Sans</option>
                    <option value="geist-mono">Geist Mono</option>
                  </select>
                </label>
                <div style={fieldGridStyle}>
                  <Field
                    label="Taille"
                    value={textStyle?.fontSize ?? 18}
                    disabled={!canWrite}
                    onChange={(value) => patchTextStyle({ fontSize: Math.max(10, Math.min(48, value)) })}
                  />
                  <Field
                    label="Interligne"
                    value={Math.round((textStyle?.lineHeight ?? 1.35) * 100)}
                    disabled={!canWrite}
                    onChange={(value) => patchTextStyle({ lineHeight: Math.max(1, Math.min(2.2, value / 100)) })}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => patchTextStyle({ fontWeight: 500 })}
                    disabled={!canWrite}
                    style={rotButtonStyle((textStyle?.fontWeight ?? 700) === 500, canWrite)}
                  >
                    Regular
                  </button>
                  <button
                    type="button"
                    onClick={() => patchTextStyle({ fontWeight: 700 })}
                    disabled={!canWrite}
                    style={rotButtonStyle((textStyle?.fontWeight ?? 700) === 700, canWrite)}
                  >
                    Bold
                  </button>
                  <button
                    type="button"
                    onClick={() => patchTextStyle({ fontWeight: 800 })}
                    disabled={!canWrite}
                    style={rotButtonStyle((textStyle?.fontWeight ?? 700) === 800, canWrite)}
                  >
                    Extra
                  </button>
                </div>
              </div>
            </Card>

            <Card static style={{ padding: 14, borderRadius: 14 }}>
              <div style={tinyTitleStyle}>Mise en forme</div>
              <div style={fieldStackStyle}>
                <div style={{ display: "flex", gap: 8 }}>
                  {TEXT_ALIGN_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => patchTextStyle({ textAlign: option.value })}
                      disabled={!canWrite}
                      style={rotButtonStyle((textStyle?.textAlign ?? "center") === option.value, canWrite)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => patchTextStyle({ bulletMode: !(textStyle?.bulletMode ?? false) })}
                    disabled={!canWrite}
                    style={rotButtonStyle(Boolean(textStyle?.bulletMode), canWrite)}
                  >
                    Puces
                  </button>
                  <label style={fieldLabelWrapStyle}>
                    <span style={labelStyle}>Padding</span>
                    <input
                      type="number"
                      value={Math.round(textStyle?.padding ?? 14)}
                      disabled={!canWrite}
                      onChange={(event) =>
                        patchTextStyle({ padding: Math.max(4, Math.min(40, Number(event.target.value) || 14)) })
                      }
                      style={inputStyle}
                    />
                  </label>
                </div>
              </div>
            </Card>
          </>
        ) : null}

        {showColor ? (
          <Card static style={{ padding: 14, borderRadius: 14 }}>
            <div style={tinyTitleStyle}>{isTextElement ? "Couleurs" : "Couleur"}</div>
            {isTextElement ? (
              <div style={fieldStackStyle}>
                <div>
                  <div style={subSectionTitleStyle}>Texte</div>
                  <div style={colorGridStyle}>
                    {PLAN_RAYON_COLOR_PALETTE.map((entry) => (
                      <button
                        key={`text-${entry}`}
                        type="button"
                        disabled={!canWrite}
                        onClick={() => patchTextStyle({ textColor: entry })}
                        style={colorDotStyle(entry, (textStyle?.textColor ?? currentColor) === entry, canWrite)}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div style={subSectionTitleStyle}>Cadre</div>
                  <div style={fieldStackStyle}>
                    <div style={colorGridStyle}>
                      {PLAN_RAYON_COLOR_PALETTE.map((entry) => (
                        <button
                          key={`border-${entry}`}
                          type="button"
                          disabled={!canWrite}
                          onClick={() => patchTextStyle({ borderColor: entry })}
                          style={colorDotStyle(entry, (textStyle?.borderColor ?? "#cbd5e1") === entry, canWrite)}
                        />
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {TEXT_BORDER_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => patchTextStyle({ borderStyle: option.value })}
                          disabled={!canWrite}
                          style={rotButtonStyle((textStyle?.borderStyle ?? "dashed") === option.value, canWrite)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <div style={subSectionTitleStyle}>Fond</div>
                  <div style={colorGridStyle}>
                    {TEXT_BACKGROUND_OPTIONS.map((entry) => (
                      <button
                        key={`bg-${entry.value}`}
                        type="button"
                        disabled={!canWrite}
                        onClick={() => patchTextStyle({ backgroundColor: entry.value })}
                        style={colorDotStyle(entry.swatch, (textStyle?.backgroundColor ?? "#ffffff") === entry.value, canWrite)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={colorGridStyle}>
                {PLAN_RAYON_COLOR_PALETTE.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    disabled={!canWrite}
                    onClick={() => onPatch({ color: entry })}
                    style={colorDotStyle(entry, currentColor === entry, canWrite)}
                  />
                ))}
              </div>
            )}
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
                alt={`Facing ${selected.label ?? selected.rayon_name ?? ""}`}
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
  if (type === "text") return "Zone de texte";
  return "Rayon";
}

const TEXT_ALIGN_OPTIONS: Array<{ label: string; value: TextModuleAlign }> = [
  { label: "Gauche", value: "left" },
  { label: "Centre", value: "center" },
  { label: "Droite", value: "right" },
];

const TEXT_BORDER_OPTIONS: Array<{ label: string; value: TextModuleBorderStyle }> = [
  { label: "Aucun", value: "none" },
  { label: "Trait", value: "solid" },
  { label: "Pointillé", value: "dashed" },
];

const TEXT_BACKGROUND_OPTIONS = [
  { value: "#ffffff", swatch: "#ffffff" },
  { value: "#f8fafc", swatch: "#f8fafc" },
  { value: "#fef3c7", swatch: "#fef3c7" },
  { value: "#ecfeff", swatch: "#ecfeff" },
  { value: "#fdf2f8", swatch: "#fdf2f8" },
  { value: "#f3f4f6", swatch: "#f3f4f6" },
];

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

const fieldLabelWrapStyle: CSSProperties = {
  display: "grid",
  gap: 4,
};

const fieldStackStyle: CSSProperties = {
  marginTop: 10,
  display: "grid",
  gap: 10,
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

const textareaStyle: CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  padding: "10px 10px",
  lineHeight: 1.45,
};

const colorGridStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 10,
};

const multiHintStyle: CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: "#64748b",
};

const subSectionTitleStyle: CSSProperties = {
  marginBottom: 8,
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
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
