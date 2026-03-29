"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import { moduleThemes } from "@/lib/theme";
import {
  absenceTypes,
  type AbsenceRequest,
  type AbsenceStatusId,
  type AbsenceTypeId,
} from "@/lib/absences-data";
import {
  getPlanningUpdatedEventName,
  loadPlanningOverrides,
  planningEmployees,
  type PlanningOverrides,
} from "@/lib/planning-store";
import { getPlanningPresenceCountsForDate } from "@/lib/planning-presence";
import {
  formatPresenceThresholdSummary,
  getPresenceCountLevel,
  normalizePresenceThresholds,
  type PresenceThresholdLevel,
  type PresenceThresholds,
} from "@/lib/presence-thresholds";
import {
  getPresenceThresholdsUpdatedEventName,
  loadPresenceThresholds,
  savePresenceThresholdsToSupabase,
  syncPresenceThresholdsFromSupabase,
} from "@/lib/presence-thresholds-store";

type TimelineSuiviProps = {
  absences: AbsenceRequest[];
  employees: readonly string[];
};

type ViewMode = "mois" | "periode" | "resume";
type StatusFilter = "ALL" | AbsenceStatusId;
type PresenceDaySummary = {
  dayIso: string;
  morningCount: number;
  afternoonCount: number;
  absentCount: number;
  scheduledCount: number;
};

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const DAYS_SHORT = ["D", "L", "M", "M", "J", "V", "S"];

function toDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function fmtShort(value: string) {
  return toDate(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function diffDays(start: string, end: string) {
  return Math.round((toDate(end).getTime() - toDate(start).getTime()) / 86400000) + 1;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function overlap(start: string, end: string, rangeStart: string, rangeEnd: string) {
  return start <= rangeEnd && end >= rangeStart;
}

function getCurrentTimelineDefaults() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return {
    year,
    month,
    dateFrom: isoDate(year, month, 1),
    dateTo: isoDate(year, month, daysInMonth(year, month)),
  };
}

function typeColor(type: AbsenceTypeId) {
  if (type === "CP") return "#16a34a";
  if (type === "MAL") return "#dc2626";
  if (type === "CONGE_MAT") return "#ec4899";
  if (type === "FORM") return "#2563eb";
  if (type === "FERIE") return "#7c3aed";
  return "#eab308";
}

function typeLabel(type: AbsenceTypeId) {
  return absenceTypes.find((item) => item.id === type)?.label ?? type;
}

function pendingPattern(color: string) {
  return `repeating-linear-gradient(45deg, ${color}cc, ${color}cc 4px, ${color}66 4px, ${color}66 8px)`;
}

function getPresenceColor(level: PresenceThresholdLevel) {
  if (level === "critical") return "#ef4444";
  if (level === "warning") return "#f59e0b";
  return "#22c55e";
}

function getStrongestPresenceLevel(levels: PresenceThresholdLevel[]): PresenceThresholdLevel {
  if (levels.includes("critical")) return "critical";
  if (levels.includes("warning")) return "warning";
  return "ok";
}

function EffectifParJour({
  perDay,
  thresholds,
}: {
  perDay: PresenceDaySummary[];
  thresholds: PresenceThresholds;
}) {
  const peakCount = Math.max(
    ...perDay.flatMap((day) => [day.morningCount, day.afternoonCount]),
    1,
  );
  const rows = [
    {
      key: "morning",
      label: "Matin",
      warning: thresholds.warningMorning,
      critical: thresholds.criticalMorning,
      getCount: (day: PresenceDaySummary) => day.morningCount,
    },
    {
      key: "afternoon",
      label: "Après-midi",
      warning: thresholds.warningAfternoon,
      critical: thresholds.criticalAfternoon,
      getCount: (day: PresenceDaySummary) => day.afternoonCount,
    },
  ];
  const labelStep = perDay.length <= 14 ? 1 : perDay.length <= 21 ? 2 : 3;

  return (
    <div
      style={{
        marginBottom: "14px",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8" }}>
          EFFECTIF PRESENT PAR HORAIRES
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "10px", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: "#22c55e" }} />
            OK
          </span>
          <span style={{ fontSize: "10px", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: "#f59e0b" }} />
            Alerte
          </span>
          <span style={{ fontSize: "10px", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: "#ef4444" }} />
            Critique
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "92px 1fr",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <div style={{ display: "grid", gap: "2px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#475569" }}>Jours</span>
            <span style={{ fontSize: "10px", color: "#94a3b8" }}>Frise seuil</span>
          </div>
          <div style={{ display: "flex", gap: "2px", minHeight: "24px", alignItems: "stretch" }}>
            {perDay.map((day, index) => {
              const dayDate = toDate(day.dayIso);
              const morningLevel = getPresenceCountLevel(
                day.morningCount,
                thresholds.warningMorning,
                thresholds.criticalMorning,
              );
              const afternoonLevel = getPresenceCountLevel(
                day.afternoonCount,
                thresholds.warningAfternoon,
                thresholds.criticalAfternoon,
              );
              const level = getStrongestPresenceLevel([morningLevel, afternoonLevel]);
              const color = getPresenceColor(level);
              const showLabel = index % labelStep === 0 || index === perDay.length - 1;
              return (
                <div
                  key={`summary-${day.dayIso}`}
                  title={`${day.dayIso} · matin ${day.morningCount} · après-midi ${day.afternoonCount}`}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    borderRadius: "6px",
                    background: `linear-gradient(180deg, ${color}22, ${color}cc)`,
                    border: `1px solid ${color}55`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0f172a",
                    fontSize: "9px",
                    fontWeight: 700,
                    lineHeight: 1,
                    padding: "2px 0",
                  }}
                >
                  {showLabel ? dayDate.getDate() : ""}
                </div>
              );
            })}
          </div>
        </div>
        {rows.map((row) => (
          <div
            key={row.key}
            style={{
              display: "grid",
              gridTemplateColumns: "92px 1fr",
              gap: "10px",
              alignItems: "end",
            }}
          >
            <div style={{ display: "grid", gap: "2px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#475569" }}>{row.label}</span>
              <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                {`alerte < ${row.warning} · critique < ${row.critical}`}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", minHeight: "34px" }}>
              {perDay.map((day) => {
                const count = row.getCount(day);
                const level = getPresenceCountLevel(count, row.warning, row.critical);
                const color = getPresenceColor(level);
                const height = count === 0 ? 6 : Math.max((count / peakCount) * 100, 14);
                return (
                  <div
                    key={`${row.key}-${day.dayIso}`}
                    title={`${day.dayIso} · ${row.label}: ${count} · matin ${day.morningCount} · après-midi ${day.afternoonCount} · absents ${day.absentCount}`}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: `${height}%`,
                      borderRadius: "5px 5px 0 0",
                      background: `linear-gradient(180deg, ${color}66, ${color})`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TimelineSuivi({ absences, employees }: TimelineSuiviProps) {
  const theme = moduleThemes.absences;
  const timelineDefaults = getCurrentTimelineDefaults();
  const [planningOverrides, setPlanningOverrides] = useState<PlanningOverrides>({});
  const [view, setView] = useState<ViewMode>("mois");
  const [year, setYear] = useState(timelineDefaults.year);
  const [month, setMonth] = useState(timelineDefaults.month);
  const [dateFrom, setDateFrom] = useState(timelineDefaults.dateFrom);
  const [dateTo, setDateTo] = useState(timelineDefaults.dateTo);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("ALL");
  const [savedThresholds, setSavedThresholds] = useState<PresenceThresholds>(() => loadPresenceThresholds());
  const [thresholdDraft, setThresholdDraft] = useState<PresenceThresholds>(() => loadPresenceThresholds());
  const [thresholdSavePending, setThresholdSavePending] = useState(false);
  const [thresholdMessage, setThresholdMessage] = useState("");
  const [thresholdError, setThresholdError] = useState("");

  const allEmployees = useMemo(
    () =>
      Array.from(new Set([...employees, ...absences.map((item) => item.employee)])).sort((a, b) =>
        a.localeCompare(b),
      ),
    [absences, employees],
  );

  useEffect(() => {
    const refreshPlanning = () => {
      setPlanningOverrides(loadPlanningOverrides());
    };
    refreshPlanning();
    const eventName = getPlanningUpdatedEventName();
    window.addEventListener(eventName, refreshPlanning);
    return () => window.removeEventListener(eventName, refreshPlanning);
  }, []);

  useEffect(() => {
    const refreshThresholds = () => {
      const nextThresholds = loadPresenceThresholds();
      setSavedThresholds(nextThresholds);
      setThresholdDraft(nextThresholds);
    };

    refreshThresholds();
    void syncPresenceThresholdsFromSupabase();
    const eventName = getPresenceThresholdsUpdatedEventName();
    window.addEventListener(eventName, refreshThresholds);
    return () => window.removeEventListener(eventName, refreshThresholds);
  }, []);

  const getPresenceForDay = useMemo(() => {
    return (dayIso: string, sourceAbsences: AbsenceRequest[]) =>
      getPlanningPresenceCountsForDate(toDate(dayIso), planningOverrides, sourceAbsences);
  }, [planningOverrides]);

  const filteredAbsences = useMemo(() => {
    return absences.filter((absence) =>
      filterStatus === "ALL" ? true : absence.status === filterStatus,
    );
  }, [absences, filterStatus]);

  const approved = absences.filter((item) => item.status === "APPROUVE");

  const legendTypeCounts = useMemo(() => {
    const counters: Record<AbsenceTypeId, number> = {
      CP: 0,
      MAL: 0,
      CONGE_MAT: 0,
      FORM: 0,
      FERIE: 0,
      AUTRE: 0,
    };
    filteredAbsences.forEach((absence) => {
      counters[absence.type] += 1;
    });
    return counters;
  }, [filteredAbsences]);

  const years = useMemo(() => {
    const list = absences.flatMap((item) => [
      toDate(item.startDate).getFullYear(),
      toDate(item.endDate).getFullYear(),
    ]);
    return Array.from(new Set([2026, ...list])).sort((a, b) => a - b);
  }, [absences]);

  const normalizedSavedThresholds = useMemo(() => {
    return normalizePresenceThresholds(savedThresholds);
  }, [savedThresholds]);

  const thresholds = useMemo(() => {
    return normalizePresenceThresholds(thresholdDraft);
  }, [thresholdDraft]);

  const thresholdInputsMax = Math.max(allEmployees.length, planningEmployees.length, 20);
  const hasThresholdChanges =
    thresholds.warningMorning !== normalizedSavedThresholds.warningMorning ||
    thresholds.criticalMorning !== normalizedSavedThresholds.criticalMorning ||
    thresholds.warningAfternoon !== normalizedSavedThresholds.warningAfternoon ||
    thresholds.criticalAfternoon !== normalizedSavedThresholds.criticalAfternoon;

  const saveThresholds = async () => {
    setThresholdSavePending(true);
    setThresholdError("");
    setThresholdMessage("");

    try {
      const nextThresholds = await savePresenceThresholdsToSupabase(thresholds);
      setSavedThresholds(nextThresholds);
      setThresholdDraft(nextThresholds);
      setThresholdMessage("Seuils enregistrés sur Supabase.");
    } catch (error) {
      setThresholdError(error instanceof Error ? error.message : "Impossible d'enregistrer les seuils.");
    } finally {
      setThresholdSavePending(false);
    }
  };

  const monthLabel = `${MONTHS[month]} ${year}`;
  const monthValue = `${year}-${String(month + 1).padStart(2, "0")}`;

  const goToPreviousMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((prev) => prev - 1);
      return;
    }
    setMonth((prev) => prev - 1);
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((prev) => prev + 1);
      return;
    }
    setMonth((prev) => prev + 1);
  };

  const onMonthPickerChange = (value: string) => {
    if (!value) return;
    const [yearValue, monthValueRaw] = value.split("-");
    const nextYear = Number(yearValue);
    const nextMonth = Number(monthValueRaw) - 1;
    if (Number.isNaN(nextYear) || Number.isNaN(nextMonth)) return;
    setYear(nextYear);
    setMonth(Math.max(0, Math.min(11, nextMonth)));
  };

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <Kicker moduleKey="absences" label="Gestion des absences" />
          <h2 style={{ marginTop: "6px", fontSize: "32px", color: "#0f172a", letterSpacing: "-0.04em" }}>
            Timeline & Suivi
          </h2>
        </div>
        <div style={{ display: "flex", gap: "6px", background: "#f8fafc", borderRadius: "10px", padding: "4px" }}>
          {([
            { value: "ALL", label: "Toutes" },
            { value: "APPROUVE", label: "Approuvees" },
            { value: "EN_ATTENTE", label: "En attente" },
          ] as const).map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilterStatus(item.value)}
              style={{
                borderRadius: "8px",
                border: "none",
                padding: "7px 14px",
                fontSize: "12px",
                fontWeight: filterStatus === item.value ? 700 : 500,
                background: filterStatus === item.value ? "#fff" : "transparent",
                color: filterStatus === item.value ? theme.color : "#94a3b8",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <Card style={{ marginTop: "12px", borderRadius: "16px", padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "6px", background: "#f8fafc", borderRadius: "10px", padding: "4px" }}>
            {([
              { value: "mois", label: "Vue mois" },
              { value: "periode", label: "Vue periode" },
              { value: "resume", label: "Vue resume" },
            ] as const).map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setView(tab.value)}
                style={{
                  borderRadius: "8px",
                  border: "none",
                  padding: "7px 14px",
                  fontSize: "12px",
                  fontWeight: view === tab.value ? 700 : 500,
                  background: view === tab.value ? "#fff" : "transparent",
                  color: view === tab.value ? theme.color : "#94a3b8",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {view === "resume" ? (
              <select value={year} onChange={(event) => setYear(Number(event.target.value))} style={{ minHeight: "34px", borderRadius: "8px", border: "1px solid #dbe3eb", padding: "0 10px" }}>
                {years.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            ) : null}
            {view === "mois" ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "1px solid #dbe3eb",
                  borderRadius: "10px",
                  padding: "4px",
                  background: "#fff",
                }}
              >
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  aria-label="Mois precedent"
                  style={{
                    minWidth: "30px",
                    height: "30px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#475569",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {"<"}
                </button>
                <div
                  style={{
                    minWidth: "138px",
                    textAlign: "center",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#334155",
                    padding: "0 2px",
                  }}
                >
                  {monthLabel}
                </div>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  aria-label="Mois suivant"
                  style={{
                    minWidth: "30px",
                    height: "30px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#475569",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {">"}
                </button>
                <input
                  type="month"
                  value={monthValue}
                  onChange={(event) => onMonthPickerChange(event.target.value)}
                  style={{
                    minHeight: "30px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    padding: "0 8px",
                    fontSize: "12px",
                    color: "#64748b",
                    background: "#f8fafc",
                  }}
                />
              </div>
            ) : null}
            {view === "periode" ? (
              <>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Du</span>
                <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} style={{ minHeight: "34px", borderRadius: "8px", border: "1px solid #dbe3eb", padding: "0 10px" }} />
                <span style={{ fontSize: "12px", color: "#64748b" }}>au</span>
                <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} style={{ minHeight: "34px", borderRadius: "8px", border: "1px solid #dbe3eb", padding: "0 10px" }} />
              </>
            ) : null}
            {(view === "mois" || view === "periode") ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(170px, auto))", gap: "10px" }}>
                  <div style={{ display: "grid", gap: "8px", padding: "10px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>Matin</span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Alerte</span>
                      <input
                        type="number"
                        min={0}
                        max={thresholdInputsMax}
                        value={thresholdDraft.warningMorning}
                        onChange={(event) => {
                          setThresholdDraft((current) => ({
                            ...current,
                            warningMorning: Number(event.target.value),
                          }));
                          setThresholdMessage("");
                          setThresholdError("");
                        }}
                        style={{ width: "74px", minHeight: "34px", borderRadius: "8px", border: "1px solid #dbe3eb", padding: "0 10px", textAlign: "center" }}
                      />
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Critique</span>
                      <input
                        type="number"
                        min={0}
                        max={thresholdInputsMax}
                        value={thresholdDraft.criticalMorning}
                        onChange={(event) => {
                          setThresholdDraft((current) => ({
                            ...current,
                            criticalMorning: Number(event.target.value),
                          }));
                          setThresholdMessage("");
                          setThresholdError("");
                        }}
                        style={{ width: "74px", minHeight: "34px", borderRadius: "8px", border: "1px solid #dbe3eb", padding: "0 10px", textAlign: "center" }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: "8px", padding: "10px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>Après-midi</span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Alerte</span>
                      <input
                        type="number"
                        min={0}
                        max={thresholdInputsMax}
                        value={thresholdDraft.warningAfternoon}
                        onChange={(event) => {
                          setThresholdDraft((current) => ({
                            ...current,
                            warningAfternoon: Number(event.target.value),
                          }));
                          setThresholdMessage("");
                          setThresholdError("");
                        }}
                        style={{ width: "74px", minHeight: "34px", borderRadius: "8px", border: "1px solid #dbe3eb", padding: "0 10px", textAlign: "center" }}
                      />
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Critique</span>
                      <input
                        type="number"
                        min={0}
                        max={thresholdInputsMax}
                        value={thresholdDraft.criticalAfternoon}
                        onChange={(event) => {
                          setThresholdDraft((current) => ({
                            ...current,
                            criticalAfternoon: Number(event.target.value),
                          }));
                          setThresholdMessage("");
                          setThresholdError("");
                        }}
                        style={{ width: "74px", minHeight: "34px", borderRadius: "8px", border: "1px solid #dbe3eb", padding: "0 10px", textAlign: "center" }}
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={saveThresholds}
                  disabled={thresholdSavePending || !hasThresholdChanges}
                  style={{
                    minHeight: "34px",
                    borderRadius: "8px",
                    border: "1px solid #dbe3eb",
                    padding: "0 12px",
                    background: thresholdSavePending || !hasThresholdChanges ? "#f8fafc" : "#fff",
                    color: thresholdSavePending || !hasThresholdChanges ? "#94a3b8" : theme.color,
                    fontWeight: 700,
                    cursor: thresholdSavePending || !hasThresholdChanges ? "default" : "pointer",
                  }}
                >
                  {thresholdSavePending ? "Enregistrement..." : "Enregistrer les seuils"}
                </button>
              </>
            ) : null}
          </div>
        </div>

        {(view === "mois" || view === "periode") ? (
          <div style={{ marginTop: "10px", display: "grid", gap: "4px" }}>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              Seuils partagés Dashboard / Planning · {formatPresenceThresholdSummary(thresholds)}
            </div>
            {thresholdMessage ? (
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#0f766e" }}>{thresholdMessage}</div>
            ) : null}
            {thresholdError ? (
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#b91c1c" }}>{thresholdError}</div>
            ) : null}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "10px" }}>
          {absenceTypes.map((type) => (
            <div key={type.id} style={{ display: "inline-flex", gap: "5px", alignItems: "center", fontSize: "11px", color: "#64748b" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "3px", background: typeColor(type.id), opacity: 0.85 }} />
              {type.label} ({legendTypeCounts[type.id]})
            </div>
          ))}
        </div>

        <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, #dbe3eb, transparent)", margin: "10px 0" }} />

        {view === "mois" ? (
          <VueMois
            year={year}
            month={month}
            absences={filteredAbsences}
            approvedAbsences={approved}
            employees={allEmployees}
            getPresenceForDay={getPresenceForDay}
            thresholds={thresholds}
          />
        ) : null}
        {view === "periode" ? (
          <VuePeriode
            dateFrom={dateFrom}
            dateTo={dateTo}
            absences={filteredAbsences}
            approvedAbsences={approved}
            employees={allEmployees}
            getPresenceForDay={getPresenceForDay}
            thresholds={thresholds}
          />
        ) : null}
        {view === "resume" ? (
          <VueResume year={year} absences={filteredAbsences} employees={allEmployees} />
        ) : null}
      </Card>
    </Card>
  );
}

function VueMois({
  year,
  month,
  absences,
  approvedAbsences,
  employees,
  getPresenceForDay,
  thresholds,
}: {
  year: number;
  month: number;
  absences: AbsenceRequest[];
  approvedAbsences: AbsenceRequest[];
  employees: string[];
  getPresenceForDay: (dayIso: string, sourceAbsences: AbsenceRequest[]) => ReturnType<typeof getPlanningPresenceCountsForDate>;
  thresholds: PresenceThresholds;
}) {
  const days = daysInMonth(year, month);
  const dayList = Array.from({ length: days }, (_, index) => index + 1);
  const monthStart = isoDate(year, month, 1);
  const monthEnd = isoDate(year, month, days);
  const today = new Date();
  const todayIso = isoDate(today.getFullYear(), today.getMonth(), today.getDate());

  const relevant = absences.filter((absence) => overlap(absence.startDate, absence.endDate, monthStart, monthEnd));
  const relevantApproved = approvedAbsences.filter((absence) =>
    overlap(absence.startDate, absence.endDate, monthStart, monthEnd),
  );

  const perDay = Array.from({ length: days }, (_, index) => {
    const currentDay = index + 1;
    const currentIso = isoDate(year, month, currentDay);
    const { morningCount, afternoonCount, absentCount, scheduledCount } = getPresenceForDay(currentIso, relevantApproved);
    return {
      dayIso: currentIso,
      morningCount,
      afternoonCount,
      absentCount,
      scheduledCount,
    };
  });

  const getCell = (employee: string, day: number) => {
    const currentIso = isoDate(year, month, day);
    return relevant.filter(
      (absence) =>
        (absence.employee === employee || absence.employee === "TOUS") &&
        absence.startDate <= currentIso &&
        absence.endDate >= currentIso,
    );
  };

  return (
    <div>
      <EffectifParJour
        perDay={perDay}
        thresholds={thresholds}
      />
      <div style={{ overflowX: "auto", maxHeight: "440px", overflowY: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "980px" }}>
        <thead>
          <tr>
            <th style={{ position: "sticky", top: 0, left: 0, zIndex: 5, background: "#fff", padding: "8px 10px", borderBottom: "2px solid #dbe3eb", textAlign: "left", fontSize: "11px", color: "#94a3b8" }}>Employe</th>
            {dayList.map((day) => {
              const dow = new Date(year, month, day).getDay();
              const isWeekend = dow === 0 || dow === 6;
              const iso = isoDate(year, month, day);
              return (
                <th
                  key={day}
                  style={{
                    position: "sticky",
                    top: 0,
                    minWidth: "28px",
                    textAlign: "center",
                    borderBottom: "2px solid #dbe3eb",
                    color: iso === todayIso ? "#5635b8" : isWeekend ? "#8b5cf6" : "#94a3b8",
                    background: iso === todayIso ? "#f5f2fe" : "#fff",
                    fontSize: "10px",
                    padding: "4px 0",
                    zIndex: 4,
                  }}
                >
                  <div style={{ fontSize: "8px" }}>{DAYS_SHORT[dow]}</div>
                  {day}
                </th>
              );
            })}
            <th style={{ position: "sticky", top: 0, right: 0, zIndex: 5, background: "#fff", padding: "8px 6px", borderBottom: "2px solid #dbe3eb", textAlign: "center", fontSize: "11px", color: "#5635b8" }}>Jours</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee}>
              <td style={{ position: "sticky", left: 0, zIndex: 2, background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "5px 10px", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" }}>{employee}</td>
              {dayList.map((day) => {
                const matches = getCell(employee, day);
                if (matches.length) {
                  const absence = matches[0];
                  const color = typeColor(absence.type);
                  const pending = absence.status === "EN_ATTENTE";
                  return (
                    <td key={day} title={`${employee}: ${typeLabel(absence.type)} ${fmtShort(absence.startDate)} → ${fmtShort(absence.endDate)}`} style={{ padding: 0, borderBottom: "1px solid #e2e8f0", background: pending ? pendingPattern(color) : `${color}22` }}>
                      <div style={{ width: "100%", height: "24px" }} />
                    </td>
                  );
                }
                return (
                  <td key={day} style={{ padding: 0, borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ width: "100%", height: "24px" }} />
                  </td>
                );
              })}
              <td style={{ position: "sticky", right: 0, zIndex: 2, background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "5px 6px", textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#5635b8" }}>
                {relevant
                  .filter((absence) => absence.employee === employee)
                  .reduce((sum, absence) => {
                    const start = Math.max(toDate(absence.startDate).getTime(), toDate(monthStart).getTime());
                    const end = Math.min(toDate(absence.endDate).getTime(), toDate(monthEnd).getTime());
                    return end >= start ? sum + Math.round((end - start) / 86400000) + 1 : sum;
                  }, 0) || ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function VuePeriode({
  dateFrom,
  dateTo,
  absences,
  approvedAbsences,
  employees,
  getPresenceForDay,
  thresholds,
}: {
  dateFrom: string;
  dateTo: string;
  absences: AbsenceRequest[];
  approvedAbsences: AbsenceRequest[];
  employees: string[];
  getPresenceForDay: (dayIso: string, sourceAbsences: AbsenceRequest[]) => ReturnType<typeof getPlanningPresenceCountsForDate>;
  thresholds: PresenceThresholds;
}) {
  const from = toDate(dateFrom);
  const to = toDate(dateTo);
  const totalDays = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  if (totalDays <= 0) return <p style={{ padding: "14px", color: "#94a3b8" }}>Periode invalide.</p>;

  const filtered = absences.filter((absence) => overlap(absence.startDate, absence.endDate, dateFrom, dateTo));
  const filteredApproved = approvedAbsences.filter((absence) =>
    overlap(absence.startDate, absence.endDate, dateFrom, dateTo),
  );

  const shortRange = totalDays <= 21;
  const mediumRange = totalDays > 21 && totalDays <= 62;
  const dayLabelStep = totalDays <= 14 ? 1 : totalDays <= 31 ? 2 : 3;

  const monthTicks: Array<{ label: string; offset: number }> = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    const startMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = Math.max(0, Math.round((startMonth.getTime() - from.getTime()) / 86400000));
    const fullLabel = `${MONTHS[cursor.getMonth()]}${cursor.getFullYear() !== from.getFullYear() || cursor.getFullYear() !== to.getFullYear() ? ` ${cursor.getFullYear()}` : ""}`;
    monthTicks.push({ label: fullLabel, offset });
    cursor.setMonth(cursor.getMonth() + 1);
    cursor.setDate(1);
  }

  const dayTicks = Array.from({ length: totalDays }, (_, index) => {
    const day = new Date(from.getTime() + index * 86400000);
    const dayOfMonth = day.getDate();
    const dow = day.getDay();
    const label = `${DAYS_SHORT[dow]} ${dayOfMonth}`;
    const showLabel = index % dayLabelStep === 0 || index === totalDays - 1;
    return {
      key: isoDate(day.getFullYear(), day.getMonth(), dayOfMonth),
      label,
      offset: index,
      showLabel,
    };
  });

  const weekTicks = dayTicks
    .map((tick) => {
      const day = toDate(tick.key);
      return {
        ...tick,
        day,
      };
    })
    .filter((tick) => tick.day.getDay() === 1)
    .map((tick) => ({
      ...tick,
      label: `${tick.day.getDate()}`,
    }));

  const perDay = Array.from({ length: totalDays }, (_, index) => {
    const day = new Date(from.getTime() + index * 86400000);
    const dayIso = isoDate(day.getFullYear(), day.getMonth(), day.getDate());
    const { morningCount, afternoonCount, absentCount, scheduledCount } = getPresenceForDay(dayIso, filteredApproved);
    return { dayIso, morningCount, afternoonCount, absentCount, scheduledCount };
  });

  return (
    <div>
      <EffectifParJour
        perDay={perDay}
        thresholds={thresholds}
      />

      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 3,
            background: "#fff",
            borderBottom: "1px solid #e2e8f0",
            marginBottom: "8px",
            paddingBottom: "6px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: "8px", alignItems: "end" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
              Echelle
            </div>
            <div style={{ position: "relative", minHeight: shortRange ? "28px" : "42px" }}>
              {shortRange ? (
                dayTicks.map((tick) => (
                  <div
                    key={tick.key}
                    style={{
                      position: "absolute",
                      left: `${(tick.offset / Math.max(totalDays - 1, 1)) * 100}%`,
                      transform: "translateX(-50%)",
                      fontSize: "10px",
                      color: tick.showLabel ? "#64748b" : "transparent",
                      whiteSpace: "nowrap",
                      fontWeight: tick.showLabel ? 600 : 400,
                    }}
                  >
                    {tick.showLabel ? tick.label : "."}
                  </div>
                ))
              ) : null}

              {!shortRange
                ? monthTicks.map((tick, index) => {
                    const left = (tick.offset / totalDays) * 100;
                    const next = monthTicks[index + 1];
                    const right = next ? (next.offset / totalDays) * 100 : 100;
                    const center = (left + right) / 2;
                    return (
                      <div
                        key={`month-${tick.label}-${index}`}
                        style={{
                          position: "absolute",
                          left: `${center}%`,
                          top: "0px",
                          transform: "translateX(-50%)",
                          fontSize: "11px",
                          color: "#475569",
                          whiteSpace: "nowrap",
                          fontWeight: 800,
                        }}
                      >
                        {tick.label}
                      </div>
                    );
                  })
                : null}

              {!shortRange
                ? weekTicks.map((tick) => (
                    <div
                      key={`week-label-${tick.key}`}
                      style={{
                        position: "absolute",
                        left: `${(tick.offset / Math.max(totalDays - 1, 1)) * 100}%`,
                        top: "20px",
                        transform: "translateX(-50%)",
                        fontSize: "9px",
                        color: "#94a3b8",
                        whiteSpace: "nowrap",
                        fontWeight: 700,
                      }}
                    >
                      {tick.label}
                    </div>
                  ))
                : null}
            </div>
          </div>
        </div>

        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          {shortRange
            ? dayTicks.map((tick) =>
                tick.offset > 0 ? (
                  <div
                    key={`day-grid-${tick.key}`}
                    style={{
                      position: "absolute",
                      left: `${(tick.offset / Math.max(totalDays - 1, 1)) * 100}%`,
                      top: 0,
                      bottom: 0,
                      width: "1px",
                      background: tick.offset % 7 === 0 ? "#cfd9e5" : "#e2e8f0",
                    }}
                  />
                ) : null,
              )
            : monthTicks.map((tick, index) =>
                index > 0 ? (
                  <div
                    key={`${tick.label}-${index}`}
                    style={{
                      position: "absolute",
                      left: `${(tick.offset / totalDays) * 100}%`,
                      top: 0,
                      bottom: 0,
                      width: "2px",
                      background: "#c5d0dc",
                    }}
                  />
                ) : null,
              )}
          {(!shortRange || mediumRange)
            ? dayTicks.map((tick) =>
                tick.offset > 0 && toDate(tick.key).getDay() === 1 ? (
                  <div
                    key={`week-grid-${tick.key}`}
                    style={{
                      position: "absolute",
                      left: `${(tick.offset / Math.max(totalDays - 1, 1)) * 100}%`,
                      top: 0,
                      bottom: 0,
                      width: "1px",
                      background: "#d8e2ec",
                    }}
                  />
                ) : null,
              )
            : null}
        </div>

        <div style={{ display: "grid", gap: "6px", maxHeight: "420px", overflowY: "auto", position: "relative", zIndex: 1 }}>
          {employees.map((employee) => {
            const rowAbsences = filtered.filter((absence) => absence.employee === employee);
            return (
              <div key={employee} style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: "8px", alignItems: "center" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>{employee}</div>
                <div style={{ position: "relative", height: "24px", background: "#f1f5f9", borderRadius: "5px" }}>
                  {rowAbsences.map((absence) => {
                    const clampedStart = Math.max(toDate(absence.startDate).getTime(), from.getTime());
                    const clampedEnd = Math.min(toDate(absence.endDate).getTime(), to.getTime());
                    const left = ((clampedStart - from.getTime()) / (86400000 * totalDays)) * 100;
                    const width = Math.max(((clampedEnd - clampedStart) / (86400000 * totalDays)) * 100 + 100 / totalDays, 0.6);
                    const color = typeColor(absence.type);
                    const pending = absence.status === "EN_ATTENTE";
                    return (
                      <div
                        key={absence.id}
                        title={`${typeLabel(absence.type)}: ${fmtShort(absence.startDate)} → ${fmtShort(absence.endDate)} (${diffDays(absence.startDate, absence.endDate)}j)`}
                        style={{
                          position: "absolute",
                          left: `${left}%`,
                          width: `${width}%`,
                          top: "3px",
                          height: "18px",
                          borderRadius: "4px",
                          background: pending ? pendingPattern(color) : color,
                          opacity: 0.85,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          minWidth: "4px",
                          color: "#fff",
                          fontSize: "9px",
                          fontWeight: 700,
                        }}
                      >
                        {width > 8 ? `${typeLabel(absence.type).slice(0, 3)} ${diffDays(absence.startDate, absence.endDate)}j` : ""}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function VueResume({
  year,
  absences,
  employees,
}: {
  year: number;
  absences: AbsenceRequest[];
  employees: string[];
}) {
  const filtered = absences.filter(
    (absence) =>
      absence.startDate.startsWith(String(year)) || absence.endDate.startsWith(String(year)),
  );

  const rows = employees.map((employee) => {
    const mine = filtered.filter((absence) => absence.employee === employee);
    const byType: Record<AbsenceTypeId, number> = {
      CP: 0,
      MAL: 0,
      CONGE_MAT: 0,
      FORM: 0,
      FERIE: 0,
      AUTRE: 0,
    };
    let totalDays = 0;

    mine.forEach((absence) => {
      const start = Math.max(toDate(absence.startDate).getTime(), new Date(year, 0, 1).getTime());
      const end = Math.min(toDate(absence.endDate).getTime(), new Date(year, 11, 31).getTime());
      if (end >= start) {
        const days = Math.round((end - start) / 86400000) + 1;
        totalDays += days;
        byType[absence.type] += days;
      }
    });

    return {
      employee,
      totalDays,
      byType,
      pending: mine.filter((absence) => absence.status === "EN_ATTENTE").length,
    };
  });

  return (
    <div style={{ overflowX: "auto", maxHeight: "460px", overflowY: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "720px" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "10px", fontSize: "11px", color: "#94a3b8", borderBottom: "2px solid #dbe3eb" }}>Employe</th>
            <th style={{ textAlign: "center", padding: "10px", fontSize: "11px", color: "#94a3b8", borderBottom: "2px solid #dbe3eb" }}>Total jours</th>
            <th style={{ textAlign: "left", padding: "10px", fontSize: "11px", color: "#94a3b8", borderBottom: "2px solid #dbe3eb" }}>Repartition</th>
            <th style={{ textAlign: "center", padding: "10px", fontSize: "11px", color: "#d97706", borderBottom: "2px solid #dbe3eb" }}>Attente</th>
          </tr>
        </thead>
        <tbody>
          {rows
            .sort((a, b) => b.totalDays - a.totalDays)
            .map((row) => (
              <tr key={row.employee}>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid #e2e8f0", fontSize: "13px", fontWeight: 700 }}>{row.employee}</td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid #e2e8f0", textAlign: "center", fontSize: "18px", fontWeight: 800, color: row.totalDays ? "#5635b8" : "#94a3b8" }}>{row.totalDays || "—"}</td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid #e2e8f0" }}>
                  {row.totalDays ? (
                    <div style={{ display: "flex", gap: "1px", height: "14px", borderRadius: "4px", overflow: "hidden" }}>
                      {(Object.entries(row.byType) as [AbsenceTypeId, number][])
                        .filter(([, days]) => days > 0)
                        .map(([type, days]) => (
                          <div key={type} title={`${typeLabel(type)}: ${days}j`} style={{ width: `${(days / row.totalDays) * 100}%`, minWidth: "4px", background: typeColor(type), opacity: 0.85 }} />
                        ))}
                    </div>
                  ) : (
                    <div style={{ height: "14px", borderRadius: "4px", background: "#f1f5f9" }} />
                  )}
                </td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>
                  {row.pending ? (
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#d97706", background: "#fffbeb", padding: "3px 8px", borderRadius: "10px" }}>{row.pending}</span>
                  ) : null}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
