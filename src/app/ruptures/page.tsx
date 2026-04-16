"use client";

import { useEffect, useMemo, useState } from "react";
import { ModuleHeader } from "@/components/layout/module-header";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import {
  extractRupturesImportSourceInfo,
  inspectRuptureDetailFile,
  parseRuptureDetailFile,
  parseRupturePerimetreFile,
} from "@/app/ruptures/lib/ruptures-parser";
import {
  formatLocalIsoDate,
  formatRuptureDateLabel,
  formatRuptureDateTime,
  getRupturePctTone,
  getRupturePeriodLabel,
  loadRupturesDashboard,
  loadRupturesEmployees,
  reassignRuptureDetail,
  saveParsedRupturesImport,
  type RuptureCollaboratorRow,
  type RuptureCollaboratorTimeline,
  type RuptureDetailRow,
  type RuptureHistoryRange,
  type RuptureHistoryRow,
  type RuptureEmployee,
  type RuptureImportRow,
  type RupturePeriod,
  type RuptureSectorAverageRow,
  type RuptureSectorAverageSummary,
  type RuptureTeamSnapshot,
  type RuptureTimelinePoint,
  type RupturesDashboardData,
} from "@/lib/ruptures-store";

type ViewMode = "equipe" | "collaborateurs" | "historique";
type ImportSlotStatus = "ok" | "pending" | "missing";

type DailyImportStatusGroup = {
  dateKey: string;
  label: string;
  morningImport: RuptureImportRow | null;
  finImport: RuptureImportRow | null;
  morningStatus: ImportSlotStatus;
  finStatus: ImportSlotStatus;
};

const baseCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e8ecf1",
  boxShadow: "none",
};

