"use client";

import { Fragment } from "react";
import packageJson from "../../../package.json";
import PrintFooter from "@/components/exports/PrintFooter";
import PrintHeader from "@/components/exports/PrintHeader";
import { getEmployeeBadges, groupEmployeesForExport } from "@/components/exports/planning-print-utils";
import {
  type CpEmployeeSummary,
  type CpManualPeriod,
  type CpWeekColumn,
  buildEmployeeCpSummaries,
  formatPeriodLabel,
  getOverlapRange,
} from "@/components/exports/cp-print-utils";
import { type AbsenceRequest } from "@/lib/absences-data";
import { type RhEmployee } from "@/lib/rh-store";
import { shadows } from "@/lib/theme";

const LEGENDS = [
  { label: "CP posé", color: "#d40511", bg: "#fff1f2" },
  { label: "Congé sans solde", color: "#f97316", bg: "#ffedd5" },
  { label: "Semaine libre", color: "#94a3b8", bg: "#ffffff" },
];

type CpExportSheetProps = {
  title: string;
  startIso: string;
  endIso: string;
  weeks: CpWeekColumn[];
  employees: RhEmployee[];
  requests: AbsenceRequest[];
  faridaPeriods?: CpManualPeriod[];
  periodHeader: string;
  printedAt?: string;
  elevated?: boolean;
};

function buildSectionRows(employees: RhEmployee[]) {
  return groupEmployeesForExport(employees.filter((employee) => employee.n)).map((section) => ({
    id: section.id,
    label:
      section.id === "morningTeam"
        ? "Collaborateurs matin"
        : section.id === "afternoonTeam"
          ? "Collaborateurs après-midi"
          : section.id === "morningCoordinators"
            ? "Coordo matin"
            : section.id === "afternoonCoordinators"
              ? "Coordo après-midi"
              : "Étudiants",
    bandBg: section.bandBg,
    bandColor: section.bandColor,
    accent:
      section.id === "morningCoordinators"
        ? "#15803d"
        : section.id === "morningTeam"
          ? "#2563eb"
          : section.id === "afternoonCoordinators"
            ? "#ea580c"
            : section.id === "afternoonTeam"
              ? "#ca8a04"
              : "#7c3aed",
    employees: section.employees,
  }));
}

function addIsoDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTypeVisual(type: AbsenceRequest["type"]) {
  if (type === "CONGE_SANS_SOLDE") {
    return {
      label: "Congé sans solde",
      shortLabel: "Sans solde",
      tinyLabel: "SS",
      background: "linear-gradient(90deg, #ffedd5 0%, #fed7aa 100%)",
      color: "#9a3412",
      border: "#f97316",
      marker: "#fdba74",
    };
  }

  return {
    label: "CP",
    shortLabel: "CP",
    tinyLabel: "CP",
    background: "linear-gradient(90deg, #fee2e2 0%, #fecdd3 100%)",
    color: "#991b1b",
    border: "#d40511",
    marker: "#fda4af",
  };
}

function buildEmployeeBars(requests: AbsenceRequest[], employeeName: string, startIso: string, endIso: string) {
  const source = requests
    .filter((request) => request.employee === employeeName)
    .map((request) => {
      const overlap = getOverlapRange(request.startDate, request.endDate, startIso, endIso);
      if (!overlap) return null;
      return {
        type: request.type,
        startIso: overlap.startIso,
        endIso: overlap.endIso,
      };
    })
    .filter((item): item is { type: AbsenceRequest["type"]; startIso: string; endIso: string } => item !== null)
    .sort((left, right) => left.startIso.localeCompare(right.startIso));

  const merged: Array<{ type: AbsenceRequest["type"]; startIso: string; endIso: string }> = [];
  source.forEach((period) => {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      previous.type === period.type &&
      addIsoDays(previous.endIso, 1) >= period.startIso
    ) {
      if (period.endIso > previous.endIso) previous.endIso = period.endIso;
      return;
    }
    merged.push({ ...period });
  });

  return merged;
}

