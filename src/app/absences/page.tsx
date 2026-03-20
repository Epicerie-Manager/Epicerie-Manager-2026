"use client";

import { useMemo, useState } from "react";
import { ModuleHeader } from "@/components/layout/module-header";
import {
  absenceRequests,
  absenceStatuses,
  absenceTypes,
} from "@/lib/absences-data";

function getDayDiff(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AbsencesPage() {
  const [statusFilter, setStatusFilter] = useState<"ALL" | "APPROUVE" | "EN_ATTENTE" | "REFUSE">("ALL");

  const filteredRequests = useMemo(() => {
    if (statusFilter === "ALL") {
      return absenceRequests;
    }

    return absenceRequests.filter((request) => request.status === statusFilter);
  }, [statusFilter]);

  const pendingCount = absenceRequests.filter(
    (request) => request.status === "EN_ATTENTE",
  ).length;
  const approvedCount = absenceRequests.filter(
    (request) => request.status === "APPROUVE",
  ).length;
  const todayIso = "2026-03-21";
  const absentToday = absenceRequests.filter(
    (request) =>
      request.status === "APPROUVE" &&
      request.startDate <= todayIso &&
      request.endDate >= todayIso,
  ).length;

  return (
    <section className="module-layout module-theme-absences">
      <ModuleHeader
        moduleKey="absences"
        title="Demandes d&apos;absence"
        description="Vue manager pour valider rapidement les demandes, suivre les periodes longues et anticiper les remplacements d'equipe."
      />

      <div className="planning-summary-grid">
        <article className="module-card">
          <p className="panel-kicker">En attente</p>
          <h2>{pendingCount}</h2>
          <p>Demandes a valider en priorite cette semaine.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Approuvees</p>
          <h2>{approvedCount}</h2>
          <p>Demandes deja validees sur la periode 2026.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Absents aujourd&apos;hui</p>
          <h2>{absentToday}</h2>
          <p>Lecture rapide avant le brief d&apos;ouverture.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Types suivis</p>
          <h2>{absenceTypes.length}</h2>
          <p>CP, maladie, conge maternite, formation et cas speciaux.</p>
        </article>
      </div>

      <article className="module-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="panel-kicker">Filtres</p>
            <h2>Statut des demandes</h2>
          </div>
        </div>
        <div className="week-chip-row">
          <button
            type="button"
            className={`week-chip${statusFilter === "ALL" ? " week-chip-active" : ""}`}
            onClick={() => setStatusFilter("ALL")}
          >
            Toutes
          </button>
          {absenceStatuses.map((status) => (
            <button
              key={status.id}
              type="button"
              className={`week-chip${statusFilter === status.id ? " week-chip-active" : ""}`}
              onClick={() => setStatusFilter(status.id)}
            >
              {status.label}
            </button>
          ))}
        </div>
      </article>

      <article className="module-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="panel-kicker">Demandes</p>
            <h2>Liste manager</h2>
          </div>
        </div>
        <div className="stats-table-wrap">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Employe</th>
                <th>Type</th>
                <th>Periode</th>
                <th>Duree</th>
                <th>Statut</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => {
                const type = absenceTypes.find((item) => item.id === request.type);
                return (
                  <tr key={request.id}>
                    <td>{request.employee}</td>
                    <td>{type?.label ?? request.type}</td>
                    <td>
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                    </td>
                    <td>{getDayDiff(request.startDate, request.endDate)} jours</td>
                    <td>
                      <span className="mini-badge mini-badge-tg">
                        {
                          absenceStatuses.find((item) => item.id === request.status)
                            ?.label
                        }
                      </span>
                    </td>
                    <td>{request.note ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
