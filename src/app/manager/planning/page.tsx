"use client";

import { useEffect, useMemo, useState } from "react";
import { absenceTypes, type AbsenceTypeId } from "@/lib/absences-data";
import { syncPlanningStatusToAbsenceInSupabase } from "@/lib/absences-store";
import {
  formatPlanningDate,
  getPlanningMonthKey,
  getPlanningStatus,
  getPlanningTriPairForDate,
  loadPlanningHorairePresets,
  loadPlanningOverrides,
  loadPlanningTriData,
  planningEmployees,
  savePlanningOverridesToSupabase,
  syncPlanningFromSupabase,
  type PlanningEmployee,
  type PlanningOverrides,
  type PlanningTriData,
} from "@/lib/planning-store";
import {
  getPlanningHoraireForDate,
  getPlanningPresenceCountsForDate,
  getPlanningShiftBuckets,
} from "@/lib/planning-presence";
import { getPlanningUpdatedEventName } from "@/lib/planning-store";

type PlanningEditStatus = "PRESENT" | "RH" | "X";
type PlanningEditorMode = PlanningEditStatus | "ABSENCE";
type PlanningView = "today" | "week";

type EditableDay = {
  employee: PlanningEmployee;
  date: Date;
  status: string;
  horaire: string | null;
};

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function shellCard(): React.CSSProperties {
  return {
    borderRadius: 28,
    padding: "18px 18px 20px",
    background: "rgba(255,255,255,0.86)",
    border: "1px solid rgba(255,255,255,0.8)",
    boxShadow: "0 16px 40px rgba(17,24,39,0.08)",
  };
}

function metricTileStyle(): React.CSSProperties {
  return {
    borderRadius: 22,
    padding: "14px 14px 12px",
    background: "#fffdfb",
    border: "1px solid rgba(230,220,212,0.92)",
    boxShadow: "0 10px 24px rgba(17,24,39,0.04)",
  };
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + delta);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function isAbsenceLikeStatus(status: string) {
  return ["CP", "MAL", "FORM", "FERIE", "CONGE_MAT", "DEPLACEMENT_RH", "ABS", "X"].includes(String(status).toUpperCase());
}

function getStatusTone(status: string) {
  const normalized = String(status).toUpperCase();
  if (normalized === "PRESENT") return { bg: "#ecfdf5", color: "#166534", label: "P" };
  if (normalized === "RH") return { bg: "#ede9fe", color: "#6d28d9", label: "RH" };
  if (normalized === "X") return { bg: "#f3f4f6", color: "#6b7280", label: "X" };
  if (normalized === "CP") return { bg: "#fffbeb", color: "#92400e", label: "CP" };
  if (normalized === "DEPLACEMENT_RH") return { bg: "#eef2ff", color: "#4338ca", label: "DEP" };
  if (normalized === "MAL") return { bg: "#fef2f2", color: "#b91c1c", label: "MAL" };
  if (normalized === "CONGE_MAT") return { bg: "#fff7ed", color: "#c2410c", label: "MAT" };
  if (normalized === "FORM") return { bg: "#eff6ff", color: "#1d4ed8", label: "FORM" };
  if (normalized === "FERIE") return { bg: "#e2e8f0", color: "#475569", label: "F" };
  return { bg: "#f8fafc", color: "#475569", label: normalized || "-" };
}

function getPresenceBadges(horaire: string | null) {
  const shifts = getPlanningShiftBuckets(horaire);
  const badges: Array<{ label: string; bg: string; color: string }> = [];
  if (shifts.morning) {
    badges.push({ label: "M", bg: "#dbeafe", color: "#1d4ed8" });
  }
  if (shifts.afternoon) {
    badges.push({ label: "AM", bg: "#ffedd5", color: "#c2410c" });
  }
  if (!badges.length) {
    badges.push({ label: "P", bg: "#ecfdf5", color: "#166534" });
  }
  return badges;
}

function planningStatusToAbsenceType(status: string): AbsenceTypeId {
  const upper = String(status).toUpperCase();
  if (upper === "CP") return "CP";
  if (upper === "DEPLACEMENT_RH") return "DEPLACEMENT_RH";
  if (upper === "MAL") return "MAL";
  if (upper === "CONGE_MAT") return "CONGE_MAT";
  if (upper === "FORM") return "FORM";
  if (upper === "FERIE") return "FERIE";
  return "AUTRE";
}