function pillButtonStyle(active: boolean): React.CSSProperties {
  return {
    minHeight: "36px",
    borderRadius: "999px",
    border: `1px solid ${active ? "#D40511" : "#dbe3eb"}`,
    background: active ? "#D40511" : "#fff",
    color: active ? "#fff" : "#475569",
    padding: "0 14px",
    fontSize: "12px",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function softPillStyle(active: boolean): React.CSSProperties {
  return {
    minHeight: "34px",
    borderRadius: "999px",
    border: `1px solid ${active ? "#fecdd3" : "#dbe3eb"}`,
    background: active ? "#fff1f2" : "#fff",
    color: active ? "#D40511" : "#475569",
    padding: "0 12px",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
  };
}

function progressTrackStyle(): React.CSSProperties {
  return {
    width: "100%",
    height: "8px",
    borderRadius: "999px",
    background: "#e5e7eb",
    overflow: "hidden",
  };
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card style={baseCardStyle}>
      <div style={{ fontSize: "13px", color: "#64748b" }}>{text}</div>
    </Card>
  );
}

function formatDecimalLabel(value: number) {
  return value.toFixed(1).replace(".", ",");
}

function RupturesTimelineChart({
  points,
  collaboratorTimelines,
}: {
  points: RuptureTimelinePoint[];
  collaboratorTimelines: RuptureCollaboratorTimeline[];
}) {
  if (!points.length) return null;

  const collaboratorPalette = ["#2563eb", "#7c3aed", "#0f766e", "#ea580c", "#be123c", "#4338ca"];
  const width = 920;
  const height = 260;
  const padding = { top: 20, right: 24, bottom: 42, left: 42 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const compactThreshold = 30;
  const allRates = [
    ...points.map((point) => point.delayRate),
    ...collaboratorTimelines.flatMap((timeline) => timeline.points.map((point) => point.delayRate ?? 0)),
    10,
    compactThreshold,
  ];
  const maxRate = Math.max(...allRates);
  const usesCompressedScale = maxRate > compactThreshold;
  const overflowBandHeight = usesCompressedScale ? innerHeight * 0.28 : 0;
  const mainBandHeight = innerHeight - overflowBandHeight;
  const stepX = points.length > 1 ? innerWidth / (points.length - 1) : 0;
  const toX = (index: number) => padding.left + stepX * index;
  const toY = (value: number) => {
    const safeValue = Math.max(0, value);
    if (!usesCompressedScale) {
      return padding.top + mainBandHeight - (Math.min(safeValue, compactThreshold) / compactThreshold) * mainBandHeight;
    }
    if (safeValue <= compactThreshold) {
      return padding.top + overflowBandHeight + mainBandHeight - (safeValue / compactThreshold) * mainBandHeight;
    }
    const upperRange = Math.max(maxRate - compactThreshold, 1);
    return padding.top + overflowBandHeight - ((Math.min(safeValue, maxRate) - compactThreshold) / upperRange) * overflowBandHeight;
  };
  const curvePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${toX(index).toFixed(2)} ${toY(point.delayRate).toFixed(2)}`)
    .join(" ");
  const targetY = toY(10);
  const latestPoint = points.at(-1) ?? null;
  const bestRate = Math.min(...points.map((point) => point.delayRate));
  const aboveTargetCount = points.filter((point) => point.delayRate > 10).length;

  return (
    <div
      style={{
        marginTop: "18px",
        borderRadius: "22px",
        border: "1px solid #e2e8f0",
        background: "linear-gradient(180deg, #ffffff 0%, #fff7f7 100%)",
        padding: "16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>Courbe d&apos;évolution des ruptures</div>
          <div style={{ marginTop: "4px", fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>
            Suivi du taux de ruptures restantes dans le temps. Objectif: rester sous 10%.
          </div>
          {usesCompressedScale ? (
            <div style={{ marginTop: "4px", fontSize: "11px", color: "#9a3412", fontWeight: 700 }}>
              Echelle compacte active: les valeurs au-dessus de 30% sont compressées pour garder le graphe lisible.
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "#475569" }}>
            <span style={{ width: "18px", height: "3px", borderRadius: "999px", background: "#D40511" }} />
            Taux reel
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "#475569" }}>
            <span style={{ width: "18px", height: "0", borderTop: "2px dashed #16a34a" }} />
            Objectif 10%
          </span>
          {collaboratorTimelines.map((timeline, index) => (
            <span key={timeline.employeeId} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "#475569" }}>
              <span style={{ width: "18px", height: "3px", borderRadius: "999px", background: collaboratorPalette[index % collaboratorPalette.length] }} />
              {timeline.employeeName}
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "16px", overflowX: "auto" }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", minWidth: "760px", height: "auto", display: "block" }} role="img" aria-label="Courbe du taux de ruptures dans le temps avec objectif de 10%">
          {[0, 10, 20, compactThreshold, ...(usesCompressedScale ? [maxRate] : [])].map((value, index, array) => {
            const deduped = array.indexOf(value) === index;
            if (!deduped) return null;
            const y = toY(value);
            return (
              <g key={value}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
                  {value}%
                </text>
              </g>
            );
          })}

          {usesCompressedScale ? (
            <line
              x1={padding.left}
              y1={toY(compactThreshold)}
              x2={width - padding.right}
              y2={toY(compactThreshold)}
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeDasharray="4 6"
            />
          ) : null}

          <line x1={padding.left} y1={targetY} x2={width - padding.right} y2={targetY} stroke="#16a34a" strokeWidth="2" strokeDasharray="6 6" />
          <text x={width - padding.right} y={targetY - 8} textAnchor="end" fontSize="11" fill="#15803d" fontWeight="700">
            Objectif 10%
          </text>

          <path d={curvePath} fill="none" stroke="#D40511" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

          {collaboratorTimelines.map((timeline, timelineIndex) => {
            const color = collaboratorPalette[timelineIndex % collaboratorPalette.length];
            const collaboratorPath = timeline.points.reduce((path, point, index) => {
              if (point.delayRate === null) return path;
              const command = path ? "L" : "M";
              return `${path}${path ? " " : ""}${command} ${toX(index).toFixed(2)} ${toY(point.delayRate).toFixed(2)}`;
            }, "");

            return collaboratorPath ? (
              <g key={timeline.employeeId}>
                <path d={collaboratorPath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.95" />
                {timeline.points.map((point, index) =>
                  point.delayRate === null ? null : (
                    <g key={`${timeline.employeeId}-${point.dateKey}`}>
                      <circle
                        cx={toX(index)}
                        cy={toY(point.delayRate)}
                        r="4"
                        fill={color}
                        stroke="#fff"
                        strokeWidth="1.5"
                      />
                      <text
                        x={toX(index)}
                        y={toY(point.delayRate) - 12 - (timelineIndex * 12)}
                        textAnchor="middle"
                        fontSize="10"
                        fill={color}
                        fontWeight="700"
                      >
                        {point.delayRate.toFixed(1).replace(".", ",")}%
                      </text>
                    </g>
                  ),
                )}
              </g>
            ) : null;
          })}

          {points.map((point, index) => {
            const x = toX(index);
            const y = toY(point.delayRate);
            const aboveTarget = point.delayRate > 10;
            const label = point.label.split(" ").slice(0, 2).join(" ");

            return (
              <g key={point.dateKey}>
                <circle cx={x} cy={y} r="5" fill={aboveTarget ? "#D40511" : "#16a34a"} stroke="#fff" strokeWidth="2" />
                <text x={x} y={height - 16} textAnchor="middle" fontSize="10" fill="#64748b">
                  {label}
                </text>
                <text x={x} y={y - 12} textAnchor="middle" fontSize="10" fill={aboveTarget ? "#991b1b" : "#166534"} fontWeight="700">
                  {point.delayRate.toFixed(1).replace(".", ",")}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px" }}>
        {[
          {
            label: "Derniere valeur",
            value: `${latestPoint ? latestPoint.delayRate.toFixed(2).replace(".", ",") : "0"}%`,
            color: (latestPoint?.delayRate ?? 0) <= 10 ? "#166534" : "#b91c1c",
          },
          {
            label: "Meilleure journee",
            value: `${bestRate.toFixed(2).replace(".", ",")}%`,
            color: "#166534",
          },
          {
            label: "Jours au-dessus de 10%",
            value: `${aboveTargetCount}/${points.length}`,
            color: "#D40511",
          },
        ].map((item) => (
          <div key={item.label} style={{ borderRadius: "16px", border: "1px solid #e2e8f0", background: "#fff", padding: "12px 14px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
            <div style={{ marginTop: "6px", fontSize: "20px", fontWeight: 800, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getImportStatusTone(status: ImportSlotStatus) {
  if (status === "ok") {
    return {
      background: "#f0fdf4",
      border: "#bbf7d0",
      color: "#166534",
      label: "OK",
    };
  }
  if (status === "pending") {
    return {
      background: "#fff7ed",
      border: "#fdba74",
      color: "#c2410c",
      label: "En attente",
    };
  }
  return {
    background: "#fef2f2",
    border: "#fecaca",
    color: "#b91c1c",
    label: "Manquant",
  };
}

function computeDailyImportStatusGroups(
  recentImports: RuptureImportRow[],
  selectedDate: string,
) {
  const grouped = new Map<string, { morningImport: RuptureImportRow | null; finImport: RuptureImportRow | null }>();
  const todayDate = formatLocalIsoDate(new Date());

  recentImports.forEach((item) => {
    const current = grouped.get(item.dateKey) ?? { morningImport: null, finImport: null };
    if (item.period === "matin") current.morningImport = item;
    if (item.period === "fin_matinee") current.finImport = item;
    grouped.set(item.dateKey, current);
  });

  if (!grouped.has(selectedDate)) {
    grouped.set(selectedDate, { morningImport: null, finImport: null });
  }
  if (!grouped.has(todayDate)) {
    grouped.set(todayDate, { morningImport: null, finImport: null });
  }

  return Array.from(grouped.entries())
    .sort((left, right) => right[0].localeCompare(left[0]))
    .map(([dateKey, value]) => {
      const isToday = dateKey === todayDate;
      const morningStatus: ImportSlotStatus =
        value.morningImport
          ? "ok"
          : value.finImport
            ? "missing"
            : isToday
              ? "pending"
              : "missing";
      const finStatus: ImportSlotStatus =
        value.finImport
          ? "ok"
          : isToday
            ? "pending"
            : "missing";

      return {
        dateKey,
        label: formatRuptureDateLabel(dateKey),
        morningImport: value.morningImport,
        finImport: value.finImport,
        morningStatus,
        finStatus,
      } satisfies DailyImportStatusGroup;
    });
}

function ImportStatusPill({
  label,
  status,
}: {
  label: string;
  status: ImportSlotStatus;
}) {
  const tone = getImportStatusTone(status);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "28px",
        borderRadius: "999px",
        border: `1px solid ${tone.border}`,
        background: tone.background,
        color: tone.color,
        padding: "0 10px",
        fontSize: "11px",
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {label} · {tone.label}
    </span>
  );
}

function ImportPanel({
  period,
  onPeriodChange,
  selectedDate,
  recentImportGroups,
  perimetreFileName,
  detailFileName,
  importing,
  error,
  onPickDate,
  onFileChange,
  onImport,
}: {
  period: RupturePeriod;
  onPeriodChange: (period: RupturePeriod) => void;
  selectedDate: string;
  recentImportGroups: DailyImportStatusGroup[];
  perimetreFileName: string;
  detailFileName: string;
  importing: boolean;
  error: string;
  onPickDate: (dateKey: string) => void;
  onFileChange: (slot: "perimetre" | "detail", file: File | null) => void;
  onImport: () => void;
}) {
  const periodLabel = getRupturePeriodLabel(period);
  const [historyOpen, setHistoryOpen] = useState(false);
  const selectedGroup = recentImportGroups.find((group) => group.dateKey === selectedDate) ?? recentImportGroups[0] ?? null;

  return (
    <Card style={{ ...baseCardStyle, borderColor: "#ffd5d8" }}>
      <Kicker moduleKey="ruptures" label="Import double" />
      <h2 style={{ marginTop: "4px", fontSize: "17px", color: "#0f172a" }}>Import des fichiers ruptures</h2>
      <p style={{ marginTop: "4px", fontSize: "12px", color: "#64748b", lineHeight: 1.55, maxWidth: 900 }}>
        Deux fichiers par période: le dashboard rupture par périmètre et la gestion des ruptures détaillée. La période sélectionnée est rappelée sur chaque zone pour éviter toute confusion.
      </p>

      <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "220px minmax(0, 1fr)", marginTop: "12px" }}>
        <div style={{ display: "grid", gap: "10px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Période
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(["matin", "fin_matinee"] as const).map((value) => (
              <button key={value} type="button" style={pillButtonStyle(period === value)} onClick={() => onPeriodChange(value)}>
                {getRupturePeriodLabel(value)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <label
            style={{
              borderRadius: "16px",
              border: "1px dashed #f3a7af",
              background: "#fff",
              padding: "12px 14px",
              display: "grid",
              gap: "7px",
              cursor: "pointer",
            }}
          >
            <span style={{ display: "inline-flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Dashboard rupture par périmètre
              </span>
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#D40511", background: "#fff1f2", borderRadius: "999px", padding: "4px 8px" }}>
                {periodLabel}
              </span>
            </span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
              {perimetreFileName || "Choisir le fichier 1"}
            </span>
            <span style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
              Fichier périmètre manager avec les colonnes D / E / X / Y et les colonnes collaborateur.
            </span>
            <input type="file" accept=".xlsx,.xls,.xlsb,.csv" style={{ display: "none" }} onChange={(event) => onFileChange("perimetre", event.target.files?.[0] ?? null)} />
          </label>

          <label
            style={{
              borderRadius: "16px",
              border: "1px dashed #f3a7af",
              background: "#fff",
              padding: "12px 14px",
              display: "grid",
              gap: "7px",
              cursor: "pointer",
            }}
          >
            <span style={{ display: "inline-flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Gestion des ruptures, liste des ruptures
              </span>
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#D40511", background: "#fff1f2", borderRadius: "999px", padding: "4px 8px" }}>
                {periodLabel}
              </span>
            </span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
              {detailFileName || "Choisir le fichier 2"}
            </span>
            <span style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
              Fichier détaillé produit par produit, utile pour les rayons partagés et la réaffectation manuelle.
            </span>
            <input type="file" accept=".xlsx,.xls,.xlsb,.csv" style={{ display: "none" }} onChange={(event) => onFileChange("detail", event.target.files?.[0] ?? null)} />
          </label>
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginTop: "12px",
            borderRadius: "14px",
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            padding: "12px 14px",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap", marginTop: "12px" }}>
        <div style={{ display: "grid", gap: "8px", minWidth: "min(100%, 560px)" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Historique des imports
          </div>
          {recentImportGroups.length ? (
            <div style={{ display: "grid", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setHistoryOpen((current) => !current)}
                style={{
                  minHeight: "44px",
                  borderRadius: "14px",
                  border: "1px solid #dbe3eb",
                  background: "#fff",
                  color: "#0f172a",
                  padding: "0 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedGroup ? selectedGroup.label : "Sélectionner une journée"}
                </span>
                <span style={{ fontSize: "11px", color: "#64748b" }}>{historyOpen ? "Refermer" : "Choisir une date"}</span>
              </button>

              {selectedGroup ? (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <ImportStatusPill label="Début de matinée" status={selectedGroup.morningStatus} />
                  <ImportStatusPill label="Fin de matinée" status={selectedGroup.finStatus} />
                </div>
              ) : null}

              {historyOpen ? (
                <div
                  style={{
                    display: "grid",
                    gap: "8px",
                    maxHeight: "240px",
                    overflowY: "auto",
                    borderRadius: "16px",
                    border: "1px solid #e5e7eb",
                    background: "#fffaf9",
                    padding: "10px",
                  }}
                >
                  {recentImportGroups.map((group) => {
                    const active = group.dateKey === selectedDate;
                    return (
                      <button
                        key={group.dateKey}
                        type="button"
                        onClick={() => {
                          onPickDate(group.dateKey);
                          setHistoryOpen(false);
                        }}
                        style={{
                          width: "100%",
                          borderRadius: "14px",
                          border: `1px solid ${active ? "#fecdd3" : "#ebe5df"}`,
                          background: active ? "#fff1f2" : "#fff",
                          padding: "10px 12px",
                          display: "grid",
                          gap: "8px",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <div style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a" }}>{group.label}</div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <ImportStatusPill label="Début de matinée" status={group.morningStatus} />
                          <ImportStatusPill label="Fin de matinée" status={group.finStatus} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Aucun import disponible pour l&apos;instant.</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onImport}
          disabled={importing}
          style={{
            minHeight: "42px",
            borderRadius: "999px",
            border: "1px solid #D40511",
            background: "#D40511",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 800,
            padding: "0 18px",
            cursor: importing ? "not-allowed" : "pointer",
            opacity: importing ? 0.7 : 1,
          }}
        >
          {importing ? "Import en cours..." : "Importer les fichiers"}
        </button>
      </div>
    </Card>
  );
}

function SnapshotBlock({
  title,
  snapshot,
  placeholder,
  extraLine,
}: {
  title: string;
  snapshot: RuptureTeamSnapshot;
  placeholder?: string;
  extraLine?: string | null;
}) {
  if (!snapshot.importRow) {
    return (
      <div
        style={{
          borderRadius: "18px",
          border: "1px solid #e5e7eb",
          background: "#f8fafc",
          padding: "16px",
          display: "grid",
          gap: "12px",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: 800, color: "#64748b" }}>{title}</div>
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>{placeholder ?? "Aucun import pour cette période."}</div>
      </div>
    );
  }

  const pctTone = getRupturePctTone(snapshot.pctTraitement);

  return (
    <div
      style={{
        borderRadius: "18px",
        border: "1px solid #e5e7eb",
        background: "#fff",
        padding: "16px",
        display: "grid",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>{title}</div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
            {formatRuptureDateTime(snapshot.importRow.importedAt)}
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: "999px",
            padding: "5px 10px",
            background: "#fff1f2",
            color: "#D40511",
            fontSize: "11px",
            fontWeight: 800,
          }}
        >
          {snapshot.rayonsCount} rayons
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}>
        {[
          {
            label: "Total ruptures",
            value: snapshot.totalRuptures,
            color: "#0f172a",
            sub: `${snapshot.rayonsCount} rayons concernés`,
          },
          {
            label: title.includes("Fin") ? "Ruptures collab restantes" : "Ruptures collab à traiter",
            value: snapshot.collab,
            color: title.includes("Fin") ? (snapshot.collab === 0 ? "#639922" : "#EF9F27") : "#D40511",
            sub: title.includes("Fin") ? "reste sous responsabilité collab" : "en attente d'action collaborateur",
          },
          {
            label: "% de traitement",
            value: snapshot.pctTraitement === null ? "—" : `${snapshot.pctTraitement}%`,
            color: pctTone,
            sub: "objectif 100%",
          },
        ].map((item) => (
          <div key={item.label} style={{ borderRadius: "14px", padding: "14px", background: "#f8fafc", border: "1px solid #eef2f7" }}>
            <div style={{ fontSize: "28px", lineHeight: 1, fontWeight: 800, color: item.color }}>{item.value}</div>
            <div style={{ marginTop: "8px", fontSize: "11px", fontWeight: 800, color: item.color }}>{item.label}</div>
            <div style={{ marginTop: "4px", fontSize: "11px", color: "#64748b", lineHeight: 1.4 }}>{item.sub}</div>
          </div>
        ))}
      </div>

      {extraLine ? (
        <div style={{ fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>{extraLine}</div>
      ) : null}
    </div>
  );
}

function TeamView({
  morning,
  fin,
}: {
  morning: RuptureTeamSnapshot;
  fin: RuptureTeamSnapshot;
}) {
  const treatedInMorning = morning.importRow && fin.importRow ? Math.max(morning.collab - fin.collab, 0) : null;

  return (
    <Card style={baseCardStyle}>
      <Kicker moduleKey="ruptures" label="Vue équipe" />
      <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>KPI du jour</h2>
      <p style={{ marginTop: "6px", fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>
        Comparaison du snapshot du matin et du snapshot de fin de matinée pour mesurer l&apos;évolution réelle des ruptures collab.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px", marginTop: "14px", alignItems: "start" }}>
        <SnapshotBlock title="Début de matinée" snapshot={morning} placeholder="En attente du premier import du jour." />
        <SnapshotBlock
          title="Fin de matinée"
          snapshot={fin}
          placeholder="Après 2e import."
          extraLine={treatedInMorning !== null ? `${treatedInMorning} traitées dans la matinée` : null}
        />
      </div>

      {treatedInMorning !== null ? (
        <div
          style={{
            marginTop: "12px",
            borderRadius: "14px",
            border: "1px solid #ffd5d8",
            background: "#fff7f8",
            padding: "12px 14px",
            fontSize: "12px",
            color: "#7f1d1d",
          }}
        >
          Delta collab du jour: <strong>{treatedInMorning}</strong> rupture(s) traitée(s) entre le matin et la fin de matinée.
        </div>
      ) : null}
    </Card>
  );
}

function CollaboratorView({
  collaboratorRows,
  hasSecondImport,
  detailRows,
  employees,
  detailEnabled,
  savingReassign,
  onReassign,
}: {
  collaboratorRows: RuptureCollaboratorRow[];
  hasSecondImport: boolean;
  detailRows: RuptureDetailRow[];
  employees: RuptureEmployee[];
  detailEnabled: boolean;
  savingReassign: boolean;
  onReassign: (ruptureId: string, employeeId: string | null) => void;
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const employeeNameById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee.name])), [employees]);
  const visibleDetailRows = useMemo(() => {
    if (selectedEmployeeId === "all") return detailRows;
    if (selectedEmployeeId === "__unassigned__") return detailRows.filter((row) => !row.employeeId);
    return detailRows.filter((row) => row.employeeId === selectedEmployeeId);
  }, [detailRows, selectedEmployeeId]);

  return (
    <div style={{ display: "grid", gap: "14px" }}>
    <Card style={baseCardStyle}>
      <Kicker moduleKey="ruptures" label="Vue collaborateurs" />
      <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Résultat journée</h2>
      <p style={{ marginTop: "6px", fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>
        Tri décroissant sur le pourcentage traité quand le second import existe. Les jours sans rupture collab restent en vert.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px", marginTop: "14px", alignItems: "start" }}>
        {collaboratorRows.length ? collaboratorRows.map((row) => {
          const currentOutstanding = hasSecondImport ? (row.finCollab ?? row.morningCollab) : row.morningCollab;
          const hasWork = currentOutstanding > 0 || row.hasActiveWork;
          const displayPct = hasSecondImport
            ? row.pct !== null
              ? row.pct
              : hasWork
                ? 0
                : 100
            : hasWork
              ? 0
              : 100;
          const pctValue = displayPct;
          const tone = getRupturePctTone(displayPct);
          const summary = hasSecondImport
            ? hasWork || row.morningCollab > 0
              ? `${row.morningCollab} -> ${row.finCollab ?? 0} restantes · traité : ${row.treated ?? 0}`
              : "0 rupture collab ce jour"
            : hasWork
              ? `${currentOutstanding} rupture${currentOutstanding > 1 ? "s" : ""} à traiter`
              : "0 rupture collab ce jour";
          const pctLabel = hasSecondImport ? `${displayPct}%` : hasWork ? `${currentOutstanding} à traiter` : "RAS";
          const statusLabel = hasSecondImport
            ? !hasWork
              ? "Tout traité"
              : row.pct === 100
              ? "Tout traité"
              : row.treated === 0
                ? `${row.finCollab ?? row.morningCollab} restante${(row.finCollab ?? row.morningCollab) > 1 ? "s" : ""} · 0 traitée`
                : `${row.finCollab ?? 0} restante${(row.finCollab ?? 0) > 1 ? "s" : ""} · ${row.treated ?? 0} traitée${(row.treated ?? 0) > 1 ? "s" : ""}`
            : hasWork
              ? "Contrôles à faire"
              : "Aucune rupture collab";
          const cardTone = tone === "#639922"
            ? {
                background: "linear-gradient(180deg, #fbfef6 0%, #f3f9e8 100%)",
                border: "#cfe4a8",
                badgeBg: "#eef7dc",
                badgeText: "#5e8e1f",
                meterBg: "#dbe8bf",
                subtle: "#64813b",
              }
            : tone === "#EF9F27"
              ? {
                  background: "linear-gradient(180deg, #fffaf1 0%, #fff3de 100%)",
                  border: "#f6d49c",
                  badgeBg: "#ffedd1",
                  badgeText: "#b86f00",
                  meterBg: "#f8dfb5",
                  subtle: "#9f6a14",
                }
              : {
                  background: "linear-gradient(180deg, #fff7f7 0%, #ffefef 100%)",
                  border: "#f6caca",
                  badgeBg: "#ffe2e4",
                  badgeText: "#cf2330",
                  meterBg: "#f5d0d4",
                  subtle: "#9f2e37",
                };

          return (
            <button
              type="button"
              key={row.employeeId}
              onClick={() => setSelectedEmployeeId(row.employeeId)}
              style={{
                width: "100%",
                textAlign: "left",
                borderRadius: "16px",
                border: `1px solid ${selectedEmployeeId === row.employeeId ? tone : cardTone.border}`,
                background: cardTone.background,
                padding: "12px 14px 12px",
                cursor: "pointer",
                boxShadow: selectedEmployeeId === row.employeeId ? `inset 0 0 0 1px ${tone}` : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#10203b", lineHeight: 1.2, letterSpacing: "0.01em", textTransform: "uppercase" }}>
                    {row.employeeName}
                  </div>
                  <div style={{ marginTop: "7px", fontSize: "12px", color: "#334155", fontWeight: 600, lineHeight: 1.35 }}>
                    {summary}
                  </div>
                  <div style={{ marginTop: "5px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "10px", color: cardTone.subtle, fontWeight: 700 }}>
                      Total jour: {row.totalLatest}
                    </span>
                    {hasWork ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: "999px",
                          padding: "4px 8px",
                          background: "rgba(255,255,255,0.72)",
                          border: `1px solid ${cardTone.border}`,
                          fontSize: "10px",
                          color: cardTone.badgeText,
                          fontWeight: 800,
                        }}
                      >
                        Contrôles à faire
                      </span>
                    ) : null}
                    {hasSecondImport ? (
                      <span style={{ fontSize: "10px", color: cardTone.subtle, fontWeight: 700 }}>
                        {statusLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: "98px" }}>
                  <div style={{ fontSize: "10px", color: "#7c8aa4", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {hasSecondImport ? "Traitement" : "Statut"}
                  </div>
                  <div
                    style={{
                      marginTop: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: hasSecondImport ? "74px" : "108px",
                      minHeight: "32px",
                      padding: "0 10px",
                      borderRadius: "999px",
                      background: cardTone.badgeBg,
                      color: cardTone.badgeText,
                      fontSize: hasSecondImport ? "20px" : "12px",
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {pctLabel}
                  </div>
                  {!hasSecondImport ? (
                    <div style={{ marginTop: "5px", fontSize: "10px", color: cardTone.subtle, fontWeight: 700 }}>
                      {statusLabel}
                    </div>
                  ) : null}
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <div style={{ ...progressTrackStyle(), height: "7px", background: cardTone.meterBg }}>
                  <div
                    style={{
                      width: `${Math.max(0, Math.min(100, pctValue))}%`,
                      height: "100%",
                      background: tone,
                      borderRadius: "999px",
                    }}
                  />
                </div>
              </div>
            </button>
          );
        }) : (
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>Aucun collaborateur suivi pour cette journée.</div>
        )}
      </div>

      {detailEnabled ? (
        <div style={{ marginTop: "18px", borderTop: "1px solid #eef2f7", paddingTop: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#D40511", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Détail produit
              </div>
              <div style={{ marginTop: "4px", fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                Réaffectation manuelle
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button type="button" style={softPillStyle(selectedEmployeeId === "all")} onClick={() => setSelectedEmployeeId("all")}>
                Tous
              </button>
              <button type="button" style={softPillStyle(selectedEmployeeId === "__unassigned__")} onClick={() => setSelectedEmployeeId("__unassigned__")}>
                Non affectés
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto", marginTop: "14px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "920px" }}>
              <thead>
                <tr>
                  {["Produit", "Statut", "Cause", "Matricule", "Affecté à", "Réaffecter"].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "10px 12px",
                        borderBottom: "1px solid #dbe3eb",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleDetailRows.length ? visibleDetailRows.slice(0, 150).map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: "13px", color: "#0f172a", fontWeight: 700 }}>
                      {row.libelleProduit}
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", color: "#475569" }}>
                      {row.statut || "—"}
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", color: "#475569" }}>
                      {row.cause || "—"}
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", color: "#475569" }}>
                      {row.matriculeSource || "—"}
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", color: "#475569" }}>
                      {row.employeeId ? employeeNameById.get(row.employeeId) ?? "Inconnu" : "Non affecté"}
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
                      <select
                        value={row.employeeId ?? ""}
                        onChange={(event) => onReassign(row.id, event.target.value || null)}
                        disabled={savingReassign}
                        style={{ minHeight: "34px", borderRadius: "10px", border: "1px solid #dbe3eb", background: "#fff", padding: "0 10px", fontSize: "12px", color: "#334155" }}
                      >
                        <option value="">Non affecté</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} style={{ padding: "16px 12px", fontSize: "12px", color: "#94a3b8" }}>
                      Aucun détail disponible pour cette sélection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </Card>
    </div>
  );
}

function HistoricalView({
  historyRange,
  onHistoryRangeChange,
  selectedDate,
  historyRows,
  timelinePoints,
  collaboratorTimelineRows,
  teamSectorRows,
  teamSectorSummary,
}: {
  historyRange: RuptureHistoryRange;
  onHistoryRangeChange: (range: RuptureHistoryRange) => void;
  selectedDate: string;
  historyRows: RuptureHistoryRow[];
  timelinePoints: RuptureTimelinePoint[];
  collaboratorTimelineRows: RuptureCollaboratorTimeline[];
  teamSectorRows: RuptureSectorAverageRow[];
  teamSectorSummary: RuptureSectorAverageSummary;
}) {
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<string[]>([]);

  const selectableCollaborators = useMemo(
    () =>
      historyRows
        .filter((row) => row.dayCount > 0)
        .map((row) => ({ employeeId: row.employeeId, employeeName: row.employeeName })),
    [historyRows],
  );

  const validSelectedCollaboratorIds = useMemo(
    () => selectedCollaboratorIds.filter((employeeId) => selectableCollaborators.some((row) => row.employeeId === employeeId)),
    [selectableCollaborators, selectedCollaboratorIds],
  );

  const selectedCollaboratorTimelines = useMemo(
    () =>
      collaboratorTimelineRows.filter((timeline) => validSelectedCollaboratorIds.includes(timeline.employeeId)),
    [collaboratorTimelineRows, validSelectedCollaboratorIds],
  );

  const getDelayTone = (value: number) => {
    if (value <= 10) {
      return {
        background: "#f0fdf4",
        border: "#bbf7d0",
        color: "#166534",
      };
    }
    if (value <= 20) {
      return {
        background: "#fff7ed",
        border: "#fed7aa",
        color: "#c2410c",
      };
    }
    return {
      background: "#fef2f2",
      border: "#fecaca",
      color: "#b91c1c",
    };
  };

  return (
    <Card style={baseCardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "end", flexWrap: "wrap" }}>
        <div>
          <Kicker moduleKey="ruptures" label="Stats historiques" />
          <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Moyenne par collaborateur</h2>
          <p style={{ marginTop: "6px", fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>
            Calculé uniquement sur les jours où le collaborateur avait des ruptures collab à traiter.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {(["week", "month", "quarter", "year"] as const).map((range) => (
            <button key={range} type="button" onClick={() => onHistoryRangeChange(range)} style={softPillStyle(historyRange === range)}>
              {range === "week" ? "Semaine" : range === "month" ? "Mois" : range === "quarter" ? "Trimestre" : "Année"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "10px" }}>
        Période de référence autour du {formatRuptureDateLabel(selectedDate)}.
      </div>

      <div style={{ marginTop: "12px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={() => setShowCollaborators((current) => !current)} style={softPillStyle(showCollaborators)}>
          {showCollaborators ? "Masquer collaborateurs" : "Afficher collaborateurs"}
        </button>
        {showCollaborators ? (
          <>
            <select
              defaultValue=""
              onChange={(event) => {
                const employeeId = event.target.value;
                if (!employeeId) return;
                setSelectedCollaboratorIds((current) => (current.includes(employeeId) ? current : [...current, employeeId]));
                event.target.value = "";
              }}
              style={{ minHeight: "34px", minWidth: "220px", borderRadius: "10px", border: "1px solid #dbe3eb", background: "#fff", padding: "0 10px", fontSize: "12px", color: "#334155" }}
            >
              <option value="">Ajouter un collaborateur a la courbe</option>
              {selectableCollaborators.map((row) => (
                <option key={row.employeeId} value={row.employeeId} disabled={validSelectedCollaboratorIds.includes(row.employeeId)}>
                  {row.employeeName}
                </option>
              ))}
            </select>
            {validSelectedCollaboratorIds.length ? validSelectedCollaboratorIds.map((employeeId) => {
              const collaborator = selectableCollaborators.find((row) => row.employeeId === employeeId);
              if (!collaborator) return null;
              return (
                <button
                  key={employeeId}
                  type="button"
                  onClick={() => setSelectedCollaboratorIds((current) => current.filter((item) => item !== employeeId))}
                  style={{
                    minHeight: "30px",
                    borderRadius: "999px",
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    color: "#334155",
                    padding: "0 10px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {collaborator.employeeName} x
                </button>
              );
            }) : (
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                Ajoute un ou plusieurs collaborateurs pour comparer leur courbe a la moyenne equipe.
              </div>
            )}
          </>
        ) : null}
      </div>

      <RupturesTimelineChart points={timelinePoints} collaboratorTimelines={showCollaborators ? selectedCollaboratorTimelines : []} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px", marginTop: "14px", alignItems: "start" }}>
        {historyRows.length ? historyRows.map((row) => {
          const tone = getRupturePctTone(row.averagePct);
          const cardTone = tone === "#639922"
            ? {
                background: "linear-gradient(180deg, #fbfef6 0%, #f3f9e8 100%)",
                border: "#cfe4a8",
                badgeBg: "#eef7dc",
                badgeText: "#5e8e1f",
                meterBg: "#dbe8bf",
                subtle: "#64813b",
              }
            : tone === "#EF9F27"
              ? {
                  background: "linear-gradient(180deg, #fffaf1 0%, #fff3de 100%)",
                  border: "#f6d49c",
                  badgeBg: "#ffedd1",
                  badgeText: "#b86f00",
                  meterBg: "#f8dfb5",
                  subtle: "#9f6a14",
                }
              : {
                  background: "linear-gradient(180deg, #fff7f7 0%, #ffefef 100%)",
                  border: "#f6caca",
                  badgeBg: "#ffe2e4",
                  badgeText: "#cf2330",
                  meterBg: "#f5d0d4",
                  subtle: "#9f2e37",
                };
          return (
            <div
              key={row.employeeId}
              style={{
                borderRadius: "16px",
                border: `1px solid ${cardTone.border}`,
                background: cardTone.background,
                padding: "12px 14px 12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "start", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#10203b", lineHeight: 1.2, letterSpacing: "0.01em", textTransform: "uppercase" }}>
                    {row.employeeName}
                  </div>
                  <div style={{ marginTop: "7px", fontSize: "12px", color: "#334155", fontWeight: 600 }}>
                    {row.dayCount} jour(s) avec ruptures collab sur la période
                  </div>
                  <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        borderRadius: "999px",
                        padding: "5px 9px",
                        background: "#ffffff",
                        border: "1px solid rgba(148,163,184,0.18)",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#1e293b",
                      }}
                    >
                      {row.totalAssigned} rupture(s) au total
                    </span>
                    <span
                      style={{
                        borderRadius: "999px",
                        padding: "5px 9px",
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#166534",
                      }}
                    >
                      {row.totalTreated} traitée(s)
                    </span>
                    <span
                      style={{
                        borderRadius: "999px",
                        padding: "5px 9px",
                        background: "#fff7ed",
                        border: "1px solid #fed7aa",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#9a3412",
                      }}
                    >
                      {row.totalUntreated} non traitée(s)
                    </span>
                  </div>
                  <div style={{ marginTop: "5px", fontSize: "10px", color: cardTone.subtle, fontWeight: 700 }}>
                    Moyenne calculée sur les journées actives seulement
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: "96px" }}>
                  <div style={{ fontSize: "10px", color: "#7c8aa4", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Moyenne
                  </div>
                  <div
                    style={{
                      marginTop: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "78px",
                      minHeight: "32px",
                      padding: "0 10px",
                      borderRadius: "999px",
                      background: cardTone.badgeBg,
                      color: cardTone.badgeText,
                      fontSize: "20px",
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {row.averagePct === null ? "—" : `${row.averagePct}%`}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <div style={{ ...progressTrackStyle(), height: "7px", background: cardTone.meterBg }}>
                  <div
                    style={{
                      width: `${Math.max(0, Math.min(100, row.averagePct === null ? 100 : row.averagePct))}%`,
                      height: "100%",
                      background: tone,
                      borderRadius: "999px",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        }) : (
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>Aucune statistique exploitable sur cette période.</div>
        )}
      </div>

      <div style={{ marginTop: "22px", borderTop: "1px solid #eef2f7", paddingTop: "18px" }}>
        {(() => {
          const summaryTone = getDelayTone(teamSectorSummary.delayRate);
          return (
            <>
        <div>
          <div style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a" }}>Vue équipe par secteur</div>
          <div style={{ marginTop: "6px", fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>
            Basé sur les imports de fin de matinée déjà injectés. On compare pour chaque secteur le volume moyen de ruptures et le volume moyen encore à traiter.
          </div>
        </div>

        <div
          style={{
            marginTop: "14px",
            borderRadius: "20px",
            border: `1px solid ${summaryTone.border}`,
            background: "linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%)",
            boxShadow: `0 0 0 1px ${summaryTone.border} inset, 0 0 0 3px ${summaryTone.background}, 0 12px 28px rgba(15,23,42,0.06), 0 0 22px ${summaryTone.border}`,
            padding: "16px",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "760px" }}>
            <thead>
              <tr>
                {["Secteur", "Moyenne ruptures", "Moyenne restantes", "% restant"].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid #dbe3eb",
                      textAlign: heading === "Secteur" ? "left" : "right",
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
              <tbody>
                {teamSectorRows.map((row) => {
                  const delayTone = getDelayTone(row.delayRate);
                  return (
                    <tr key={row.sectorCode}>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #eef2f7", fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                        {row.sectorLabel}
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #eef2f7", textAlign: "right", fontSize: "12px", color: "#0f172a" }}>
                        {formatDecimalLabel(row.avgTotalRuptures)}
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #eef2f7", textAlign: "right", fontSize: "12px", color: "#0f172a" }}>
                        {formatDecimalLabel(row.avgRemainingRuptures)}
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #eef2f7", textAlign: "right" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: "88px",
                            minHeight: "30px",
                            padding: "0 10px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: 800,
                            background: delayTone.background,
                            border: `1px solid ${delayTone.border}`,
                            color: delayTone.color,
                          }}
                        >
                          {row.delayRate.toFixed(2).replace(".", ",")}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td style={{ padding: "12px", borderTop: "2px solid #dbe3eb", fontSize: "12px", fontWeight: 800, color: "#2563eb" }}>
                    MOYENNE EQUIPE
                  </td>
                  <td style={{ padding: "12px", borderTop: "2px solid #dbe3eb", textAlign: "right", fontSize: "12px", fontWeight: 800, color: "#0f172a" }}>
                    {formatDecimalLabel(teamSectorSummary.avgTotalRuptures)}
                  </td>
                  <td style={{ padding: "12px", borderTop: "2px solid #dbe3eb", textAlign: "right", fontSize: "12px", fontWeight: 800, color: "#0f172a" }}>
                    {formatDecimalLabel(teamSectorSummary.avgRemainingRuptures)}
                  </td>
                  <td style={{ padding: "12px", borderTop: "2px solid #dbe3eb", textAlign: "right" }}>
                    {(() => {
                      const delayTone = getDelayTone(teamSectorSummary.delayRate);
                      return (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: "88px",
                            minHeight: "30px",
                            padding: "0 10px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: 800,
                            background: delayTone.background,
                            border: `1px solid ${delayTone.border}`,
                            color: delayTone.color,
                          }}
                        >
                          {teamSectorSummary.delayRate.toFixed(2).replace(".", ",")}%
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
            </>
          );
        })()}
      </div>
    </Card>
  );
}

export default function RupturesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("equipe");
  const [historyRange, setHistoryRange] = useState<RuptureHistoryRange>("week");
  const [period, setPeriod] = useState<RupturePeriod>("matin");
  const [selectedDate, setSelectedDate] = useState<string>(formatLocalIsoDate(new Date()));
  const [dashboardData, setDashboardData] = useState<RupturesDashboardData | null>(null);
  const [selectedPerimetreFile, setSelectedPerimetreFile] = useState<File | null>(null);
  const [selectedDetailFile, setSelectedDetailFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [savingReassign, setSavingReassign] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const dailyImportGroups = useMemo(
    () => computeDailyImportStatusGroups(dashboardData?.recentImports ?? [], selectedDate),
    [dashboardData?.recentImports, selectedDate],
  );
  const selectedDayImportGroup = useMemo(
    () => dailyImportGroups.find((group) => group.dateKey === selectedDate) ?? dailyImportGroups[0] ?? null,
    [dailyImportGroups, selectedDate],
  );

  const refreshDashboard = async (dateOverride?: string, rangeOverride?: RuptureHistoryRange) => {
    const data = await loadRupturesDashboard(dateOverride ?? selectedDate, rangeOverride ?? historyRange);
    setDashboardData(data);
    setSelectedDate(data.selectedDate);
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        const data = await loadRupturesDashboard(selectedDate, historyRange);
        if (cancelled) return;
        setDashboardData(data);
        setSelectedDate(data.selectedDate);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Impossible de charger le module ruptures.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [historyRange, selectedDate]);

  const selectedDateIndex = useMemo(
    () => dashboardData?.availableDates.findIndex((item) => item === selectedDate) ?? -1,
    [dashboardData?.availableDates, selectedDate],
  );

  const handlePickRelativeDate = async (direction: -1 | 1) => {
    if (!dashboardData || selectedDateIndex < 0) return;
    const nextDate = dashboardData.availableDates[selectedDateIndex + direction];
    if (!nextDate) return;
    setError("");
    setSuccess("");
    setSelectedDate(nextDate);
  };

  const handleImport = async () => {
    if (!selectedPerimetreFile || !selectedDetailFile) {
      setError("Choisis les deux fichiers de la période avant de lancer l'import.");
      setSuccess("");
      return;
    }

    try {
      setImporting(true);
      setError("");
      setSuccess("");

      const [employees, sourceInfo] = await Promise.all([
        loadRupturesEmployees(),
        extractRupturesImportSourceInfo(selectedPerimetreFile),
      ]);
      const [parsedRows, detailSummary, parsedDetailRows] = await Promise.all([
        parseRupturePerimetreFile(selectedPerimetreFile, employees),
        inspectRuptureDetailFile(selectedDetailFile),
        parseRuptureDetailFile(selectedDetailFile, employees),
      ]);
      const importId = await saveParsedRupturesImport({
        period,
        sourceImportedAt: sourceInfo.sourceImportedAt,
        fileName: selectedPerimetreFile.name,
        detailFileName: selectedDetailFile.name,
        detailRowCount: detailSummary.rowCount,
        rows: parsedRows,
        detailRows: parsedDetailRows,
      });

      const nextDate = formatLocalIsoDate(new Date(sourceInfo.sourceImportedAt));
      setSelectedPerimetreFile(null);
      setSelectedDetailFile(null);
      setSelectedDate(nextDate);
      await refreshDashboard(nextDate);
      setSuccess(`Import enregistré (${sourceInfo.sourceLabel}) · ${parsedRows.length} rayon(s) · ${detailSummary.rowCount} ligne(s) détail · id ${importId.slice(0, 8)}.`);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "L'import des ruptures a échoué.");
    } finally {
      setImporting(false);
    }
  };

  const handleChangeHistoryRange = async (range: RuptureHistoryRange) => {
    setHistoryRange(range);
    setError("");
  };

  const handleReassign = async (ruptureId: string, employeeId: string | null) => {
    try {
      setSavingReassign(true);
      setError("");
      await reassignRuptureDetail(ruptureId, employeeId);
      await refreshDashboard(selectedDate);
    } catch (reassignError) {
      setError(reassignError instanceof Error ? reassignError.message : "La réaffectation a échoué.");
    } finally {
      setSavingReassign(false);
    }
  };

  return (
    <section style={{ display: "grid", gap: "14px", marginTop: "20px" }}>
      <ModuleHeader
        compact
        moduleKey="ruptures"
        title="Suivi des ruptures"
        description="Import du fichier périmètre, lecture équipe, lecture collaborateurs et statistiques historiques sur le site manager."
      />

        <ImportPanel
          period={period}
          onPeriodChange={setPeriod}
          selectedDate={selectedDate}
          recentImportGroups={dailyImportGroups}
          perimetreFileName={selectedPerimetreFile?.name ?? ""}
          detailFileName={selectedDetailFile?.name ?? ""}
          importing={importing}
        error={error}
        onPickDate={(dateKey) => {
          setError("");
          setSuccess("");
          setSelectedDate(dateKey);
        }}
        onFileChange={(slot, file) => {
          setError("");
          setSuccess("");
          if (slot === "perimetre") setSelectedPerimetreFile(file);
          if (slot === "detail") setSelectedDetailFile(file);
        }}
        onImport={() => void handleImport()}
      />

      {success ? (
        <div style={{ borderRadius: "14px", border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534", padding: "12px 14px", fontSize: "12px" }}>
          {success}
        </div>
      ) : null}

      <Card style={baseCardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#D40511", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Journée suivie
            </div>
            <div style={{ marginTop: "4px", fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>{formatRuptureDateLabel(selectedDate)}</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
              <ImportStatusPill label="Début de matinée" status={selectedDayImportGroup?.morningStatus ?? "pending"} />
              <ImportStatusPill label="Fin de matinée" status={selectedDayImportGroup?.finStatus ?? "pending"} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => void handlePickRelativeDate(1)} style={softPillStyle(false)} disabled={!dashboardData?.availableDates[selectedDateIndex + 1]}>
              Jour précédent
            </button>
            <button type="button" onClick={() => void handlePickRelativeDate(-1)} style={softPillStyle(false)} disabled={!dashboardData?.availableDates[selectedDateIndex - 1]}>
              Jour suivant
            </button>
            {(["equipe", "collaborateurs", "historique"] as const).map((value) => (
              <button key={value} type="button" style={pillButtonStyle(viewMode === value)} onClick={() => setViewMode(value)}>
                {value === "equipe" ? "Vue équipe" : value === "collaborateurs" ? "Vue collaborateurs" : "Stats historiques"}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading || !dashboardData ? (
        <EmptyState text="Chargement du module ruptures..." />
      ) : viewMode === "equipe" ? (
        <TeamView morning={dashboardData.morning} fin={dashboardData.fin} />
      ) : viewMode === "collaborateurs" ? (
        <CollaboratorView
          collaboratorRows={dashboardData.collaboratorRows}
          hasSecondImport={Boolean(dashboardData.fin.importRow)}
          detailRows={dashboardData.detailRows}
          employees={dashboardData.employees.filter((employee) => employee.actif)}
          detailEnabled={dashboardData.detailEnabled}
          savingReassign={savingReassign}
          onReassign={(ruptureId, employeeId) => void handleReassign(ruptureId, employeeId)}
        />
      ) : (
        <HistoricalView
          historyRange={historyRange}
          onHistoryRangeChange={(range) => void handleChangeHistoryRange(range)}
          selectedDate={selectedDate}
          historyRows={dashboardData.historyRows}
          timelinePoints={dashboardData.timelinePoints}
          collaboratorTimelineRows={dashboardData.collaboratorTimelineRows}
          teamSectorRows={dashboardData.teamSectorRows}
          teamSectorSummary={dashboardData.teamSectorSummary}
        />
      )}
    </section>
  );
}
