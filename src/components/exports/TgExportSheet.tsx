"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import packageJson from "../../../package.json";
import PrintFooter from "@/components/exports/PrintFooter";
import PrintHeader from "@/components/exports/PrintHeader";
import { getFamilyTone, type TgExportOverviewRow } from "@/components/exports/tg-print-utils";
import { moduleThemes, shadows } from "@/lib/theme";

const TG_COLUMNS = 5;
const TG_PAGE_HEIGHT_MM = 281;
const TG_SECTION_GAP_PX = 10;

type TgExportSheetProps = {
  weekLabel: string;
  periodHeader: string;
  saleRows: TgExportOverviewRow[];
  sucreRows: TgExportOverviewRow[];
  printedAt?: string;
  elevated?: boolean;
};

function mmToPx(mm: number) {
  return (mm * 96) / 25.4;
}

function groupRows(rows: TgExportOverviewRow[], columns = TG_COLUMNS) {
  const groups: TgExportOverviewRow[][] = [];
  for (let index = 0; index < rows.length; index += columns) {
    groups.push(rows.slice(index, index + columns));
  }
  return groups;
}

function SummaryCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid #dbe3eb",
        background: "#ffffff",
        padding: "6px 9px",
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", color: "#94a3b8", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ marginTop: 2, fontSize: 15, fontWeight: 800, color: tone, lineHeight: 1.05 }}>{value}</div>
    </div>
  );
}