function absenceTypeToPlanningStatus(type: AbsenceTypeId) {
  if (type === "AUTRE") return "X";
  return type;
}

export default function ManagerPlanningPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [weekCursor, setWeekCursor] = useState(() => startOfWeek(new Date()));
  const [view, setView] = useState<PlanningView>("today");
  const [overrides, setOverrides] = useState<PlanningOverrides>({});
  const [triData, setTriData] = useState<PlanningTriData>({});
  const [horairePresets, setHorairePresets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<EditableDay | null>(null);
  const [editorMode, setEditorMode] = useState<PlanningEditorMode>("PRESENT");
  const [editStatus, setEditStatus] = useState<PlanningEditStatus>("PRESENT");
  const [editHoraire, setEditHoraire] = useState("");
  const [absenceType, setAbsenceType] = useState<AbsenceTypeId>("CP");

  useEffect(() => {
    const refresh = () => {
      const monthKey = getPlanningMonthKey(weekCursor);
      setOverrides(loadPlanningOverrides());
      setTriData(loadPlanningTriData(monthKey));
      setHorairePresets(loadPlanningHorairePresets());
    };

    refresh();
    void syncPlanningFromSupabase(getPlanningMonthKey(weekCursor)).then(() => {
      refresh();
      setLoading(false);
    });

    const eventName = getPlanningUpdatedEventName();
    window.addEventListener(eventName, refresh);
    return () => window.removeEventListener(eventName, refresh);
  }, [weekCursor]);

  const eligibleEmployees = useMemo(
    () =>
      planningEmployees
        .filter((employee) => employee.actif)
        .sort((left, right) => left.n.localeCompare(right.n, "fr")),
    [],
  );

  const dayIso = formatPlanningDate(selectedDate);
  const todayTriPair = getPlanningTriPairForDate(selectedDate, triData);
  const todayCounts = getPlanningPresenceCountsForDate(selectedDate, overrides);

  const todayRows = useMemo(() => {
    return eligibleEmployees
      .map((employee) => {
        const status = getPlanningStatus(employee, selectedDate, overrides);
        const horaire = getPlanningHoraireForDate(employee, selectedDate, overrides);
        const shifts = getPlanningShiftBuckets(horaire);
        const tri = todayTriPair?.includes(employee.n) ?? false;
        return {
          employee,
          status,
          horaire,
          tri,
          isMorning: shifts.morning && !shifts.afternoon,
          isAfternoon: shifts.afternoon && !shifts.morning,
        };
      })
      .sort((left, right) => {
        const rank = (status: string) => {
          const normalized = String(status).toUpperCase();
          if (normalized === "PRESENT") return 0;
          if (normalized === "RH") return 1;
          return 2;
        };
        const diff = rank(left.status) - rank(right.status);
        return diff || left.employee.n.localeCompare(right.employee.n, "fr");
      });
  }, [eligibleEmployees, overrides, selectedDate, todayTriPair]);

  const presentToday = todayRows.filter((row) => row.status === "PRESENT");
  const absentToday = todayRows.filter((row) => row.status !== "PRESENT");

  const weekDays = useMemo(() => Array.from({ length: 6 }, (_, index) => addDays(weekCursor, index)), [weekCursor]);

  const weekRows = useMemo(() => {
    return eligibleEmployees.map((employee) => ({
      employee,
      days: weekDays.map((date) => ({
        date,
        status: getPlanningStatus(employee, date, overrides),
        horaire: getPlanningHoraireForDate(employee, date, overrides),
      })),
    }));
  }, [eligibleEmployees, overrides, weekDays]);

  const openEditor = (employee: PlanningEmployee, date: Date) => {
    const status = getPlanningStatus(employee, date, overrides);
    const horaire = getPlanningHoraireForDate(employee, date, overrides);
    setEditor({ employee, date, status, horaire });
    if (status === "RH") {
      setEditorMode("RH");
      setEditStatus("RH");
    } else if (status === "X") {
      setEditorMode("X");
      setEditStatus("X");
    } else if (status === "PRESENT") {
      setEditorMode("PRESENT");
      setEditStatus("PRESENT");
    } else {
      setEditorMode("ABSENCE");
      setEditStatus("X");
      setAbsenceType(planningStatusToAbsenceType(status));
    }
    setEditHoraire(horaire ?? "");
  };

  const saveEdit = async () => {
    if (!editor) return;
    try {
      setSaving(true);
      setError("");
      const dateIso = formatPlanningDate(editor.date);
      const key = `${editor.employee.n}_${dateIso}`;
      const targetStatus = editorMode === "ABSENCE" ? absenceTypeToPlanningStatus(absenceType) : editStatus;
      const targetHoraire = targetStatus === "PRESENT" ? (editHoraire.trim() || null) : null;
      const nextOverrides: PlanningOverrides = {
        ...overrides,
        [key]: {
          s: targetStatus,
          h: targetHoraire,
        },
      };

      if (editorMode === "ABSENCE") {
        delete nextOverrides[key];
      }

      await syncPlanningStatusToAbsenceInSupabase({
        employeeName: editor.employee.n,
        date: dateIso,
        status: targetStatus,
      });

      await savePlanningOverridesToSupabase(
        [
          {
            employeeName: editor.employee.n,
            date: dateIso,
            status: targetStatus,
            horaire: targetHoraire,
          },
        ],
        nextOverrides,
      );

      await syncPlanningFromSupabase(getPlanningMonthKey(editor.date));
      setOverrides(loadPlanningOverrides());
      setEditor(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Impossible d'enregistrer la modification.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div style={shellCard()}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1d4ed8" }}>
            Pilotage quotidien
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.06em", color: "#111827" }}>
            Vue planning de l&apos;équipe
          </div>
          <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
            Consulte le jour ou la semaine, puis modifie directement un horaire ou une présence en touchant la ligne d&apos;un collaborateur.
          </div>
          {loading ? <div style={{ fontSize: 12, color: "#6b7280" }}>Synchronisation du planning...</div> : null}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <div style={metricTileStyle()}><div style={{ fontSize: 11, color: "#6b7280" }}>Présents</div><div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: "#166534" }}>{presentToday.length}</div></div>
        <div style={metricTileStyle()}><div style={{ fontSize: 11, color: "#6b7280" }}>Absents / hors poste</div><div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: "#b91c1c" }}>{absentToday.length}</div></div>
        <div style={metricTileStyle()}><div style={{ fontSize: 11, color: "#6b7280" }}>Matin</div><div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: "#1d4ed8" }}>{todayCounts.morningCount}</div></div>
        <div style={metricTileStyle()}><div style={{ fontSize: 11, color: "#6b7280" }}>Après-midi</div><div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: "#c2410c" }}>{todayCounts.afternoonCount}</div></div>
      </div>

      <div style={shellCard()}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setView("today")} style={{ minHeight: 40, borderRadius: 999, border: `1px solid ${view === "today" ? "#2563eb" : "#d8d1c8"}`, background: view === "today" ? "#eff6ff" : "#fff", color: view === "today" ? "#1d4ed8" : "#475569", padding: "0 14px", fontSize: 12, fontWeight: 800 }}>Aujourd&apos;hui</button>
          <button type="button" onClick={() => setView("week")} style={{ minHeight: 40, borderRadius: 999, border: `1px solid ${view === "week" ? "#2563eb" : "#d8d1c8"}`, background: view === "week" ? "#eff6ff" : "#fff", color: view === "week" ? "#1d4ed8" : "#475569", padding: "0 14px", fontSize: 12, fontWeight: 800 }}>Semaine</button>
        </div>
      </div>

      {view === "today" ? (
        <>
          <div style={shellCard()}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1d4ed8" }}>Vue du jour</div>
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedDate((current) => addDays(current, -1))}
                      style={{ minWidth: 34, minHeight: 34, borderRadius: 14, border: "1px solid #d8d1c8", background: "#fff", fontWeight: 800 }}
                    >
                      {"<"}
                    </button>
                    <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.05em", color: "#111827" }}>{formatDayLabel(selectedDate)}</div>
                    <button
                      type="button"
                      onClick={() => setSelectedDate((current) => addDays(current, 1))}
                      style={{ minWidth: 34, minHeight: 34, borderRadius: 14, border: "1px solid #d8d1c8", background: "#fff", fontWeight: 800 }}
                    >
                      {">"}
                    </button>
                    {formatPlanningDate(selectedDate) !== formatPlanningDate(new Date()) ? (
                      <button
                        type="button"
                        onClick={() => setSelectedDate(new Date())}
                        style={{
                          minHeight: 34,
                          borderRadius: 14,
                          border: "1px solid #d8d1c8",
                          background: "#fff",
                          padding: "0 10px",
                          fontSize: 11,
                          fontWeight: 800,
                          color: "#475569",
                        }}
                      >
                        Revenir à aujourd&apos;hui
                      </button>
                    ) : null}
                  </div>
                </div>
                {todayTriPair ? <div style={{ fontSize: 12, color: "#6b7280", textAlign: "right" }}>Tri cadie : <strong style={{ color: "#111827" }}>{todayTriPair[0]} + {todayTriPair[1]}</strong></div> : null}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                {todayRows.map((row) => {
                  const tone = getStatusTone(row.status);
                  const presenceBadges = row.status === "PRESENT" ? getPresenceBadges(row.horaire) : [];
                  return (
                    <button key={`${row.employee.n}-${dayIso}`} type="button" onClick={() => openEditor(row.employee, selectedDate)} style={{ width: "100%", border: "1px solid rgba(230,220,212,0.92)", background: "#fffdfb", borderRadius: 22, padding: "14px 14px 16px", textAlign: "left" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "start" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.03em", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.employee.n}</div>
                          <div style={{ marginTop: 4, fontSize: 11, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.status === "PRESENT" ? (row.horaire || "Aucun horaire") : tone.label}
                            {row.tri ? " · Tri cadie" : ""}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {row.status === "PRESENT"
                            ? presenceBadges.map((badge) => (
                                <div
                                  key={`${row.employee.n}-${badge.label}`}
                                  style={{ borderRadius: 999, padding: "7px 10px", background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 800 }}
                                >
                                  {badge.label}
                                </div>
                              ))
                            : <div style={{ borderRadius: 999, padding: "7px 10px", background: tone.bg, color: tone.color, fontSize: 11, fontWeight: 800 }}>{tone.label}</div>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {view === "week" ? (
        <div style={shellCard()}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0f766e" }}>Vue semaine</div>
                <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, letterSpacing: "-0.05em", color: "#111827" }}>{formatDayLabel(weekDays[0])} → {formatDayLabel(weekDays[5])}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setWeekCursor((current) => addDays(current, -7))} style={{ minWidth: 42, minHeight: 42, borderRadius: 16, border: "1px solid #d8d1c8", background: "#fff", fontWeight: 800 }}>{"<"}</button>
                <button type="button" onClick={() => setWeekCursor((current) => addDays(current, 7))} style={{ minWidth: 42, minHeight: 42, borderRadius: 16, border: "1px solid #d8d1c8", background: "#fff", fontWeight: 800 }}>{">"}</button>
              </div>
            </div>

            <div style={{ overflowX: "auto", borderRadius: 22, border: "1px solid rgba(230,220,212,0.92)", background: "#fffdfb" }}>
              <div style={{ minWidth: 680 }}>
                <div style={{ display: "grid", gridTemplateColumns: "160px repeat(6, minmax(82px, 1fr))", borderBottom: "1px solid rgba(230,220,212,0.92)", background: "#f8fafc" }}>
                  <div style={{ padding: "12px 14px", fontSize: 12, fontWeight: 800, color: "#475569" }}>Collaborateur</div>
                  {weekDays.map((date, index) => (
                    <div key={formatPlanningDate(date)} style={{ padding: "12px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>{DAY_NAMES[index]}</div>
                      <div style={{ marginTop: 2, fontSize: 11, color: "#6b7280" }}>{date.getDate()}</div>
                    </div>
                  ))}
                </div>

                {weekRows.map((row, rowIndex) => (
                  <div key={row.employee.n} style={{ display: "grid", gridTemplateColumns: "160px repeat(6, minmax(82px, 1fr))", borderBottom: rowIndex === weekRows.length - 1 ? "none" : "1px solid rgba(230,220,212,0.82)" }}>
                    <div style={{ padding: "14px", fontSize: 13, fontWeight: 800, color: "#111827", display: "flex", alignItems: "center" }}>{row.employee.n}</div>
                    {row.days.map((day) => {
                      const tone = getStatusTone(day.status);
                      const presenceBadges = day.status === "PRESENT" ? getPresenceBadges(day.horaire) : [];
                      return (
                        <button key={`${row.employee.n}-${formatPlanningDate(day.date)}`} type="button" onClick={() => openEditor(row.employee, day.date)} style={{ minHeight: 72, border: "none", borderLeft: "1px solid rgba(230,220,212,0.82)", background: "#fffdfb", padding: "8px 6px", display: "grid", alignContent: "center", justifyItems: "center", gap: 6 }}>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
                            {day.status === "PRESENT"
                              ? presenceBadges.map((badge) => (
                                  <div
                                    key={`${row.employee.n}-${formatPlanningDate(day.date)}-${badge.label}`}
                                    style={{ minWidth: badge.label === "AM" ? 30 : 24, borderRadius: 999, padding: "5px 8px", background: badge.bg, color: badge.color, fontSize: 10, fontWeight: 800, textAlign: "center" }}
                                  >
                                    {badge.label}
                                  </div>
                                ))
                              : <div style={{ minWidth: 44, borderRadius: 999, padding: "5px 8px", background: tone.bg, color: tone.color, fontSize: 10, fontWeight: 800, textAlign: "center" }}>{tone.label}</div>}
                          </div>
                          <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.3, textAlign: "center" }}>
                            {day.status === "PRESENT" ? (day.horaire || "-") : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <div style={{ ...shellCard(), color: "#b91c1c", fontSize: 13 }}>{error}</div> : null}

      {editor ? (
        <div role="presentation" onClick={() => setEditor(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 60, display: "grid", alignItems: "end" }}>
          <div role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} style={{ borderRadius: "28px 28px 0 0", background: "#fff", padding: "20px 18px 28px", boxShadow: "0 -18px 48px rgba(15,23,42,0.2)", display: "grid", gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1d4ed8" }}>Modifier la journée</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.05em", color: "#111827" }}>{editor.employee.n}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>{formatDayLabel(editor.date)}</div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Statut</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                {([
                  { key: "PRESENT", label: "Présent" },
                  { key: "RH", label: "RH" },
                  { key: "ABSENCE", label: "Absence" },
                  { key: "X", label: "X" },
                ] as const).map((option) => {
                  const active = editorMode === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setEditorMode(option.key);
                        if (option.key !== "ABSENCE") {
                          setEditStatus(option.key);
                        }
                      }}
                      style={{
                        minHeight: 44,
                        borderRadius: 16,
                        border: `1px solid ${active ? "#93c5fd" : "#d8d1c8"}`,
                        background: active ? "#eff6ff" : "#fff",
                        color: active ? "#1d4ed8" : "#374151",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {isAbsenceLikeStatus(editor.status) && !["RH", "X", "PRESENT"].includes(editor.status) ? <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>Cette journée vient d&apos;une absence validée. Tu peux maintenant la modifier directement ici avec le même motif métier que dans le bureau.</div> : null}

            {editorMode === "ABSENCE" ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Motif d&apos;absence</div>
                <select
                  value={absenceType}
                  onChange={(event) => setAbsenceType(event.target.value as AbsenceTypeId)}
                  style={{ minHeight: 46, borderRadius: 18, border: "1px solid #d8d1c8", padding: "0 14px", fontSize: 14, background: "#fff" }}
                >
                  {absenceTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {editorMode === "PRESENT" ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Horaire</div>
                <input value={editHoraire} onChange={(event) => setEditHoraire(event.target.value)} placeholder="Ex: 6h-13h" list="manager-planning-horaires" style={{ minHeight: 46, borderRadius: 18, border: "1px solid #d8d1c8", padding: "0 14px", fontSize: 14, background: "#fff" }} />
                <datalist id="manager-planning-horaires">{horairePresets.map((horaire) => <option key={horaire} value={horaire} />)}</datalist>
              </div>
            ) : null}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              <button type="button" onClick={() => setEditor(null)} style={{ minHeight: 46, borderRadius: 16, border: "1px solid #d8d1c8", background: "#fff", color: "#374151", fontWeight: 800 }}>Annuler</button>
              <button type="button" onClick={saveEdit} disabled={saving} style={{ minHeight: 46, borderRadius: 16, border: "none", background: "linear-gradient(135deg, #2563eb, #38bdf8)", color: "#fff", fontWeight: 800, opacity: saving ? 0.7 : 1 }}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
