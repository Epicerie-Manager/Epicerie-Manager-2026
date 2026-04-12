"use client";

import { Fragment } from "react";
import packageJson from "../../../package.json";
import PrintFooter from "@/components/exports/PrintFooter";
import PrintHeader from "@/components/exports/PrintHeader";
import {
  EXPORT_JOUR_SHORT,
  type ExportPlanningFormat,
  getCellStatus,
  getEmployeeBadges,
} from "@/components/exports/planning-print-utils";
import { type PlanningBinomes, type PlanningOverrides, type PlanningTriData, formatPlanningDate } from "@/lib/planning-store";
import { getPlanningPresenceCountsForDate } from "@/lib/planning-presence";
import { getPresenceCountLevel, type PresenceThresholds } from "@/lib/presence-thresholds";
import { type RhCycles, type RhEmployee } from "@/lib/rh-store";
import { shadows } from "@/lib/theme";

const LEGENDS = [
  { label: "Horaire", color: "#166534", bg: "#ffffff" },
  { label: "RH", color: "#92400e", bg: "#fffbeb" },
  { label: "DEP RH", color: "#4338ca", bg: "#eef2ff" },
  { label: "Férié/CP", color: "#991b1b", bg: "#fff7f7" },
  { label: "C.M", color: "#831843", bg: "#fdf2f8" },
  { label: "Dimanche", color: "#9ca3af", bg: "#f9fafb" },
];

type PlanningExportSheetProps = {
  format: ExportPlanningFormat;
  dates: Date[];
  periodHeader: string;
  sections: {
    id: string;
    label: string;
    bandBg: string;
    bandColor: string;
    nameBg: string;
    cellBg: string;
    employees: RhEmployee[];
  }[];
  employees: RhEmployee[];
  cycles: RhCycles;
  overrides: PlanningOverrides;
  triData: PlanningTriData;
  binomes: PlanningBinomes;
  presenceThresholds: PresenceThresholds;
  printedAt?: string;
  elevated?: boolean;
};

