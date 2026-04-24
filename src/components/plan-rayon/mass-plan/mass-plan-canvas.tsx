"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent as ReactMouseEvent } from "react";
import type { DragLibraryPayload, MassElement } from "@/components/plan-rayon/mass-plan/mass-plan-types";
import { GRID, PLAN_TITLE_BAR_HEIGHT } from "@/components/plan-rayon/mass-plan/mass-plan-types";

type Props = {
  planName: string;
  canvasW: number;
  canvasH: number;
  elements: MassElement[];
  selectedIds: Set<string>;
  zoom: number;
  gridEnabled: boolean;
  canWrite: boolean;
  onDropLibrary: (payload: DragLibraryPayload, x: number, y: number) => void;
  onSelectIds: (ids: Set<string>) => void;
  onPatchElements: (ids: string[], updater: (element: MassElement, index: number) => MassElement) => void;
  onClearSelection: () => void;
  onDuplicateElement: (elementId: string) => void;
  onToggleRotation: (elementId: string) => void;
  onBringToFront: (elementId: string) => void;
  onDeleteElement: (elementId: string) => void;
};

type LassoRect = { x: number; y: number; w: number; h: number };
type ContextMenuState = { x: number; y: number; elementId: string } | null;
type HoverCardState = { left: number; top: number; element: MassElement } | null;

