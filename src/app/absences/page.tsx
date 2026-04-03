"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { ModuleHeader } from "@/components/layout/module-header";
import { moduleThemes } from "@/lib/theme";
import {
  absenceTypes,
  type AbsenceRequest,
  type AbsenceStatusId,
  type AbsenceTypeId,
} from "@/lib/absences-data";
import {
  createAbsenceRequestInSupabase,
  deleteAbsenceRequestInSupabase,
  getAbsencesUpdatedEventName,
  loadAbsenceRequests,
  syncPlanningFromAbsenceRequest,
  syncAbsencesFromSupabase,
  updateAbsenceStatusInSupabase,
} from "@/lib/absences-store";
import { TimelineSuivi } from "@/components/absences/timeline-suivi";
import { defaultRhEmployees, getRhEmployeeNames, getRhUpdatedEventName } from "@/lib/rh-store";
import {
  getPlanningUpdatedEventName,
  loadPlanningOverrides,
  syncPlanningFromSupabase,
  type PlanningOverrides,
} from "@/lib/planning-store";
import { getPlanningPresenceCountsForDate } from "@/lib/planning-presence";
import {
  getPresenceThresholdLevel,
  type PresenceThresholdLevel,
} from "@/lib/presence-thresholds";
import {
  getPresenceThresholdsUpdatedEventName,
  loadPresenceThresholds,
  syncPresenceThresholdsFromSupabase,
} from "@/lib/presence-thresholds-store";

type FilterStatus = "ALL" | AbsenceStatusId;
type PendingRiskBadge = {
  highestLevel: PresenceThresholdLevel;
  riskDays: number;
};

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

