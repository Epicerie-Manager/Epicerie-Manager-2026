"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import * as XLSX from "xlsx";
import { getSignedPlateauUrl } from "@/lib/plateau-store";

type PlateauExcelViewerProps = {
  filePath: string;
  sheetName?: string;
  weekLabel?: string;
};

type ViewerCell = {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
  text: string;
  style: CSSProperties;
};

type ViewerSheet = {
  width: number;
  height: number;
  cells: ViewerCell[];
  defaultColWidth: number;
  defaultRowHeight: number;
};

const DEFAULT_COL_WIDTH = 32;
const DEFAULT_ROW_HEIGHT = 24;

function getRgbColor(source: unknown, fallback: string) {
  if (!source || typeof source !== "object") return fallback;
  const color = source as { rgb?: string };
  if (!color.rgb) return fallback;
  const normalized = color.rgb.replace(/^FF/i, "").trim();
  if (normalized.length !== 6) return fallback;
  return `#${normalized}`;
}

function getFillColor(style: Record<string, unknown> | undefined) {
  const fill = style?.fill as { fgColor?: unknown; bgColor?: unknown; patternType?: string } | undefined;
  if (!fill) return "#ffffff";

  const fg = getRgbColor(fill.fgColor, "");
  const bg = getRgbColor(fill.bgColor, "");
  if (fg && fg !== "#000000") return fg;
  if (bg && bg !== "#000000") return bg;
  return "#ffffff";
}

function getBorderStyle(border: unknown, side: "top" | "right" | "bottom" | "left") {
  if (!border || typeof border !== "object") return "1px solid #d7e3f2";
  const entry = (border as Record<string, unknown>)[side];
  if (!entry || typeof entry !== "object") return "1px solid #d7e3f2";

  const borderEntry = entry as { style?: string; color?: { rgb?: string } };
  const color = getRgbColor(borderEntry.color, "#c8d8eb");
  const width =
    borderEntry.style === "thick" ? 3 :
    borderEntry.style === "medium" ? 2 :
    borderEntry.style === "hair" ? 0.5 :
    1;

  return `${width}px solid ${color}`;
}

function getCellText(cell: XLSX.CellObject | undefined) {
  if (!cell) return "";
  if (typeof cell.w === "string" && cell.w.trim()) return cell.w;
  if (typeof cell.v === "string") return cell.v;
  if (typeof cell.v === "number") return String(cell.v);
  if (cell.v instanceof Date && !Number.isNaN(cell.v.getTime())) {
    return cell.v.toLocaleDateString("fr-FR");
  }
  return "";
}

function inferTextMode(
  rotation: number,
  width: number,
  height: number,
  text: string,
) {
  const compactText = text.replace(/\s+/g, " ").trim();
  const forcedVertical = rotation === 90 || rotation === 255;
  const looksLikeSideLabel =
    compactText.length > 0 &&
    width <= 34 &&
    height >= 42;

  if (forcedVertical || looksLikeSideLabel) {
    return {
      writingMode: "vertical-rl" as const,
      transform: rotation === 255 ? "rotate(180deg)" : "none",
      textOrientation: "mixed" as const,
    };
  }

  return {
    writingMode: "horizontal-tb" as const,
    transform: "none",
    textOrientation: "mixed" as const,
  };
}

