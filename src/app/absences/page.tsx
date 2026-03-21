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
import { TimelineSuivi } from "@/components/absences/timeline-suivi";

type FilterStatus = "ALL" | AbsenceStatusId;

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
  const refusedCount = requests.filter((request) => request.status === "REFUSE").length;
  const todayIso = new Date().toISOString().slice(0, 10);
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
                  {request.status === "REFUSE" ? (
                    <button type="button" style={chipStyle(false)} onClick={() => updateStatus(request.id, "EN_ATTENTE")}>
                      Remettre en attente
                    </button>
                  ) : null}
                  <button type="button" style={chipStyle(false)} onClick={() => deleteRequest(request.id)}>Supprimer</button>
                </div>
              </div>
            );
          })}
          {filteredRequests.length === 0 ? <p style={{ fontSize: "12px", color: "#64748b" }}>Aucune demande sur ce filtre.</p> : null}
        </div>
      </Card>

      <TimelineSuivi absences={requests} employees={absenceEmployees} />
    </section>
  );
}