export default function PlanningExportSheet({
  format,
  dates,
  periodHeader,
  sections,
  employees,
  cycles,
  overrides,
  triData,
  binomes,
  presenceThresholds,
  printedAt,
  elevated = true,
}: PlanningExportSheetProps) {
  const todayIso = formatPlanningDate(new Date());
  const triRows = Object.entries(triData)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([dayIndex, pair]) => ({
      day: Number(dayIndex),
      pair,
    }))
    .filter((entry) => Array.isArray(entry.pair) && entry.pair.some((name) => String(name || "").trim()));
  const binomeRows = binomes
    .map((pair, index) => ({ index: index + 1, pair }))
    .filter((entry) => Array.isArray(entry.pair) && entry.pair.some((name) => String(name || "").trim()));
  const dayLabels = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const splitMid = <T,>(items: T[]) => {
    const middle = Math.ceil(items.length / 2);
    return [items.slice(0, middle), items.slice(middle)];
  };
  const [triLeft, triRight] = splitMid(triRows);
  const [binomeLeft, binomeRight] = splitMid(binomeRows);
  const presenceRows = dates.map((date, index) => {
    const counts = getPlanningPresenceCountsForDate(date, overrides, [], employees);
    const morningLevel = getPresenceCountLevel(
      counts.morningCount,
      presenceThresholds.warningMorning,
      presenceThresholds.criticalMorning,
    );
    const afternoonLevel = getPresenceCountLevel(
      counts.afternoonCount,
      presenceThresholds.warningAfternoon,
      presenceThresholds.criticalAfternoon,
    );
    return {
      iso: formatPlanningDate(date),
      index,
      date,
      counts,
      morningLevel,
      afternoonLevel,
    };
  });
  const levelStyle = (level: "ok" | "warning" | "critical") => {
    if (level === "critical") return { bg: "#fff1f2", border: "#fb7185", color: "#be123c" };
    if (level === "warning") return { bg: "#fff7ed", border: "#fb923c", color: "#c2410c" };
    return { bg: "#ecfdf3", border: "#4ade80", color: "#15803d" };
  };

  return (
    <div
      className="print-sheet"
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 24,
        boxShadow: elevated ? shadows.card : "none",
        padding: 14,
      }}
    >
      <PrintHeader
        title={format === "1m" ? "Planning mensuel" : "Planning 2 semaines"}
        dates={periodHeader}
        printedAt={printedAt}
      />

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th
                style={{
                  width: 124,
                  padding: "5px 7px",
                  textAlign: "left",
                  fontSize: 8,
                  fontWeight: 800,
                  color: "#111827",
                  background: "#f8fafc",
                  borderTop: "1px solid #dbe3eb",
                  borderRight: "1px solid #dbe3eb",
                  borderBottom: "1px solid #dbe3eb",
                  borderLeft: "3px solid #334155",
              }}
            >
              Employé
            </th>
            {dates.map((date, index) => {
              const iso = formatPlanningDate(date);
              const isToday = iso === todayIso;
              const isSplit = format === "2s" && index === 7;
              return (
                <th
                  key={iso}
                  style={{
                    padding: "4px 1px",
                    textAlign: "center",
                    fontSize: 7.5,
                    fontWeight: 800,
                    color: isToday ? "#d40511" : "#ffffff",
                    background: isToday ? "#ffffff" : "#d40511",
                    borderTop: "1px solid #b8040f",
                    borderRight: "1px solid #b8040f",
                    borderBottom: "1px solid #b8040f",
                    borderLeft: isSplit ? "3px solid #334155" : "1px solid #b8040f",
                  }}
                >
                  <div style={{ fontSize: 6.5, fontWeight: 800, color: isToday ? "#d40511" : "#ffffff" }}>
                    {EXPORT_JOUR_SHORT[date.getDay()]}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>{date.getDate()}</div>
                </th>
              );
            })}
            <th
              style={{
                width: 34,
                padding: "4px 3px",
                textAlign: "center",
                fontSize: 7.5,
                fontWeight: 800,
                color: "#111827",
                background: "#f8fafc",
                borderTop: "1px solid #dbe3eb",
                borderRight: "1px solid #dbe3eb",
                borderBottom: "1px solid #dbe3eb",
                borderLeft: "3px solid #334155",
              }}
            >
              Jrs
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              style={{
                padding: "4px 7px",
                background: "#f8fafc",
                borderTop: "1px solid #dbe3eb",
                borderRight: "1px solid #dbe3eb",
                borderBottom: "1px solid #dbe3eb",
                borderLeft: "3px solid #334155",
                fontSize: 7.5,
                fontWeight: 800,
                color: "#111827",
              }}
            >
              Effectif M / AM
            </td>
            {presenceRows.map((entry) => {
              const morningStyle = levelStyle(entry.morningLevel);
              const afternoonStyle = levelStyle(entry.afternoonLevel);
              const isSplit = format === "2s" && entry.index === 7;
              return (
                <td
                  key={`presence-${entry.iso}`}
                  style={{
                    padding: "2px 1px",
                    textAlign: "center",
                    background: "#ffffff",
                    borderTop: "1px solid #dbe3eb",
                    borderRight: "1px solid #dbe3eb",
                    borderBottom: "1px solid #dbe3eb",
                    borderLeft: isSplit ? "3px solid #334155" : "1px solid #dbe3eb",
                  }}
                >
                  <div style={{ fontSize: 8, fontWeight: 900, color: morningStyle.color, lineHeight: 1.05 }}>
                    {entry.counts.morningCount}
                  </div>
                  <div style={{ fontSize: 7, fontWeight: 800, color: afternoonStyle.color, lineHeight: 1.05, marginTop: 1 }}>
                    {entry.counts.afternoonCount}
                  </div>
                </td>
              );
            })}
            <td
              style={{
                padding: "2px 1px",
                textAlign: "center",
                background: "#ffffff",
                borderTop: "1px solid #dbe3eb",
                borderRight: "1px solid #dbe3eb",
                borderBottom: "1px solid #dbe3eb",
                borderLeft: "3px solid #334155",
              }}
            />
          </tr>
          {sections.map((section) => (
            <Fragment key={section.id}>
              <tr>
                <td
                  colSpan={dates.length + 1}
                  style={{
                    padding: "5px 8px",
                    background: section.bandBg,
                    color: section.bandColor,
                    borderTop: "1px solid #dbe3eb",
                    borderRight: "1px solid #dbe3eb",
                    borderBottom: "1px solid #dbe3eb",
                    borderLeft:
                      section.id === "morningCoordinators"
                        ? "4px solid #15803d"
                        : section.id === "morningTeam"
                          ? "4px solid #2563eb"
                          : section.id === "afternoonCoordinators"
                            ? "4px solid #ea580c"
                            : section.id === "afternoonTeam"
                              ? "4px solid #ca8a04"
                              : "4px solid #7c3aed",
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {section.label}
                </td>
              </tr>
              {section.employees.map((employee) => (
                <tr key={employee.n}>
                  <td
                    style={{
                      padding: "4px 7px",
                      background: section.nameBg,
                      borderTop: "1px solid #dbe3eb",
                      borderRight: "1px solid #dbe3eb",
                      borderBottom: "1px solid #dbe3eb",
                      borderLeft: "3px solid #334155",
                      fontSize: 7.5,
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                        <span>{employee.n}</span>
                      {getEmployeeBadges(employee).map((badge) => (
                        <span
                          key={`${employee.n}-${badge.label}`}
                          style={{
                            padding: "1px 5px",
                            borderRadius: 999,
                            background: badge.bg,
                            color: badge.color,
                            fontSize: 6.5,
                            fontWeight: 800,
                          }}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  {dates.map((date, index) => {
                    const iso = formatPlanningDate(date);
                    const cell = getCellStatus(employee, date, overrides, cycles);
                    const isSplit = format === "2s" && index === 7;
                    const value = format === "1m" ? cell.shortText : cell.text;
                    return (
                      <td
                        key={`${employee.n}-${iso}`}
                        style={{
                          padding: "1px",
                          borderTop: "1px solid #dbe3eb",
                          borderRight: "1px solid #dbe3eb",
                          borderBottom: "1px solid #dbe3eb",
                          borderLeft: isSplit ? "3px solid #334155" : "1px solid #dbe3eb",
                          background: "#ffffff",
                        }}
                      >
                        <div
                          style={{
                            minHeight: format === "1m" ? 16 : 20,
                            borderRadius: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: cell.style.bg,
                            color: cell.style.color,
                            border: `1px solid ${cell.style.borderColor}`,
                            borderLeft: cell.style.accentColor ? `3px solid ${cell.style.accentColor}` : "1px solid transparent",
                            fontSize: format === "1m" ? 6.8 : 7.5,
                            fontWeight: cell.status === "X" ? 400 : 700,
                            padding: "1px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                          }}
                        >
                          {value}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginTop: 10,
        }}
      >
        <div
          style={{
            border: "1px solid #dbe3eb",
            borderRadius: 16,
            background: "#ffffff",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "6px 9px",
              background: "#eff6ff",
              color: "#1d4ed8",
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Tri caddie
          </div>
          <div style={{ padding: 8 }}>
            {triRows.length ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid #dbe3eb", borderRadius: 12, overflow: "hidden" }}>
                {[triLeft, triRight].map((column, columnIndex) => (
                  <div
                    key={`tri-col-${columnIndex}`}
                    style={{
                      padding: "6px 8px",
                      borderLeft: columnIndex === 1 ? "1px solid #dbe3eb" : "none",
                      background: "#ffffff",
                      display: "grid",
                      gap: 5,
                    }}
                  >
                    {column.map((entry) => (
                      <div
                        key={`tri-${entry.day}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "64px 1fr",
                          gap: 6,
                          alignItems: "start",
                        }}
                      >
                        <div style={{ fontSize: 9, fontWeight: 800, color: "#334155", paddingTop: 2 }}>{dayLabels[entry.day] || `Jour ${entry.day}`}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#1d4ed8", lineHeight: 1.35 }}>
                          {entry.pair.filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 10, color: "#64748b" }}>Aucun tri caddie configure pour ce mois.</div>
            )}
          </div>
        </div>

        <div
          style={{
            border: "1px solid #dbe3eb",
            borderRadius: 16,
            background: "#ffffff",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "6px 9px",
              background: "#fff7ed",
              color: "#c2410c",
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Binômes repos
          </div>
          <div style={{ padding: 8 }}>
            {binomeRows.length ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid #dbe3eb", borderRadius: 12, overflow: "hidden" }}>
                {[binomeLeft, binomeRight].map((column, columnIndex) => (
                  <div
                    key={`binome-col-${columnIndex}`}
                    style={{
                      padding: "6px 8px",
                      borderLeft: columnIndex === 1 ? "1px solid #dbe3eb" : "none",
                      background: "#ffffff",
                      display: "grid",
                      gap: 5,
                    }}
                  >
                    {column.map((entry) => (
                      <div
                        key={`binome-${entry.index}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "34px 1fr",
                          gap: 6,
                          alignItems: "start",
                        }}
                      >
                        <div style={{ fontSize: 9, fontWeight: 800, color: "#334155", paddingTop: 2 }}>B{entry.index}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#c2410c", lineHeight: 1.35 }}>
                          {entry.pair.filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 10, color: "#64748b" }}>Aucun binôme configure pour ce mois.</div>
            )}
          </div>
        </div>
      </div>

      <PrintFooter version={packageJson.version} legends={LEGENDS} />
    </div>
  );
}