function buildViewerSheet(sheet: XLSX.WorkSheet): ViewerSheet {
  const ref = sheet["!ref"];
  if (!ref) {
    return {
      width: 0,
      height: 0,
      cells: [],
      defaultColWidth: DEFAULT_COL_WIDTH,
      defaultRowHeight: DEFAULT_ROW_HEIGHT,
    };
  }

  const range = XLSX.utils.decode_range(ref);
  const merges = Array.isArray(sheet["!merges"]) ? sheet["!merges"] : [];
  const mergeStarts = new Map<string, XLSX.Range>();
  const coveredCells = new Set<string>();

  merges.forEach((merge) => {
    mergeStarts.set(`${merge.s.r}:${merge.s.c}`, merge);
    for (let row = merge.s.r; row <= merge.e.r; row += 1) {
      for (let col = merge.s.c; col <= merge.e.c; col += 1) {
        if (row === merge.s.r && col === merge.s.c) continue;
        coveredCells.add(`${row}:${col}`);
      }
    }
  });

  const colWidths: number[] = [];
  const rowHeights: number[] = [];

  for (let col = range.s.c; col <= range.e.c; col += 1) {
    const colMeta = Array.isArray(sheet["!cols"]) ? sheet["!cols"][col] : undefined;
    const width =
      Number(colMeta?.wpx) ||
      (typeof colMeta?.wch === "number" ? Math.max(18, Math.round(colMeta.wch * 7.2)) : 0) ||
      DEFAULT_COL_WIDTH;
    colWidths.push(width);
  }

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    const rowMeta = Array.isArray(sheet["!rows"]) ? sheet["!rows"][row] : undefined;
    const height =
      Number(rowMeta?.hpx) ||
      (typeof rowMeta?.hpt === "number" ? Math.max(16, Math.round(rowMeta.hpt * 1.35)) : 0) ||
      DEFAULT_ROW_HEIGHT;
    rowHeights.push(height);
  }

  const colOffsets: number[] = [];
  const rowOffsets: number[] = [];
  let totalWidth = 0;
  let totalHeight = 0;

  colWidths.forEach((width) => {
    colOffsets.push(totalWidth);
    totalWidth += width;
  });

  rowHeights.forEach((height) => {
    rowOffsets.push(totalHeight);
    totalHeight += height;
  });

  const cells: ViewerCell[] = [];

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const relativeRow = row - range.s.r;
      const relativeCol = col - range.s.c;
      const key = `${row}:${col}`;

      if (coveredCells.has(key)) continue;

      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress] as (XLSX.CellObject & { s?: Record<string, unknown> }) | undefined;
      const merge = mergeStarts.get(key);

      const width = merge
        ? colWidths.slice(merge.s.c - range.s.c, merge.e.c - range.s.c + 1).reduce((sum, value) => sum + value, 0)
        : colWidths[relativeCol];
      const height = merge
        ? rowHeights.slice(merge.s.r - range.s.r, merge.e.r - range.s.r + 1).reduce((sum, value) => sum + value, 0)
        : rowHeights[relativeRow];

      const rawStyle = (cell?.s as Record<string, unknown> | undefined);
      const fill = getFillColor(rawStyle);
      const fontColor = getRgbColor((cell?.s as { font?: { color?: unknown } } | undefined)?.font?.color, "#111827");
      const baseFontSize = Number((cell?.s as { font?: { sz?: number } } | undefined)?.font?.sz ?? 10);
      const horizontal = String((cell?.s as { alignment?: { horizontal?: string } } | undefined)?.alignment?.horizontal ?? "").toLowerCase();
      const vertical = String((cell?.s as { alignment?: { vertical?: string } } | undefined)?.alignment?.vertical ?? "").toLowerCase();
      const rotation = Number((cell?.s as { alignment?: { textRotation?: number } } | undefined)?.alignment?.textRotation ?? 0);
      const wrapText = Boolean((cell?.s as { alignment?: { wrapText?: boolean } } | undefined)?.alignment?.wrapText);
      const fontName = String((cell?.s as { font?: { name?: string } } | undefined)?.font?.name ?? "Arial");
      const bold = Boolean((cell?.s as { font?: { bold?: boolean } } | undefined)?.font?.bold);

      const text = getCellText(cell);
      const hasContent = text.trim().length > 0;
      const hasStyledMerge = Boolean(merge);

      if (!hasContent && !hasStyledMerge) continue;

      const textMode = inferTextMode(rotation, width, height, text);
      const narrowCell = width <= 46;
      const tinyCell = width <= 28 || height <= 18;
      const adaptiveFontSize = Math.max(
        tinyCell ? 6.5 : narrowCell ? 7.2 : 8,
        Math.min(baseFontSize, Math.min(width / 4.2, height / 1.9, 24)),
      );

      cells.push({
        key,
        left: colOffsets[relativeCol],
        top: rowOffsets[relativeRow],
        width,
        height,
        text,
        style: {
          background: fill,
          color: fontColor,
          fontSize: adaptiveFontSize,
          fontFamily: fontName.includes("Calibri") ? "Arial, sans-serif" : `'${fontName}', Arial, sans-serif`,
          fontWeight: bold ? 700 : 500,
          justifyContent:
            horizontal === "center" ? "center" : horizontal === "right" ? "flex-end" : "flex-start",
          alignItems:
            vertical === "center" ? "center" : vertical === "bottom" ? "flex-end" : "flex-start",
          textAlign:
            horizontal === "center" ? "center" : horizontal === "right" ? "right" : "left",
          whiteSpace: wrapText ? "pre-wrap" : "nowrap",
          transform: textMode.transform,
          writingMode: textMode.writingMode,
          textOrientation: textMode.textOrientation,
          borderTop: getBorderStyle((cell?.s as { border?: unknown } | undefined)?.border, "top"),
          borderRight: getBorderStyle((cell?.s as { border?: unknown } | undefined)?.border, "right"),
          borderBottom: getBorderStyle((cell?.s as { border?: unknown } | undefined)?.border, "bottom"),
          borderLeft: getBorderStyle((cell?.s as { border?: unknown } | undefined)?.border, "left"),
        },
      });
    }
  }

  return {
    width: totalWidth,
    height: totalHeight,
    cells,
    defaultColWidth: DEFAULT_COL_WIDTH,
    defaultRowHeight: DEFAULT_ROW_HEIGHT,
  };
}