export default function CpExportSheet({
  title,
  startIso,
  endIso,
  weeks,
  employees,
  requests,
  faridaPeriods = [],
  periodHeader,
  printedAt,
  elevated = true,
}: CpExportSheetProps) {
  const faridaSummary: CpEmployeeSummary | null = faridaPeriods.length
    ? {
        employee: "FARIDA",
        periods: faridaPeriods.map((period) => ({ ...period, type: "CP" as const })),
      }
    : null;
  const summaries = [
    ...(faridaSummary ? [faridaSummary] : []),
    ...buildEmployeeCpSummaries(requests, startIso, endIso),
  ];
  const sections = buildSectionRows(employees);

  function renderTimelineRow(employeeName: string, accentColor: string, sourceRequests: AbsenceRequest[], manualPeriods?: CpManualPeriod[]) {
    const employee = employees.find((item) => item.n === employeeName);
    const badges = employee ? getEmployeeBadges(employee) : [];
    const isCecile = employeeName === "CECILE";
    const bars =
      manualPeriods && manualPeriods.length
        ? manualPeriods.map((period) => ({ type: "CP" as const, startIso: period.startIso, endIso: period.endIso }))
        : buildEmployeeBars(sourceRequests, employeeName, startIso, endIso);

    return (
      <tr key={employeeName}>
        <td
          style={{
            padding: "5px 8px",
            background: "#f8fafc",
            color: "#111827",
            borderTop: "1px solid #dbe3eb",
            borderRight: "1px solid #dbe3eb",
            borderBottom: "1px solid #dbe3eb",
            borderLeft: `3px solid ${accentColor}`,
            fontSize: 8.5,
            fontWeight: 900,
            letterSpacing: "0.01em",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            <span
              style={
                isCecile
                  ? {
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: 18,
                      padding: "0 8px",
                      borderRadius: 999,
                      background: "#dbeafe",
                      border: "1px solid #93c5fd",
                      color: "#1d4ed8",
                      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.4)",
                    }
                  : undefined
              }
            >
              {employeeName}
            </span>
            {badges.map((badge) => (
              <span
                key={`${employeeName}-${badge.label}`}
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
        <td
          colSpan={weeks.length}
          style={{
            padding: 0,
            borderTop: "1px solid #dbe3eb",
            borderRight: "1px solid #dbe3eb",
            borderBottom: "1px solid #dbe3eb",
            borderLeft: "1px solid #dbe3eb",
            background: "#ffffff",
          }}
        >
          <div
            style={{
              position: "relative",
              height: 24,
              background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
              overflow: "hidden",
            }}
          >
            {weeks.slice(1).map((week) => (
              <div
                key={`${employeeName}-week-${week.key}`}
                style={{
                  position: "absolute",
                  top: 4,
                  bottom: 4,
                  left: `${(weeks.findIndex((item) => item.key === week.key) / weeks.length) * 100}%`,
                  width: 1,
                  background: "#e2e8f0",
                }}
              />
            ))}
            {bars.map((bar, index) => {
              const visual = getTypeVisual(bar.type);
              const startIndex = weeks.findIndex((week) => !(week.endIso < bar.startIso || week.startIso > bar.endIso));
              const endIndex = weeks.length - 1 - [...weeks].reverse().findIndex((week) => !(week.endIso < bar.startIso || week.startIso > bar.endIso));
              if (startIndex < 0 || endIndex < 0) return null;
              const left = (startIndex / weeks.length) * 100;
              const width = ((endIndex - startIndex + 1) / weeks.length) * 100;
              const textLabel =
                width >= 9 ? visual.label : width >= 4.2 ? visual.shortLabel : visual.tinyLabel;

              return (
                <div
                  key={`${employeeName}-${bar.type}-${bar.startIso}-${bar.endIso}-${index}`}
                  title={`${visual.label} · ${formatPeriodLabel(bar.startIso, bar.endIso)}`}
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    top: 2,
                    width: `${width}%`,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    background: visual.background,
                    color: visual.color,
                    border: `1px solid ${visual.border}`,
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35)",
                    fontSize: width >= 9 ? 8.3 : width >= 4.2 ? 7.6 : 7,
                    fontWeight: 800,
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    padding: "0 4px",
                  }}
                >
                  {textLabel}
                </div>
              );
            })}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div
      className="print-sheet"
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 24,
        boxShadow: elevated ? shadows.card : "none",
        padding: 12,
      }}
    >
      <PrintHeader title={title} dates={periodHeader} printedAt={printedAt} subtitle="Auchan — Planning CP" />

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th
              style={{
                width: 124,
                padding: "6px 8px",
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
              Collaborateur
            </th>
            {weeks.map((week) => (
              <th
                key={week.key}
                style={{
                  padding: "4px 2px",
                  textAlign: "center",
                  background: "#d40511",
                  color: "#ffffff",
                  border: "1px solid #b8040f",
                }}
              >
                <div style={{ fontSize: 7, fontWeight: 900 }}>S{String(week.weekNumber).padStart(2, "0")}</div>
                <div style={{ fontSize: 6.4, fontWeight: 700, marginTop: 1 }}>{week.rangeLabel}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {faridaPeriods.length ? (
            renderTimelineRow("FARIDA", "#ec4899", requests, faridaPeriods)
          ) : null}
          {sections.map((section) => (
            <Fragment key={`section-${section.id}`}>
              <tr>
                <td
                  colSpan={weeks.length + 1}
                  style={{
                    padding: "5px 8px",
                    background: section.bandBg,
                    color: section.bandColor,
                    borderTop: "1px solid #dbe3eb",
                    borderRight: "1px solid #dbe3eb",
                    borderBottom: "1px solid #dbe3eb",
                    borderLeft: `4px solid ${section.accent}`,
                    fontSize: 8,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {section.label}
                </td>
              </tr>
              {section.employees.map((employee) => renderTimelineRow(employee.n, section.accent, requests))}
            </Fragment>
          ))}
        </tbody>
      </table>

      <div
        style={{
          marginTop: 6,
          border: "1px solid #dbe3eb",
          borderTop: "2px solid #d40511",
          background: "#ffffff",
          breakInside: "avoid",
          pageBreakInside: "avoid",
        }}
      >
        <div
          style={{
            padding: "5px 8px",
            color: "#b91c1c",
            fontSize: 8.5,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Détail des congés posés par collaborateur
        </div>
        <div
          style={{
            padding: 6,
            display: "flex",
            flexWrap: "wrap",
            columnGap: 6,
            rowGap: 5,
            alignItems: "flex-start",
          }}
        >
          {summaries.length ? (
            summaries.map((summary) => (
              <div
                key={summary.employee}
                style={{
                  flex: "0 0 calc(20% - 5px)",
                  minWidth: 0,
                  border: "1px solid #dbe3eb",
                  borderLeft: "3px solid #16a34a",
                  borderRadius: 8,
                  background: "#f8fafc",
                  padding: "5px 6px",
                  display: "grid",
                  gap: 3,
                  breakInside: "avoid",
                  pageBreakInside: "avoid",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 900,
                      color: "#111827",
                      letterSpacing: "0.01em",
                      lineHeight: 1.1,
                    }}
                  >
                    {summary.employee}
                  </div>
                  <div
                    style={{
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: "#dcfce7",
                      color: "#166534",
                      fontSize: 7,
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {summary.periods.reduce((sum, period) => sum + period.days, 0)}j ouvrés
                  </div>
                </div>
                <div style={{ display: "grid", gap: 3 }}>
                  {summary.periods.map((period, index) => {
                    const visual = getTypeVisual(period.type);
                    return (
                      <div
                        key={`${summary.employee}-${period.startIso}-${period.endIso}-${index}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "8px 1fr auto",
                      gap: 4,
                      alignItems: "center",
                    }}
                  >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: visual.border,
                          }}
                        />
                        <div style={{ fontSize: 7.4, color: "#334155", lineHeight: 1.15, fontWeight: 600 }}>
                          {period.label}
                        </div>
                        <div style={{ fontSize: 7.1, color: "#475569", fontWeight: 800, whiteSpace: "nowrap" }}>
                          ({visual.shortLabel} · {period.days}j)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 8, color: "#64748b" }}>Aucun congé approuvé sur cette période.</div>
          )}
        </div>
      </div>

      <PrintFooter version={packageJson.version} legends={LEGENDS} />
    </div>
  );
}