export default function AbsencesPage() {
  const theme = moduleThemes.absences;
  const [isInitialized, setIsInitialized] = useState(false);
  const [requests, setRequests] = useState<AbsenceRequest[]>(() => loadAbsenceRequests());
  const [planningOverrides, setPlanningOverrides] = useState<PlanningOverrides>(() => loadPlanningOverrides());
  const [presenceThresholds, setPresenceThresholds] = useState(() => loadPresenceThresholds());
  const [employees, setEmployees] = useState<string[]>(
    defaultRhEmployees.map((employee) => employee.n).sort((a, b) => a.localeCompare(b)),
  );
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [employeeFilter, setEmployeeFilter] = useState<string>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<{
    employee: string;
    type: AbsenceTypeId;
    startDate: string;
    endDate: string;
    note: string;
  }>({
    employee: defaultRhEmployees[0]?.n ?? "",
    type: "CP",
    startDate: "",
    endDate: "",
    note: "",
  });

  const filteredRequests = useMemo(() => {
    return requests
      .filter((request) => (statusFilter === "ALL" ? true : request.status === statusFilter))
      .filter((request) => (employeeFilter === "ALL" ? true : request.employee === employeeFilter))
      .sort((a, b) => {
        if (a.status === "en_attente" && b.status !== "en_attente") return -1;
        if (a.status !== "en_attente" && b.status === "en_attente") return 1;
        return a.startDate.localeCompare(b.startDate);
      });
  }, [employeeFilter, requests, statusFilter]);

  const pendingRiskBadges = useMemo(() => {
    const nextBadges = new Map<string, PendingRiskBadge>();
    requests
      .filter((request) => request.status === "en_attente")
      .forEach((request) => {
        const start = new Date(`${request.startDate}T00:00:00`);
        const end = new Date(`${request.endDate}T00:00:00`);
        let riskDays = 0;
        let highestLevel: PresenceThresholdLevel = "ok";

        for (const current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
          if (current.getDay() === 0) continue;
          const counts = getPlanningPresenceCountsForDate(current, planningOverrides);
          const level = getPresenceThresholdLevel(
            {
              morning: counts.morningCount,
              afternoon: counts.afternoonCount,
            },
            presenceThresholds,
          );
          if (level === "ok") continue;
          riskDays += 1;
          if (level === "critical") highestLevel = "critical";
          else if (highestLevel !== "critical") highestLevel = "warning";
        }

        if (riskDays > 0) {
          nextBadges.set(request.id, { highestLevel, riskDays });
        }
      });

    return nextBadges;
  }, [planningOverrides, presenceThresholds, requests]);

  useEffect(() => {
    const refresh = () => {
      setRequests(loadAbsenceRequests());
      setEmployees(getRhEmployeeNames());
      setPlanningOverrides(loadPlanningOverrides());
      setPresenceThresholds(loadPresenceThresholds());
    };

    refresh();
    setIsInitialized(true);
    void Promise.all([
      syncAbsencesFromSupabase(),
      syncPlanningFromSupabase(),
      syncPresenceThresholdsFromSupabase(),
    ]).then(() => {
      refresh();
    });
    const listeners = [
      getAbsencesUpdatedEventName(),
      getPlanningUpdatedEventName(),
      getPresenceThresholdsUpdatedEventName(),
    ];
    listeners.forEach((eventName) => window.addEventListener(eventName, refresh));
    return () => listeners.forEach((eventName) => window.removeEventListener(eventName, refresh));
  }, []);

  useEffect(() => {
    const refreshEmployees = () => {
      const names = getRhEmployeeNames();
      setEmployees(names);
      setDraft((current) =>
        names.includes(current.employee)
          ? current
          : { ...current, employee: names[0] ?? "" },
      );
    };
    if (!isInitialized) return;
    refreshEmployees();
    const eventName = getRhUpdatedEventName();
    window.addEventListener(eventName, refreshEmployees);
    return () => window.removeEventListener(eventName, refreshEmployees);
  }, [isInitialized]);

  const pendingCount = requests.filter((request) => request.status === "en_attente").length;
  const approvedCount = requests.filter((request) => request.status === "approuve").length;
  const refusedCount = requests.filter((request) => request.status === "refuse").length;
  const todayIso = new Date().toISOString().slice(0, 10);
  const absentToday = requests.filter(
    (request) =>
      request.status === "approuve" && request.startDate <= todayIso && request.endDate >= todayIso,
  ).length;

  const handleCreateRequest = async () => {
    if (!draft.employee || !draft.startDate || !draft.endDate) return;
    setError("");
    setBusy(true);
    try {
      await createAbsenceRequestInSupabase({
        employee: draft.employee,
        type: draft.type,
        startDate: draft.startDate,
        endDate: draft.endDate,
        note: draft.note.trim() || undefined,
        status: "en_attente",
      });
      setRequests(loadAbsenceRequests());
      setDraft({ employee: employees[0] ?? "", type: "CP", startDate: "", endDate: "", note: "" });
      setShowForm(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Impossible de créer la demande.");
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (id: string, status: AbsenceStatusId) => {
    const request = requests.find((item) => item.id === id);
    if (!request?.dbId) return;
    setError("");
    setBusy(true);
    try {
      await updateAbsenceStatusInSupabase(request.dbId, status);
      setRequests(loadAbsenceRequests());
      if (request.status === "approuve" || status === "approuve") {
        await syncPlanningFromAbsenceRequest(request);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Impossible de mettre à jour le statut.");
    } finally {
      setBusy(false);
    }
  };

  const deleteRequest = async (id: string) => {
    const request = requests.find((item) => item.id === id);
    if (!request?.dbId) return;
    setError("");
    setBusy(true);
    try {
      await deleteAbsenceRequestInSupabase(request.dbId);
      setRequests(loadAbsenceRequests());
      if (request.status === "approuve") {
        await syncPlanningFromAbsenceRequest(request);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Impossible de supprimer la demande.");
    } finally {
      setBusy(false);
    }
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    borderRadius: "999px",
    border: `1px solid ${active ? theme.color : "#dbe3eb"}`,
    background: active ? theme.medium : "#fff",
    color: active ? theme.color : "#64748b",
    fontWeight: active ? 700 : 500,
    fontSize: "12px",
    padding: "7px 12px",
  });

  return (
    <section style={{ display: "grid", gap: "14px", marginTop: "20px" }}>
      <ModuleHeader
        moduleKey="absences"
        title="Demandes d'absence"
        description="Vue manager pour valider les demandes, anticiper les periodes chargees et piloter visuellement les absences."
      />

      <KPIRow>
        <KPI
          moduleKey="absences"
          value={pendingCount}
          label="En attente"
          valueColor={pendingCount > 0 ? "#c2410c" : undefined}
          labelColor={pendingCount > 0 ? "#c2410c" : undefined}
          style={
            pendingCount > 0
              ? {
                  background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
                  border: "1px solid #fdba74",
                }
              : undefined
          }
        />
        <KPI moduleKey="absences" value={approvedCount} label="Approuvees" />
        <KPI
          moduleKey="absences"
          value={refusedCount}
          label="Refusees"
          valueColor={refusedCount > 0 ? "#b91c1c" : undefined}
          labelColor={refusedCount > 0 ? "#b91c1c" : undefined}
          style={
            refusedCount > 0
              ? {
                  background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
                  border: "1px solid #fca5a5",
                }
              : undefined
          }
        />
        <KPI moduleKey="absences" value={absentToday} label="Absents aujourd'hui" />
      </KPIRow>

      <Card>
        <Kicker moduleKey="absences" label="Filtres" />
        <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Pilotage des demandes</h2>
        <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(["ALL", "en_attente", "approuve", "refuse"] as const).map((status) => (
              <button key={status} type="button" style={chipStyle(statusFilter === status)} onClick={() => setStatusFilter(status)}>
                {status === "ALL" ? "Toutes" : status === "en_attente" ? "En attente" : status === "approuve" ? "Approuvees" : "Refusees"}
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
              {employees.map((employee) => (
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
                {employees.map((employee) => (
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
            <button type="button" style={chipStyle(true)} onClick={handleCreateRequest} disabled={busy}>Soumettre</button>
          </div>
          {error ? <p style={{ marginTop: "10px", fontSize: "12px", color: "#b91c1c" }}>{error}</p> : null}
        </Card>
      ) : null}

      <Card>
        <Kicker moduleKey="absences" label="Demandes" />
        <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Validation manager</h2>
        {error ? <p style={{ marginTop: "10px", fontSize: "12px", color: "#b91c1c" }}>{error}</p> : null}
        <div style={{ display: "grid", gap: "8px", marginTop: "10px", maxHeight: "360px", overflowY: "auto", paddingRight: "2px" }}>
          {filteredRequests.map((request) => {
            const requestType = absenceTypes.find((type) => type.id === request.type)?.label ?? request.type;
            const isPending = request.status === "en_attente";
            const riskBadge = pendingRiskBadges.get(request.id);
            const isCriticalRisk = riskBadge?.highestLevel === "critical";
            return (
              <div
                key={request.id}
                style={{
                  border: `1px solid ${riskBadge ? (isCriticalRisk ? "#fca5a5" : "#fdba74") : isPending ? "#fcd34d" : "#dbe3eb"}`,
                  background: riskBadge ? (isCriticalRisk ? "#fef2f2" : "#fff7ed") : isPending ? "#fffbeb" : "#fff",
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
                  {riskBadge ? (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "999px",
                        background: isCriticalRisk ? "#fee2e2" : "#ffedd5",
                        color: isCriticalRisk ? "#b91c1c" : "#c2410c",
                        border: `1px solid ${isCriticalRisk ? "#fca5a5" : "#fdba74"}`,
                      }}
                    >
                      {isCriticalRisk ? "Risque critique" : "Demande à risque"} · {riskBadge.riskDays}j
                    </span>
                  ) : null}
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {formatDate(request.startDate)} - {formatDate(request.endDate)} ({getDayDiff(request.startDate, request.endDate)}j)
                  </span>
                  {request.note ? <span style={{ fontSize: "12px", color: "#64748b" }}>{request.note}</span> : null}
                </div>

                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "999px", background: "#e2e8f0", color: "#334155" }}>
                    {request.status === "en_attente" ? "En attente" : request.status === "approuve" ? "Approuve" : "Refuse"}
                  </span>
                  {isPending ? (
                    <>
                      <button type="button" style={chipStyle(false)} onClick={() => updateStatus(request.id, "approuve")} disabled={busy}>Approuver</button>
                      <button type="button" style={chipStyle(false)} onClick={() => updateStatus(request.id, "refuse")} disabled={busy}>Refuser</button>
                    </>
                  ) : null}
                  {request.status === "refuse" ? (
                    <button type="button" style={chipStyle(false)} onClick={() => updateStatus(request.id, "en_attente")} disabled={busy}>
                      Remettre en attente
                    </button>
                  ) : null}
                  <button type="button" style={chipStyle(false)} onClick={() => deleteRequest(request.id)} disabled={busy}>Supprimer</button>
                </div>
              </div>
            );
          })}
          {filteredRequests.length === 0 ? <p style={{ fontSize: "12px", color: "#64748b" }}>Aucune demande sur ce filtre.</p> : null}
        </div>
      </Card>

      <TimelineSuivi absences={requests} employees={employees} />
    </section>
  );
}
