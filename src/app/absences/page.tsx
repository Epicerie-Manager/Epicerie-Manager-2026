"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { ModuleHeader } from "@/components/layout/module-header";
import { moduleThemes } from "@/lib/theme";
import {
  absenceEmployees,
  absenceTypes,
  type AbsenceRequest,
  type AbsenceStatusId,
  type AbsenceTypeId,
} from "@/lib/absences-data";
import { loadAbsenceRequests, saveAbsenceRequests } from "@/lib/absences-store";

type FilterStatus = "ALL" | AbsenceStatusId;
type TimelineMode = "YEAR" | "MONTH" | "RANGE";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDayDiff(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function parseIsoDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function clampDate(date: Date, min: Date, max: Date) {
  if (date < min) return min;
  if (date > max) return max;
  return date;
}

function getTypeColor(type: AbsenceTypeId) {
  if (type === "CP") return "#d97706";
  if (type === "MAL") return "#dc2626";
  if (type === "CONGE_MAT") return "#ea580c";
  if (type === "FORM") return "#0284c7";
  if (type === "FERIE") return "#16a34a";
  return "#db2777";
}

function daysBetweenInclusive(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

export default function AbsencesPage() {
  const theme = moduleThemes.absences;
  const initialRequests = useMemo(() => loadAbsenceRequests(), []);
  const [requests, setRequests] = useState<AbsenceRequest[]>(initialRequests);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [employeeFilter, setEmployeeFilter] = useState<string>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [nextId, setNextId] = useState(Math.max(...initialRequests.map((item) => item.id)) + 1);
  const [draft, setDraft] = useState<{
    employee: string;
    type: AbsenceTypeId;
    startDate: string;
    endDate: string;
    note: string;
  }>({
    employee: absenceEmployees[0],
    type: "CP",
    startDate: "",
    endDate: "",
    note: "",
  });

  const [timelineMode, setTimelineMode] = useState<TimelineMode>("YEAR");
  const [timelineYear, setTimelineYear] = useState(2026);
  const [timelineMonth, setTimelineMonth] = useState(2);
  const [rangeStart, setRangeStart] = useState("2026-06-01");
  const [rangeEnd, setRangeEnd] = useState("2026-08-31");

  const filteredRequests = useMemo(() => {
    return requests
      .filter((request) => (statusFilter === "ALL" ? true : request.status === statusFilter))
      .filter((request) => (employeeFilter === "ALL" ? true : request.employee === employeeFilter))
      .sort((a, b) => {
        if (a.status === "EN_ATTENTE" && b.status !== "EN_ATTENTE") return -1;
        if (a.status !== "EN_ATTENTE" && b.status === "EN_ATTENTE") return 1;
        return a.startDate.localeCompare(b.startDate);
      });
  }, [employeeFilter, requests, statusFilter]);

  useEffect(() => {
    saveAbsenceRequests(requests);
  }, [requests]);

  const pendingCount = requests.filter((request) => request.status === "EN_ATTENTE").length;
  const approvedCount = requests.filter((request) => request.status === "APPROUVE").length;
  const todayIso = "2026-03-21";
  const absentToday = requests.filter(
    (request) =>
      request.status === "APPROUVE" && request.startDate <= todayIso && request.endDate >= todayIso,
  ).length;

  const handleCreateRequest = () => {
    if (!draft.startDate || !draft.endDate) return;
    setRequests((current) => [
      ...current,
      {
        id: nextId,
        employee: draft.employee,
        type: draft.type,
        startDate: draft.startDate,
        endDate: draft.endDate,
        note: draft.note.trim() || undefined,
        status: "EN_ATTENTE",
      },
    ]);
    setNextId((current) => current + 1);
    setDraft({ employee: absenceEmployees[0], type: "CP", startDate: "", endDate: "", note: "" });
    setShowForm(false);
  };

  const updateStatus = (id: number, status: AbsenceStatusId) => {
    setRequests((current) => current.map((request) => (request.id === id ? { ...request, status } : request)));
  };

  const deleteRequest = (id: number) => {
    setRequests((current) => current.filter((request) => request.id !== id));
  };

  const approvedTimeline = useMemo(
    () => requests.filter((request) => request.status === "APPROUVE").sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [requests],
  );

  const years = useMemo(() => {
    const extracted = approvedTimeline.flatMap((request) => [
      parseIsoDate(request.startDate).getFullYear(),
      parseIsoDate(request.endDate).getFullYear(),
    ]);
    const uniq = Array.from(new Set([2026, ...extracted])).sort((a, b) => a - b);
    return uniq;
  }, [approvedTimeline]);

  const scale = useMemo(() => {
    if (timelineMode === "YEAR") {
      return {
        start: new Date(timelineYear, 0, 1),
        end: new Date(timelineYear, 11, 31),
        label: `Vue annee ${timelineYear}`,
      };
    }

    if (timelineMode === "MONTH") {
      const start = new Date(timelineYear, timelineMonth, 1);
      const end = new Date(timelineYear, timelineMonth + 1, 0);
      return {
        start,
        end,
        label: `Vue mois ${start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`,
      };
    }

    const rawStart = parseIsoDate(rangeStart);
    const rawEnd = parseIsoDate(rangeEnd);
    const start = rawStart <= rawEnd ? rawStart : rawEnd;
    const end = rawStart <= rawEnd ? rawEnd : rawStart;
    return {
      start,
      end,
      label: `Periode ${formatDate(toIsoDate(start))} - ${formatDate(toIsoDate(end))}`,
    };
  }, [rangeEnd, rangeStart, timelineMode, timelineMonth, timelineYear]);

  const totalScaleDays = daysBetweenInclusive(scale.start, scale.end);

  const timelineRows = useMemo(() => {
    const allEmployees = Array.from(
      new Set([...absenceEmployees, ...approvedTimeline.map((request) => request.employee)]),
    );

    return allEmployees.map((employee) => {
      const segments = approvedTimeline
        .filter((request) => request.employee === employee)
        .map((request) => {
          const reqStart = parseIsoDate(request.startDate);
          const reqEnd = parseIsoDate(request.endDate);
          const segStart = clampDate(reqStart, scale.start, scale.end);
          const segEnd = clampDate(reqEnd, scale.start, scale.end);

          if (segStart > scale.end || segEnd < scale.start || segStart > segEnd) return null;

          const startOffset = daysBetweenInclusive(scale.start, segStart) - 1;
          const segDays = daysBetweenInclusive(segStart, segEnd);
          const leftPct = (startOffset / totalScaleDays) * 100;
          const widthPct = Math.max((segDays / totalScaleDays) * 100, 1.2);

          return {
            id: request.id,
            type: request.type,
            leftPct,
            widthPct,
            label: `${formatDate(request.startDate)} - ${formatDate(request.endDate)}`,
          };
        })
        .filter((segment): segment is NonNullable<typeof segment> => !!segment);

      return { employee, segments };
    });
  }, [approvedTimeline, scale.end, scale.start, totalScaleDays]);

  const monthDailyStats = useMemo(() => {
    const monthStart = new Date(timelineYear, timelineMonth, 1);
    const monthEnd = new Date(timelineYear, timelineMonth + 1, 0);
    const days = daysBetweenInclusive(monthStart, monthEnd);

    return Array.from({ length: days }, (_, index) => {
      const current = new Date(timelineYear, timelineMonth, index + 1);
      const iso = toIsoDate(current);
      const absents = approvedTimeline.filter(
        (request) => request.startDate <= iso && request.endDate >= iso,
      ).length;
      const presents = Math.max(absenceEmployees.length - absents, 0);
      return { day: index + 1, absents, presents };
    });
  }, [approvedTimeline, timelineMonth, timelineYear]);

  const maxAbsents = Math.max(1, ...monthDailyStats.map((item) => item.absents));

  const chipStyle = (active: boolean): React.CSSProperties => ({
    borderRadius: "999px",
    border: `1px solid ${active ? theme.color : "#dbe3eb"}`,
    background: active ? theme.medium : "#fff",
    color: active ? theme.color : "#64748b",
    fontWeight: active ? 700 : 500,
    fontSize: "12px",
    padding: "7px 12px",
  });

  const monthLabels = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sep", "Oct", "Nov", "Dec"];

  return (
    <section style={{ display: "grid", gap: "14px", marginTop: "20px" }}>
      <ModuleHeader
        moduleKey="absences"
        title="Demandes d'absence"
        description="Vue manager pour valider les demandes, anticiper les periodes chargees et piloter visuellement les absences."
      />

      <KPIRow>
        <KPI moduleKey="absences" value={pendingCount} label="En attente" />
        <KPI moduleKey="absences" value={approvedCount} label="Approuvees" />
        <KPI moduleKey="absences" value={absentToday} label="Absents aujourd'hui" />
        <KPI moduleKey="absences" value={absenceTypes.length} label="Types suivis" />
      </KPIRow>

      <Card>
        <Kicker moduleKey="absences" label="Filtres" />
        <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Pilotage des demandes</h2>
        <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(["ALL", "EN_ATTENTE", "APPROUVE", "REFUSE"] as const).map((status) => (
              <button key={status} type="button" style={chipStyle(statusFilter === status)} onClick={() => setStatusFilter(status)}>
                {status === "ALL" ? "Toutes" : status === "EN_ATTENTE" ? "En attente" : status === "APPROUVE" ? "Approuvees" : "Refusees"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <select
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
              style={{ minHeight: "34px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px", fontSize: "12px" }}
            >
              <option value="ALL">Tous les employes</option>
              {absenceEmployees.map((employee) => (
                <option key={employee} value={employee}>{employee}</option>
              ))}
            </select>
            <button type="button" style={chipStyle(showForm)} onClick={() => setShowForm((current) => !current)}>
              {showForm ? "Fermer" : "Nouvelle demande"}
            </button>
          </div>
        </div>
      </Card>

      {showForm ? (
        <Card>
          <Kicker moduleKey="absences" label="Creation" />
          <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Saisie manager</h2>

          <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", marginTop: "10px" }}>
            <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#64748b" }}>
              <span>Employe</span>
              <select value={draft.employee} onChange={(event) => setDraft((current) => ({ ...current, employee: event.target.value }))} style={{ minHeight: "36px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px" }}>
                {absenceEmployees.map((employee) => (
                  <option key={employee} value={employee}>{employee}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#64748b" }}>
              <span>Type</span>
              <select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as AbsenceTypeId }))} style={{ minHeight: "36px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px" }}>
                {absenceTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#64748b" }}>
              <span>Date debut</span>
              <input type="date" value={draft.startDate} onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))} style={{ minHeight: "36px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px" }} />
            </label>
            <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#64748b" }}>
              <span>Date fin</span>
              <input type="date" value={draft.endDate} onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))} style={{ minHeight: "36px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px" }} />
            </label>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "10px", alignItems: "flex-end" }}>
            <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#64748b", flex: 1 }}>
              <span>Note (optionnel)</span>
              <input value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Motif ou precision..." style={{ minHeight: "36px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px" }} />
            </label>
            <button type="button" style={chipStyle(true)} onClick={handleCreateRequest}>Soumettre</button>
          </div>
        </Card>
      ) : null}

      <Card>
        <Kicker moduleKey="absences" label="Demandes" />
        <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Validation manager</h2>
        <div style={{ display: "grid", gap: "8px", marginTop: "10px", maxHeight: "360px", overflowY: "auto", paddingRight: "2px" }}>
          {filteredRequests.map((request) => {
            const requestType = absenceTypes.find((type) => type.id === request.type)?.label ?? request.type;
            const isPending = request.status === "EN_ATTENTE";
            return (
              <div
                key={request.id}
                style={{
                  border: `1px solid ${isPending ? "#fcd34d" : "#dbe3eb"}`,
                  background: isPending ? "#fffbeb" : "#fff",
                  borderRadius: "12px",
                  padding: "10px 12px",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: "13px", color: "#0f172a" }}>{request.employee}</strong>
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "999px", background: theme.light, color: theme.color }}>{requestType}</span>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {formatDate(request.startDate)} - {formatDate(request.endDate)} ({getDayDiff(request.startDate, request.endDate)}j)
                  </span>
                  {request.note ? <span style={{ fontSize: "12px", color: "#64748b" }}>{request.note}</span> : null}
                </div>

                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "999px", background: "#e2e8f0", color: "#334155" }}>
                    {request.status === "EN_ATTENTE" ? "En attente" : request.status === "APPROUVE" ? "Approuve" : "Refuse"}
                  </span>
                  {isPending ? (
                    <>
                      <button type="button" style={chipStyle(false)} onClick={() => updateStatus(request.id, "APPROUVE")}>Approuver</button>
                      <button type="button" style={chipStyle(false)} onClick={() => updateStatus(request.id, "REFUSE")}>Refuser</button>
                    </>
                  ) : null}
                  <button type="button" style={chipStyle(false)} onClick={() => deleteRequest(request.id)}>Supprimer</button>
                </div>
              </div>
            );
          })}
          {filteredRequests.length === 0 ? <p style={{ fontSize: "12px", color: "#64748b" }}>Aucune demande sur ce filtre.</p> : null}
        </div>
      </Card>

      <Card>
        <Kicker moduleKey="absences" label="Vue timeline" />
        <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Timeline absences approuvees</h2>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
          <button type="button" style={chipStyle(timelineMode === "YEAR")} onClick={() => setTimelineMode("YEAR")}>Vue annee</button>
          <button type="button" style={chipStyle(timelineMode === "MONTH")} onClick={() => setTimelineMode("MONTH")}>Vue mois</button>
          <button type="button" style={chipStyle(timelineMode === "RANGE")} onClick={() => setTimelineMode("RANGE")}>Vue periode</button>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px", alignItems: "center" }}>
          <select
            value={timelineYear}
            onChange={(event) => setTimelineYear(Number(event.target.value))}
            style={{ minHeight: "34px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px", fontSize: "12px" }}
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          {timelineMode === "MONTH" ? (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {monthLabels.map((label, index) => (
                <button key={label} type="button" style={chipStyle(timelineMonth === index)} onClick={() => setTimelineMonth(index)}>{label}</button>
              ))}
            </div>
          ) : null}

          {timelineMode === "RANGE" ? (
            <>
              <input type="date" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} style={{ minHeight: "34px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px", fontSize: "12px" }} />
              <span style={{ color: "#64748b", fontSize: "12px" }}>a</span>
              <input type="date" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} style={{ minHeight: "34px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px", fontSize: "12px" }} />
            </>
          ) : null}
        </div>

        <p style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>{scale.label}</p>

        {timelineMode === "YEAR" ? (
          <div style={{ display: "grid", gridTemplateColumns: "92px 1fr", gap: "8px", marginTop: "10px", fontSize: "11px", color: "#94a3b8" }}>
            <span />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)" }}>
              {monthLabels.map((month) => (
                <span key={month} style={{ textAlign: "center" }}>{month}</span>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: "8px", display: "grid", gap: "8px", maxHeight: "340px", overflowY: "auto", paddingRight: "2px" }}>
          {timelineRows.map((row) => (
            <div key={row.employee} style={{ display: "grid", gridTemplateColumns: "92px 1fr", gap: "8px", alignItems: "center" }}>
              <strong style={{ fontSize: "12px", color: "#1e293b", whiteSpace: "nowrap" }}>{row.employee}</strong>
              <div style={{ position: "relative", height: "12px", borderRadius: "999px", background: "#eef2f7", overflow: "hidden" }}>
                {row.segments.map((segment) => (
                  <div
                    key={segment.id}
                    title={segment.label}
                    style={{
                      position: "absolute",
                      left: `${segment.leftPct}%`,
                      width: `${segment.widthPct}%`,
                      top: 0,
                      bottom: 0,
                      borderRadius: "999px",
                      background: getTypeColor(segment.type),
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {timelineMode === "MONTH" ? (
          <div style={{ marginTop: "14px" }}>
            <Kicker moduleKey="absences" label="Compteur journalier" />
            <h3 style={{ marginTop: "6px", fontSize: "15px", color: "#0f172a" }}>
              {new Date(timelineYear, timelineMonth, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </h3>
            <div style={{ display: "grid", gap: "6px", marginTop: "8px", maxHeight: "220px", overflowY: "auto", paddingRight: "2px" }}>
              {monthDailyStats.map((item) => (
                <div key={item.day} style={{ display: "grid", gridTemplateColumns: "32px 1fr 70px 70px", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>{item.day}</span>
                  <div style={{ height: "8px", background: "#eef2f7", borderRadius: "999px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${(item.absents / maxAbsents) * 100}%`,
                        height: "100%",
                        borderRadius: "999px",
                        background: "#e11d48",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "11px", color: "#e11d48", fontWeight: 700 }}>Abs: {item.absents}</span>
                  <span style={{ fontSize: "11px", color: "#15803d", fontWeight: 700 }}>Pres: {item.presents}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