function RayonCard({ row }: { row: TgExportOverviewRow }) {
  const tone = getFamilyTone(row.family);
  const hasGb = Boolean(row.gbProduct);
  const hasTg = Boolean(row.tgProduct || row.tgQuantity || row.tgMechanic);

  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${tone.sectionBorder}`,
        background: "#ffffff",
        overflow: "hidden",
        minHeight: 138,
        breakInside: "avoid",
        pageBreakInside: "avoid",
      }}
    >
      <div
        style={{
          padding: "6px 9px",
          background: tone.sectionBg,
          borderBottom: `1px solid ${tone.sectionBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>{row.rayon}</div>
        <span
          style={{
            padding: "3px 7px",
            borderRadius: 999,
            background: tone.chipBg,
            color: tone.chipColor,
            fontSize: 9,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          Rayon {row.orderNumber}
        </span>
      </div>

      <div style={{ padding: "6px 8px 8px", display: "grid", gap: 4 }}>
        <div
          style={{
            borderRadius: 10,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            padding: "4px 6px",
          }}
        >
          <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.06em", color: "#94a3b8", textTransform: "uppercase" }}>
            Responsable
          </div>
          <div
            style={{
              marginTop: 2,
              fontSize: 10.5,
              fontWeight: 800,
              color: row.tgResponsible ? moduleThemes.plantg.color : "#334155",
              lineHeight: 1.08,
            }}
          >
            {row.activeResponsible}
          </div>
          {row.tgResponsible && row.tgResponsible !== row.defaultResponsible ? (
            <div style={{ marginTop: 2, fontSize: 8.5, color: "#64748b" }}>Base : {row.defaultResponsible || "Non défini"}</div>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 5 }}>
          <div
            style={{
              borderRadius: 12,
              border: "1px solid #dbeafe",
              background: hasGb ? "#eff6ff" : "#f8fafc",
              padding: "5px 7px",
              minHeight: 31,
            }}
          >
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.06em", color: "#1d5fa0", textTransform: "uppercase" }}>
              Gondole basse
            </div>
            <div
              style={{
                marginTop: 3,
                fontSize: 9.5,
                fontWeight: hasGb ? 700 : 500,
                color: hasGb ? "#1d4ed8" : "#94a3b8",
                lineHeight: 1.1,
              }}
            >
              {hasGb ? row.gbProduct : "Aucune info GB"}
            </div>
          </div>

          <div
            style={{
              borderRadius: 12,
              border: "1px solid #fecaca",
              background: hasTg ? "#fff1f2" : "#f8fafc",
              padding: "5px 7px",
              minHeight: 36,
            }}
          >
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.06em", color: "#be123c", textTransform: "uppercase" }}>
              Tête de gondole
            </div>
            <div
              style={{
                marginTop: 3,
                fontSize: 9.5,
                fontWeight: row.tgProduct ? 700 : 500,
                color: row.tgProduct ? "#9f1239" : "#94a3b8",
                lineHeight: 1.1,
              }}
            >
              {row.tgProduct || "Aucune info TG"}
            </div>
            {row.tgQuantity || row.tgMechanic ? (
              <div style={{ marginTop: 3, fontSize: 8.5, color: "#be123c", lineHeight: 1.08 }}>
                {[row.tgQuantity, row.tgMechanic].filter(Boolean).join(" · ")}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function getSectionStats(rows: TgExportOverviewRow[]) {
  return {
    operationCount: rows.filter((row) => row.hasData).length,
    tgAssignedCount: rows.filter((row) => Boolean(row.tgResponsible)).length,
    responsibleCount: rows.filter((row) => row.activeResponsible && row.activeResponsible !== "Non défini").length,
  };
}

function SectionChrome({
  title,
  subtitle,
  rows,
  weekLabel,
  printedAt,
  pageIndex = 0,
  pageCount = 1,
}: {
  title: string;
  subtitle: string;
  rows: TgExportOverviewRow[];
  weekLabel: string;
  printedAt?: string;
  pageIndex?: number;
  pageCount?: number;
}) {
  const tone = getFamilyTone(title === "Salé" ? "Sale" : "Sucre");
  const stats = getSectionStats(rows);

  return (
    <>
      <PrintHeader title={`Plan TG / GB — ${title}${pageCount > 1 ? ` · page ${pageIndex + 1}/${pageCount}` : ""}`} dates={weekLabel} printedAt={printedAt} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 0.9fr 0.9fr", gap: 8, marginBottom: 8 }}>
        <SummaryCard label="Semaine imprimée" value={title} tone={tone.sectionColor} />
        <SummaryCard label="Rayons avec opération" value={stats.operationCount} tone="#9f1239" />
        <SummaryCard label="TG affectées" value={stats.tgAssignedCount} tone="#1d4ed8" />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: tone.sectionColor, textTransform: "uppercase" }}>
            {title}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
            {subtitle} · {stats.responsibleCount} responsable(s) renseigné(s)
          </div>
        </div>
        <span
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            background: tone.chipBg,
            color: tone.chipColor,
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          {rows.length} rayon(x)
        </span>
      </div>
    </>
  );
}

function FamilySection({
  title,
  subtitle,
  rows,
  weekLabel,
  printedAt,
  pageBreakBefore = false,
  pageIndex = 0,
  pageCount = 1,
}: {
  title: string;
  subtitle: string;
  rows: TgExportOverviewRow[];
  weekLabel: string;
  printedAt?: string;
  pageBreakBefore?: boolean;
  pageIndex?: number;
  pageCount?: number;
}) {
  const tone = getFamilyTone(title === "Salé" ? "Sale" : "Sucre");

  return (
    <section
      className={pageBreakBefore ? "tg-page-break" : undefined}
      style={{
        borderRadius: 20,
        border: `1px solid ${tone.sectionBorder}`,
        background: title === "Salé" ? "#f7fffa" : "#fffdf8",
        padding: 10,
      }}
    >
      <SectionChrome
        title={title}
        subtitle={subtitle}
        rows={rows}
        weekLabel={weekLabel}
        printedAt={printedAt}
        pageIndex={pageIndex}
        pageCount={pageCount}
      />

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${TG_COLUMNS}, minmax(0, 1fr))`, gap: 8 }}>
        {rows.map((row) => (
          <RayonCard key={`${row.weekId}-${row.rayon}`} row={row} />
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        <PrintFooter
          legends={[
            { label: title, color: tone.sectionColor, bg: tone.chipBg },
            { label: "GB", color: "#1d4ed8", bg: "#dbeafe" },
            { label: "TG", color: "#be123c", bg: "#ffe4e6" },
          ]}
          version={packageJson.version}
        />
      </div>
    </section>
  );
}

function paginateByMeasuredRows(
  rowGroups: TgExportOverviewRow[][],
  rowHeights: number[],
  chromeHeight: number,
  pageHeight: number,
) {
  const pages: TgExportOverviewRow[][] = [];
  let currentGroups: TgExportOverviewRow[][] = [];
  let currentHeight = chromeHeight;

  rowGroups.forEach((group, index) => {
    const rowHeight = rowHeights[index] ?? 0;
    const overflow = currentGroups.length > 0 && currentHeight + rowHeight > pageHeight;
    if (overflow) {
      pages.push(currentGroups.flat());
      currentGroups = [];
      currentHeight = chromeHeight;
    }
    currentGroups.push(group);
    currentHeight += rowHeight;
  });

  if (currentGroups.length) pages.push(currentGroups.flat());
  return pages;
}

export default function TgExportSheet({
  weekLabel,
  periodHeader,
  saleRows,
  sucreRows,
  printedAt,
  elevated = true,
}: TgExportSheetProps) {
  const sucreRowGroups = useMemo(() => groupRows(sucreRows), [sucreRows]);
  const saleRowGroups = useMemo(() => groupRows(saleRows), [saleRows]);

  const sucreChromeRef = useRef<HTMLDivElement | null>(null);
  const saleChromeRef = useRef<HTMLDivElement | null>(null);
  const sucreRowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const saleRowRefs = useRef<Array<HTMLDivElement | null>>([]);

  const [layout, setLayout] = useState<{
    sucrePages: TgExportOverviewRow[][];
    salePages: TgExportOverviewRow[][];
    canStackFamiliesOnOnePage: boolean;
  } | null>(null);

  useLayoutEffect(() => {
    const pageHeight = mmToPx(TG_PAGE_HEIGHT_MM);
    const sucreChromeHeight = sucreChromeRef.current?.getBoundingClientRect().height ?? 0;
    const saleChromeHeight = saleChromeRef.current?.getBoundingClientRect().height ?? 0;
    const sucreHeights = sucreRowRefs.current.map((node) => node?.getBoundingClientRect().height ?? 0);
    const saleHeights = saleRowRefs.current.map((node) => node?.getBoundingClientRect().height ?? 0);

    if (!sucreChromeHeight || !saleChromeHeight) return;

    const sucrePages = paginateByMeasuredRows(sucreRowGroups, sucreHeights, sucreChromeHeight, pageHeight);
    const salePages = paginateByMeasuredRows(saleRowGroups, saleHeights, saleChromeHeight, pageHeight);

    const sucreTotalHeight = sucreChromeHeight + sucreHeights.reduce((sum, value) => sum + value, 0);
    const saleTotalHeight = saleChromeHeight + saleHeights.reduce((sum, value) => sum + value, 0);
    const canStackFamiliesOnOnePage =
      sucrePages.length === 1 &&
      salePages.length === 1 &&
      sucreTotalHeight + saleTotalHeight + TG_SECTION_GAP_PX <= pageHeight;

    setLayout((current) => {
      const next = { sucrePages, salePages, canStackFamiliesOnOnePage };
      if (JSON.stringify(current) === JSON.stringify(next)) return current;
      return next;
    });
  }, [saleRowGroups, sucreRowGroups]);

  const fallbackSucrePages = useMemo(() => [sucreRows], [sucreRows]);
  const fallbackSalePages = useMemo(() => [saleRows], [saleRows]);

  const sucrePages = layout?.sucrePages?.length ? layout.sucrePages : fallbackSucrePages;
  const salePages = layout?.salePages?.length ? layout.salePages : fallbackSalePages;
  const canStackFamiliesOnOnePage = layout?.canStackFamiliesOnOnePage ?? false;

  const pages: Array<{
    key: string;
    title: string;
    rows: TgExportOverviewRow[];
    subtitle: string;
    pageIndex: number;
    pageCount: number;
  }> = [
    ...sucrePages.map((rows, index) => ({
      key: `sucre-${index}`,
      title: "Sucré",
      rows,
      subtitle: "Vue d’ensemble rayons et opérations",
      pageIndex: index,
      pageCount: sucrePages.length,
    })),
    ...salePages.map((rows, index) => ({
      key: `sale-${index}`,
      title: "Salé",
      rows,
      subtitle: "Vue d’ensemble rayons et opérations",
      pageIndex: index,
      pageCount: salePages.length,
    })),
  ];

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: -10000,
          top: 0,
          visibility: "hidden",
          pointerEvents: "none",
          width: "404mm",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div ref={sucreChromeRef}>
            <SectionChrome
              title="Sucré"
              subtitle="Vue d’ensemble rayons et opérations"
              rows={sucreRows}
              weekLabel={periodHeader}
              printedAt={printedAt}
            />
            <PrintFooter legends={[{ label: "Sucré", color: "#9a3412", bg: "#ffedd5" }, { label: "GB", color: "#1d4ed8", bg: "#dbeafe" }, { label: "TG", color: "#be123c", bg: "#ffe4e6" }]} version={packageJson.version} />
          </div>
          {sucreRowGroups.map((group, index) => (
            <div
              key={`measure-sucre-${index}`}
              ref={(node) => {
                sucreRowRefs.current[index] = node;
              }}
              style={{ display: "grid", gridTemplateColumns: `repeat(${TG_COLUMNS}, minmax(0, 1fr))`, gap: 8 }}
            >
              {group.map((row) => (
                <RayonCard key={`measure-sucre-card-${row.weekId}-${row.rayon}`} row={row} />
              ))}
            </div>
          ))}

          <div ref={saleChromeRef}>
            <SectionChrome
              title="Salé"
              subtitle="Vue d’ensemble rayons et opérations"
              rows={saleRows}
              weekLabel={weekLabel}
              printedAt={printedAt}
            />
            <PrintFooter legends={[{ label: "Salé", color: "#166534", bg: "#dcfce7" }, { label: "GB", color: "#1d4ed8", bg: "#dbeafe" }, { label: "TG", color: "#be123c", bg: "#ffe4e6" }]} version={packageJson.version} />
          </div>
          {saleRowGroups.map((group, index) => (
            <div
              key={`measure-sale-${index}`}
              ref={(node) => {
                saleRowRefs.current[index] = node;
              }}
              style={{ display: "grid", gridTemplateColumns: `repeat(${TG_COLUMNS}, minmax(0, 1fr))`, gap: 8 }}
            >
              {group.map((row) => (
                <RayonCard key={`measure-sale-card-${row.weekId}-${row.rayon}`} row={row} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div
        className="print-sheet"
        style={{
          background: "#ffffff",
          border: "2px solid #d1fae5",
          borderRadius: 24,
          boxShadow: elevated ? shadows.card : "none",
          padding: 14,
          backgroundImage: "linear-gradient(180deg,#ffffff 0%,#fbfefc 100%)",
        }}
      >
        <div style={{ display: "grid", gap: 10 }}>
          {pages.map((page, index) => (
            <FamilySection
              key={page.key}
              title={page.title}
              subtitle={page.subtitle}
              rows={page.rows}
              weekLabel={index === 0 ? periodHeader : weekLabel}
              printedAt={printedAt}
              pageBreakBefore={index > 0 && !(canStackFamiliesOnOnePage && index === 1)}
              pageIndex={page.pageIndex}
              pageCount={page.pageCount}
            />
          ))}
        </div>
      </div>
    </>
  );
}
