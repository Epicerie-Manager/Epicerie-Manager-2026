"use client";

import { useEffect, useMemo, useState } from "react";
import { ModuleHeader } from "@/components/layout/module-header";
import {
  absenceEmployees,
  absenceRequests,
  absenceTypes,
  type AbsenceRequest,
  type AbsenceStatusId,
  type AbsenceTypeId,
} from "@/lib/absences-data";
import { loadAbsenceRequests, saveAbsenceRequests } from "@/lib/absences-store";

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
  const initialRequests = useMemo(() => loadAbsenceRequests(), []);
  const [requests, setRequests] = useState<AbsenceRequest[]>(initialRequests);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [employeeFilter, setEmployeeFilter] = useState<string>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [nextId, setNextId] = useState(
    Math.max(...initialRequests.map((item) => item.id)) + 1,
  );
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
      .filter((request) =>
        statusFilter === "ALL" ? true : request.status === statusFilter,
      )
      .filter((request) =>
        employeeFilter === "ALL" ? true : request.employee === employeeFilter,
      )
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
      request.status === "APPROUVE" &&
      request.startDate <= todayIso &&
      request.endDate >= todayIso,
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
    setDraft({
      employee: absenceEmployees[0],
      type: "CP",
      startDate: "",
      endDate: "",
      note: "",
    });
    setShowForm(false);
  };

  const updateStatus = (id: number, status: AbsenceStatusId) => {
    setRequests((current) =>
      current.map((request) => (request.id === id ? { ...request, status } : request)),
    );
  };

  const deleteRequest = (id: number) => {
    setRequests((current) => current.filter((request) => request.id !== id));
  };

  const approvedTimeline = requests
    .filter((request) => request.status === "APPROUVE")
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <section className="module-layout module-theme-absences absences-workbench">
      <ModuleHeader
        moduleKey="absences"
        title="Demandes d&apos;absence"
        description="Vue manager pour valider les demandes, anticiper les periodes chargees et garder une lecture immediate des absences de l'equipe."
      />

      <div className="planning-summary-grid">
        <article className="module-card">
          <p className="panel-kicker">En attente</p>
          <h2>{pendingCount}</h2>
          <p>Demandes a traiter rapidement.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Approuvees</p>
          <h2>{approvedCount}</h2>
          <p>Dossiers valides sur l&apos;annee.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Absents aujourd&apos;hui</p>
          <h2>{absentToday}</h2>
          <p>Lecture rapide avant ouverture.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Types suivis</p>
          <h2>{absenceTypes.length}</h2>
          <p>CP, maladie, conge maternite et autres motifs.</p>
        </article>
      </div>

      <article className="module-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="panel-kicker">Filtres</p>
            <h2>Pilotage des demandes</h2>
          </div>
        </div>
        <div className="absences-toolbar">
          <div className="week-chip-row">
            {(["ALL", "EN_ATTENTE", "APPROUVE", "REFUSE"] as const).map((status) => (
              <button
                key={status}
                type="button"
                className={`week-chip${statusFilter === status ? " week-chip-active" : ""}`}
                onClick={() => setStatusFilter(status)}
              >
                {status === "ALL"
                  ? "Toutes"
                  : status === "EN_ATTENTE"
                    ? "En attente"
                    : status === "APPROUVE"
                      ? "Approuvees"
                      : "Refusees"}
              </button>
            ))}
          </div>
          <div className="absences-toolbar-right">
            <select
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
              className="absences-select"
            >
              <option value="ALL">Tous les employes</option>
              {absenceEmployees.map((employee) => (
                <option key={employee} value={employee}>
                  {employee}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`week-chip${showForm ? " week-chip-active" : ""}`}
              onClick={() => setShowForm((current) => !current)}
            >
              {showForm ? "Fermer" : "Nouvelle demande"}
            </button>
          </div>
        </div>
      </article>

      {showForm ? (
        <article className="module-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="panel-kicker">Creation</p>
              <h2>Saisie manager</h2>
            </div>
          </div>
          <div className="planning-summary-grid">
            <label className="planning-select-field">
              <span>Employe</span>
              <select
                value={draft.employee}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, employee: event.target.value }))
                }
              >
                {absenceEmployees.map((employee) => (
                  <option key={employee} value={employee}>
                    {employee}
                  </option>
                ))}
              </select>
            </label>
            <label className="planning-select-field">
              <span>Type</span>
              <select
                value={draft.type}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    type: event.target.value as AbsenceTypeId,
                  }))
                }
              >
                {absenceTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="planning-select-field">
              <span>Date debut</span>
              <input
                type="date"
                value={draft.startDate}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, startDate: event.target.value }))
                }
                className="absences-input"
              />
            </label>
            <label className="planning-select-field">
              <span>Date fin</span>
              <input
                type="date"
                value={draft.endDate}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, endDate: event.target.value }))
                }
                className="absences-input"
              />
            </label>
          </div>
          <div className="absences-create-row">
            <label className="planning-select-field" style={{ flex: 1 }}>
              <span>Note (optionnel)</span>
              <input
                value={draft.note}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, note: event.target.value }))
                }
                placeholder="Motif ou precision..."
                className="absences-input"
              />
            </label>
            <button type="button" className="week-chip week-chip-active" onClick={handleCreateRequest}>
              Soumettre
            </button>
          </div>
        </article>
      ) : null}

      <article className="module-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="panel-kicker">Demandes</p>
            <h2>Validation manager</h2>
          </div>
        </div>
        <div className="absences-list">
          {filteredRequests.map((request) => {
            const requestType =
              absenceTypes.find((type) => type.id === request.type)?.label ?? request.type;
            const isPending = request.status === "EN_ATTENTE";
            return (
              <div
                key={request.id}
                className={`absences-row ${isPending ? "absences-row-pending" : ""}`}
              >
                <div className="absences-row-main">
                  <strong>{request.employee}</strong>
                  <span className="mini-badge mini-badge-tg">{requestType}</span>
                  <span className="manager-muted">
                    {formatDate(request.startDate)} - {formatDate(request.endDate)} (
                    {getDayDiff(request.startDate, request.endDate)}j)
                  </span>
                  {request.note ? <span className="manager-muted">{request.note}</span> : null}
                </div>
                <div className="absences-row-actions">
                  <span className="mini-badge mini-badge-gb">
                    {request.status === "EN_ATTENTE"
                      ? "En attente"
                      : request.status === "APPROUVE"
                        ? "Approuve"
                        : "Refuse"}
                  </span>
                  {isPending ? (
                    <>
                      <button
                        type="button"
                        className="week-chip"
                        onClick={() => updateStatus(request.id, "APPROUVE")}
                      >
                        Approuver
                      </button>
                      <button
                        type="button"
                        className="week-chip"
                        onClick={() => updateStatus(request.id, "REFUSE")}
                      >
                        Refuser
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="week-chip"
                    onClick={() => deleteRequest(request.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
          {filteredRequests.length === 0 ? (
            <div className="absences-empty">Aucune demande sur ce filtre.</div>
          ) : null}
        </div>
      </article>

      <article className="module-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="panel-kicker">Timeline</p>
            <h2>Absences approuvees 2026</h2>
          </div>
        </div>
        <div className="absences-timeline">
          {approvedTimeline.map((request) => (
            <div key={request.id} className="absences-timeline-item">
              <strong>{request.employee}</strong>
              <span>
                {formatDate(request.startDate)} - {formatDate(request.endDate)}
              </span>
              <span className="manager-muted">
                {
                  absenceTypes.find((type) => type.id === request.type)?.label
                }
              </span>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