export function MassPlanCanvas(props: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [lasso, setLasso] = useState<LassoRect | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [hoverCard, setHoverCard] = useState<HoverCardState>(null);
  const [panning, setPanning] = useState(false);
  const lassoStart = useRef<{ x: number; y: number } | null>(null);
  const lassoRectRef = useRef<LassoRect | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
        props.onClearSelection();
      }
    };
    const onPointerDown = () => setContextMenu(null);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [props]);

  const elementBounds = useMemo(
    () =>
      props.elements.map((element) => ({
        id: element.id,
        left: element.x,
        top: element.y,
        right: element.x + element.w,
        bottom: element.y + element.h,
      })),
    [props.elements],
  );

  function toCanvasPoint(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / props.zoom,
      y: (clientY - rect.top) / props.zoom,
    };
  }

  function snap(value: number) {
    return props.gridEnabled ? Math.round(value / GRID) * GRID : Math.round(value);
  }

  function clampPosition(element: MassElement, x: number, y: number) {
    return {
      x: Math.max(0, Math.min(props.canvasW - element.w, snap(x))),
      y: Math.max(PLAN_TITLE_BAR_HEIGHT, Math.min(props.canvasH - element.h, snap(y))),
    };
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    if (!props.canWrite) return;
    const raw = event.dataTransfer.getData("application/json");
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as DragLibraryPayload;
      const point = toCanvasPoint(event.clientX, event.clientY);
      props.onDropLibrary(payload, snap(point.x), snap(point.y));
    } catch {
      return;
    }
  }

  function startDrag(event: ReactMouseEvent, target: MassElement, resize = false) {
    if (!props.canWrite) return;
    event.stopPropagation();
    event.preventDefault();
    const initialPoint = toCanvasPoint(event.clientX, event.clientY);
    const activeIds = props.selectedIds.has(target.id) ? Array.from(props.selectedIds) : [target.id];
    if (!props.selectedIds.has(target.id)) props.onSelectIds(new Set([target.id]));
    const snapshot = props.elements.filter((element) => activeIds.includes(element.id));
    const previousUserSelect = document.body.style.userSelect;
    const previousWebkitUserSelect = document.body.style.webkitUserSelect;
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";

    const onMove = (moveEvent: MouseEvent) => {
      const point = toCanvasPoint(moveEvent.clientX, moveEvent.clientY);
      const dx = point.x - initialPoint.x;
      const dy = point.y - initialPoint.y;

      props.onPatchElements(activeIds, (element, index) => {
        const base = snapshot[index];
        if (!base) return element;
        if (resize && activeIds.length === 1) {
          const nextW = Math.max(GRID, snap(base.w + dx));
          const nextH = Math.max(GRID, snap(base.h + dy));
          return {
            ...element,
            w: Math.min(nextW, props.canvasW - base.x),
            h: Math.min(nextH, props.canvasH - base.y),
          };
        }

        const next = clampPosition(base, base.x + dx, base.y + dy);
        return { ...element, x: next.x, y: next.y };
      });
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = previousUserSelect;
      document.body.style.webkitUserSelect = previousWebkitUserSelect;
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function handleCanvasMouseDown(event: ReactMouseEvent) {
    setContextMenu(null);
    setHoverCard(null);
    event.preventDefault();

    const clickedCanvasBackground =
      event.target === canvasRef.current || !((event.target as HTMLElement).closest("[data-canvas-item='true']"));

    if (props.zoom > 1 && clickedCanvasBackground && scrollRef.current) {
      const scrollEl = scrollRef.current;
      const startX = event.clientX;
      const startY = event.clientY;
      const startScrollLeft = scrollEl.scrollLeft;
      const startScrollTop = scrollEl.scrollTop;
      setPanning(true);

      const onMove = (moveEvent: MouseEvent) => {
        scrollEl.scrollLeft = startScrollLeft - (moveEvent.clientX - startX);
        scrollEl.scrollTop = startScrollTop - (moveEvent.clientY - startY);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        setPanning(false);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      return;
    }

    if (!props.canWrite) {
      props.onClearSelection();
      return;
    }

    if (event.target !== canvasRef.current) {
      if (!(event.target as HTMLElement).closest("[data-canvas-item='true']")) return;
    }
    const point = toCanvasPoint(event.clientX, event.clientY);
    lassoStart.current = point;
    const initialRect = { x: point.x, y: point.y, w: 0, h: 0 };
    lassoRectRef.current = initialRect;
    setLasso(initialRect);

    const onMove = (moveEvent: MouseEvent) => {
      if (!lassoStart.current) return;
      const current = toCanvasPoint(moveEvent.clientX, moveEvent.clientY);
      const x = Math.min(lassoStart.current.x, current.x);
      const y = Math.min(lassoStart.current.y, current.y);
      const w = Math.abs(current.x - lassoStart.current.x);
      const h = Math.abs(current.y - lassoStart.current.y);
      const nextRect = { x, y, w, h };
      lassoRectRef.current = nextRect;
      setLasso(nextRect);
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      const finalRect = lassoRectRef.current;
      if (lassoStart.current && finalRect && (finalRect.w > 3 || finalRect.h > 3)) {
        const selected = elementBounds
          .filter(
            (bound) =>
              bound.left < finalRect.x + finalRect.w &&
              bound.right > finalRect.x &&
              bound.top < finalRect.y + finalRect.h &&
              bound.bottom > finalRect.y,
          )
          .map((bound) => bound.id);
        props.onSelectIds(new Set(selected));
      } else {
        props.onClearSelection();
      }
      lassoStart.current = null;
      lassoRectRef.current = null;
      setLasso(null);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  return (
    <div ref={wrapperRef} style={wrapperStyle}>
      <div style={toolbarHintStyle}>{props.gridEnabled ? "Grille 40px active" : "Placement libre"}</div>
      <div ref={scrollRef} style={scrollStyle(props.zoom > 1, panning)}>
        <div style={{ transform: `scale(${props.zoom})`, transformOrigin: "top left", width: props.canvasW, height: props.canvasH }}>
          <div
            ref={canvasRef}
            style={canvasStyle(props.canvasW, props.canvasH, props.gridEnabled)}
            onMouseDown={handleCanvasMouseDown}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <div style={titleBarStyle}>
              <span>PLAN DE MASSE —</span>
              <span style={titleNameStyle}>{props.planName}</span>
              <span style={{ marginLeft: "auto", fontSize: 10 }}>{new Date().toLocaleDateString("fr-FR")}</span>
            </div>

            {!props.elements.length ? (
              <div style={emptyStyle}>
                <span style={{ fontSize: 40 }}>🏪</span>
                <span>Glissez des rayons ou des structures depuis la bibliothèque</span>
              </div>
            ) : null}

            {props.elements.map((element) => (
              <ElementBlock
                key={element.id}
                element={element}
                wrapper={wrapperRef.current}
                selected={props.selectedIds.has(element.id)}
                multiSelected={props.selectedIds.size > 1 && props.selectedIds.has(element.id)}
                canWrite={props.canWrite}
                onSelect={() => props.onSelectIds(new Set([element.id]))}
                onMouseDown={startDrag}
                onContextMenu={(event) => {
                  if (!props.canWrite) return;
                  event.preventDefault();
                  setHoverCard(null);
                  props.onSelectIds(new Set([element.id]));
                  setContextMenu({ x: event.clientX, y: event.clientY, elementId: element.id });
                }}
                onHoverChange={setHoverCard}
              />
            ))}

            {lasso ? <div style={lassoStyle(lasso)} /> : null}
          </div>
        </div>
      </div>
      {contextMenu ? (
        <div style={contextMenuStyle(contextMenu.x, contextMenu.y)} onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => { props.onDuplicateElement(contextMenu.elementId); setContextMenu(null); }} style={contextItemStyle(false)}>⧉ Dupliquer</button>
          <button type="button" onClick={() => { props.onToggleRotation(contextMenu.elementId); setContextMenu(null); }} style={contextItemStyle(false)}>↺ Rotation label</button>
          <button type="button" onClick={() => { props.onBringToFront(contextMenu.elementId); setContextMenu(null); }} style={contextItemStyle(false)}>↥ Premier plan</button>
          <button type="button" onClick={() => { props.onDeleteElement(contextMenu.elementId); setContextMenu(null); }} style={contextItemStyle(true)}>⌫ Supprimer</button>
        </div>
      ) : null}
      {hoverCard ? <HoverCard hoverCard={hoverCard} /> : null}
    </div>
  );
}

function ElementBlock({
  element,
  wrapper,
  selected,
  multiSelected,
  canWrite,
  onSelect,
  onMouseDown,
  onContextMenu,
  onHoverChange,
}: {
  element: MassElement;
  wrapper: HTMLDivElement | null;
  selected: boolean;
  multiSelected: boolean;
  canWrite: boolean;
  onSelect: () => void;
  onMouseDown: (event: React.MouseEvent, element: MassElement, resize?: boolean) => void;
  onContextMenu: (event: ReactMouseEvent) => void;
  onHoverChange: (state: HoverCardState) => void;
}) {
  const isRayon = element.element_type === "rayon";
  const elementColor = element.color ?? element.rayon_color ?? "#0a4f98";
  const cols = Math.max(1, Math.round(element.w / GRID));
  const rows = Math.max(1, Math.round(element.h / GRID));
  const elems = cols * rows;
  const small = cols < 4 && !element.rotated;
  const textColor = getElementTextColor(element.element_type, elementColor);
  const name = element.rayon_name ?? element.label ?? "";
  const showFullName = !element.rotated && cols >= 4;
  const shouldShowHoverCard = Boolean(name) && !showFullName;

  return (
    <div
      data-canvas-item="true"
      onContextMenu={onContextMenu}
      onMouseEnter={(event) => {
        if (!shouldShowHoverCard) return;
        onHoverChange(getHoverCardState(event.currentTarget, element, wrapper));
      }}
      onMouseLeave={() => onHoverChange(null)}
      onMouseDown={(event) => {
        onHoverChange(null);
        onSelect();
        onMouseDown(event, element, false);
      }}
      style={elementStyle(element, selected, multiSelected, elementColor, textColor)}
      title={small ? name : undefined}
    >
      {isRayon ? <div style={dividerLayerStyle(elementColor, cols, rows)} /> : null}
      <div style={innerStyle(element.rotated)}>
        <div style={labelStyle(textColor, showFullName)}>{small ? getInitials(name) : name}</div>
        {isRayon ? <div style={subLabelStyle(textColor)}>{elems} éléments</div> : null}
      </div>
      {selected && canWrite ? (
        <div
          onMouseDown={(event) => onMouseDown(event, element, true)}
          style={resizeHandleStyle}
        >
          ⤡
        </div>
      ) : null}
    </div>
  );
}

function HoverCard({ hoverCard }: { hoverCard: NonNullable<HoverCardState> }) {
  const name = hoverCard.element.rayon_name ?? hoverCard.element.label ?? "Élément";
  const isRayon = hoverCard.element.element_type === "rayon";
  const meta = isRayon
    ? `${hoverCard.element.rayon_elem_count ?? Math.max(1, Math.round(hoverCard.element.w / GRID) * Math.round(hoverCard.element.h / GRID))} éléments`
    : hoverCard.element.element_type === "alley-h" || hoverCard.element.element_type === "alley-v"
      ? "Allée"
      : hoverCard.element.element_type === "tete-gondole"
        ? "Tête de gondole"
        : "Gondole basse";

  return (
    <div style={hoverCardStyle(hoverCard.left, hoverCard.top)}>
      <div style={hoverCardTitleStyle}>{name}</div>
      <div style={hoverCardMetaStyle}>{meta}</div>
      {hoverCard.element.rayon_universe_name ? (
        <div style={hoverCardChipStyle}>{hoverCard.element.rayon_universe_name}</div>
      ) : null}
    </div>
  );
}

function getHoverCardState(
  target: HTMLDivElement,
  element: MassElement,
  container: HTMLDivElement | null,
): NonNullable<HoverCardState> {
  const rect = target.getBoundingClientRect();
  const containerRect = container?.getBoundingClientRect() ?? null;
  const cardWidth = 220;
  const cardHeight = 92;
  const gap = 8;
  const viewportWidth = containerRect?.width ?? (typeof window !== "undefined" ? window.innerWidth : rect.right + cardWidth);
  const viewportHeight = containerRect?.height ?? (typeof window !== "undefined" ? window.innerHeight : rect.bottom + cardHeight);
  const margin = 12;

  const localRect = containerRect
    ? {
        left: rect.left - containerRect.left,
        right: rect.right - containerRect.left,
        top: rect.top - containerRect.top,
        bottom: rect.bottom - containerRect.top,
        width: rect.width,
        height: rect.height,
      }
    : rect;

  let left: number;
  let top: number;

  if (localRect.width >= localRect.height) {
    const centeredLeft = localRect.left + localRect.width / 2 - cardWidth / 2;
    left = Math.max(margin, Math.min(centeredLeft, viewportWidth - cardWidth - margin));

    const aboveTop = localRect.top - cardHeight - gap;
    const belowTop = localRect.bottom + gap;
    top =
      aboveTop >= margin
        ? aboveTop
        : Math.min(belowTop, viewportHeight - cardHeight - margin);
  } else {
    const preferredLeft = localRect.right + gap;
    const fallbackLeft = localRect.left - cardWidth - gap;
    left =
      preferredLeft + cardWidth <= viewportWidth - margin
        ? preferredLeft
        : Math.max(margin, fallbackLeft);

    const centeredTop = localRect.top + localRect.height / 2 - cardHeight / 2;
    top = Math.max(margin, Math.min(centeredTop, viewportHeight - cardHeight - margin));
  }

  return { left, top, element };
}

function getInitials(value: string) {
  const words = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !["de", "du", "des", "le", "la", "les", "et", "a", "au", "à"].includes(part.toLowerCase()));
  if (words.length <= 1) return `${(words[0] ?? value).slice(0, 4).toUpperCase()}.`;
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}

function getContrastColor(color: string) {
  const hex = color.replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((char) => `${char}${char}`).join("") : hex;
  const value = Number.parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#13243b" : "#ffffff";
}

function getElementTextColor(type: MassElement["element_type"], color: string) {
  if (type === "rayon") return color;
  if (type === "alley-h" || type === "alley-v") return "#7c8698";
  return getContrastColor(color);
}

function elementStyle(element: MassElement, selected: boolean, multiSelected: boolean, color: string, textColor: string): CSSProperties {
  const isRayon = element.element_type === "rayon";
  const isAlley = element.element_type === "alley-h" || element.element_type === "alley-v";
  const background = isRayon
    ? `${color}1f`
    : isAlley
      ? "repeating-linear-gradient(45deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 4px, transparent 4px, transparent 12px)"
      : color;
  const border = isRayon ? `2px solid ${color}` : isAlley ? "1px dashed #b9c0cb" : "none";
  return {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.w,
    height: element.h,
    borderRadius: 4,
    overflow: "hidden",
    background,
    border,
    boxShadow: selected ? "0 0 0 3px rgba(212,5,17,0.15), 0 4px 18px rgba(0,0,0,0.16)" : "none",
    outline: multiSelected ? "2px solid #d40511" : "none",
    color: textColor,
    cursor: "grab",
    zIndex: selected ? 20 : element.z_index,
  };
}

function dividerLayerStyle(color: string, cols: number, rows: number): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    backgroundImage: [
      ...Array.from({ length: Math.max(0, cols - 1) }, (_, index) => `linear-gradient(to right, transparent ${(index + 1) * GRID - 1}px, ${color}44 ${(index + 1) * GRID}px, transparent ${(index + 1) * GRID + 1}px)`),
      ...Array.from({ length: Math.max(0, rows - 1) }, (_, index) => `linear-gradient(to bottom, transparent ${(index + 1) * GRID - 1}px, ${color}44 ${(index + 1) * GRID}px, transparent ${(index + 1) * GRID + 1}px)`),
    ].join(","),
    pointerEvents: "none",
  };
}