export default function PlateauExcelViewer({
  filePath,
  sheetName = "PLATEAU A",
  weekLabel,
}: PlateauExcelViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewerSheet, setViewerSheet] = useState<ViewerSheet | null>(null);
  const [zoom, setZoom] = useState(0.78);

  useEffect(() => {
    let cancelled = false;

    async function loadSheet() {
      if (!filePath) {
        setViewerSheet(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const signedUrl = await getSignedPlateauUrl(filePath, 3600);
        if (!signedUrl) {
          throw new Error("Impossible de générer l'accès sécurisé au plan.");
        }

        const response = await fetch(signedUrl, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Impossible de charger le fichier (${response.status}).`);
        }

        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        const workbook = XLSX.read(buffer, {
          type: "array",
          cellDates: true,
          cellStyles: true,
        });

        const targetSheetName =
          workbook.SheetNames.find((name) => name.trim().toUpperCase() === sheetName.trim().toUpperCase()) ??
          workbook.SheetNames.find((name) => name.trim().toUpperCase().startsWith(sheetName.trim().toUpperCase())) ??
          workbook.SheetNames.find((name) => name.trim().toUpperCase().startsWith("PLATEAU A")) ??
          workbook.SheetNames[0];

        const sheet = workbook.Sheets[targetSheetName];
        const nextViewerSheet = buildViewerSheet(sheet);

        if (!cancelled) {
          setViewerSheet(nextViewerSheet);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Erreur de chargement du plan.");
          setViewerSheet(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSheet();
    return () => {
      cancelled = true;
    };
  }, [filePath, sheetName]);

  const zoomLabel = useMemo(() => `${Math.round(zoom * 100)}%`, [zoom]);

  if (error) {
    return (
      <div
        style={{
          padding: 16,
          borderRadius: 14,
          border: "1px solid rgba(163,45,45,0.18)",
          background: "#fef2f2",
          color: "#a32d2d",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        {weekLabel ? (
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#64748b",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {weekLabel}
          </div>
        ) : (
          <div />
        )}

        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Zoom {zoomLabel}</span>
          <input
            type="range"
            min="0.45"
            max="1.2"
            step="0.05"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            style={{ width: 120, accentColor: "#c05a0c" }}
          />
        </div>
      </div>

      {loading ? (
        <div
          style={{
            padding: 18,
            borderRadius: 14,
            border: "1px solid #e8ecf1",
            background: "#ffffff",
            fontSize: 12,
            color: "#94a3b8",
          }}
        >
          Chargement du plan Excel...
        </div>
      ) : null}

      {viewerSheet ? (
        <div
          style={{
            overflow: "auto",
            maxHeight: "76vh",
            border: "1px solid #e6edf5",
            borderRadius: 16,
            background: "linear-gradient(180deg, #f9fbff 0%, #f4f8fd 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
            padding: 14,
          }}
        >
          <div
            style={{
              position: "relative",
              width: viewerSheet.width * zoom,
              height: viewerSheet.height * zoom,
              transformOrigin: "top left",
              background: "#ffffff",
              borderRadius: 10,
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
              overflow: "hidden",
            }}
          >
            {viewerSheet.cells.map((cell) => (
              <div
                key={cell.key}
                style={{
                  position: "absolute",
                  left: cell.left * zoom,
                  top: cell.top * zoom,
                  width: cell.width * zoom,
                  height: cell.height * zoom,
                  boxSizing: "border-box",
                  padding: `${Math.max(2, 4 * zoom)}px ${Math.max(2, 5 * zoom)}px`,
                  overflow: "hidden",
                  display: "flex",
                  lineHeight: 1.05,
                  letterSpacing: cell.width * zoom < 30 ? "-0.02em" : "normal",
                  ...cell.style,
                }}
              >
                <span
                  style={{
                    width: "100%",
                    overflow: "hidden",
                    textOverflow: "clip",
                    wordBreak: "break-word",
                  }}
                >
                  {cell.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