const wrapperStyle: CSSProperties = {
  position: "relative",
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  background: "#eef0f4",
};

const toolbarHintStyle: CSSProperties = {
  height: 30,
  display: "flex",
  alignItems: "center",
  padding: "0 16px",
  background: "#fff",
  borderBottom: "1px solid #e6eaf0",
  fontSize: 11,
  fontWeight: 700,
  color: "#6b7a99",
};

const scrollStyle = (grabbable: boolean, panning: boolean): CSSProperties => ({
  flex: 1,
  overflow: "auto",
  padding: 32,
  cursor: grabbable ? (panning ? "grabbing" : "grab") : "default",
});

const canvasStyle = (w: number, h: number, gridEnabled: boolean): CSSProperties => ({
  position: "relative",
  width: w,
  height: h,
  background: "#fff",
  border: "1px solid #d9dee8",
  borderRadius: 4,
  boxShadow: "0 12px 30px rgba(15,23,42,0.14)",
  overflow: "hidden",
  backgroundImage: gridEnabled
    ? "linear-gradient(to right, #e8eaed 1px, transparent 1px), linear-gradient(to bottom, #e8eaed 1px, transparent 1px)"
    : "none",
  backgroundSize: `${GRID}px ${GRID}px`,
  userSelect: "none",
  WebkitUserSelect: "none",
});

const titleBarStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: PLAN_TITLE_BAR_HEIGHT,
  background: "#1a1a2e",
  color: "rgba(255,255,255,0.72)",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "0 12px",
  zIndex: 4,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.05em",
};

const titleNameStyle: CSSProperties = {
  color: "#fff",
  fontSize: 12,
  fontFamily: "Fraunces, serif",
};

const emptyStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  textAlign: "center",
  gap: 8,
  color: "#c0c7d4",
  fontSize: 13,
  fontWeight: 600,
};

const innerStyle = (rotated: boolean): CSSProperties => ({
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  padding: 4,
  pointerEvents: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
  ...(rotated ? { writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" } : {}),
});

const labelStyle = (color: string, expanded: boolean): CSSProperties => ({
  fontSize: expanded ? 11 : 10,
  fontWeight: 800,
  lineHeight: 1.2,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color,
  textAlign: "center",
  paddingInline: 4,
  whiteSpace: expanded ? "normal" : "nowrap",
  wordBreak: expanded ? "break-word" : "normal",
  textWrap: expanded ? "balance" : "nowrap",
});

const subLabelStyle = (color: string): CSSProperties => ({
  fontSize: 9,
  fontWeight: 600,
  opacity: 0.9,
  color,
  textAlign: "center",
});

const resizeHandleStyle: CSSProperties = {
  position: "absolute",
  right: 1,
  bottom: 1,
  width: 14,
  height: 14,
  display: "grid",
  placeItems: "center",
  color: "#d40511",
  fontSize: 10,
  cursor: "se-resize",
  zIndex: 30,
};

const lassoStyle = (lasso: LassoRect): CSSProperties => ({
  position: "absolute",
  left: lasso.x,
  top: lasso.y,
  width: lasso.w,
  height: lasso.h,
  border: "2px dashed #d40511",
  background: "rgba(212,5,17,0.05)",
  borderRadius: 2,
  pointerEvents: "none",
  zIndex: 50,
});

const contextMenuStyle = (x: number, y: number): CSSProperties => ({
  position: "fixed",
  left: x,
  top: y,
  minWidth: 180,
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  boxShadow: "0 18px 36px rgba(15,23,42,0.18)",
  padding: 6,
  zIndex: 2000,
  display: "grid",
  gap: 2,
});

const contextItemStyle = (danger: boolean): CSSProperties => ({
  minHeight: 36,
  borderRadius: 10,
  border: "none",
  background: "transparent",
  color: danger ? "#d40511" : "#1f2b4d",
  fontSize: 13,
  fontWeight: 700,
  textAlign: "left",
  padding: "0 12px",
  cursor: "pointer",
});

const hoverCardStyle = (left: number, top: number): CSSProperties => ({
  position: "absolute",
  left,
  top,
  minWidth: 170,
  maxWidth: 220,
  borderRadius: 12,
  background: "rgba(19,36,59,0.96)",
  color: "#fff",
  boxShadow: "0 18px 40px rgba(15,23,42,0.28)",
  padding: "10px 12px",
  zIndex: 2200,
  pointerEvents: "none",
  display: "grid",
  gap: 4,
});

const hoverCardTitleStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.35,
};

const hoverCardMetaStyle: CSSProperties = {
  fontSize: 11,
  color: "rgba(255,255,255,0.74)",
};

const hoverCardChipStyle: CSSProperties = {
  width: "fit-content",
  marginTop: 4,
  minHeight: 22,
  display: "inline-flex",
  alignItems: "center",
  padding: "0 8px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.12)",
  fontSize: 10,
  fontWeight: 700,
  color: "#fff",
};
