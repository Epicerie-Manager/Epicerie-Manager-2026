"use client";

import { useMemo, useState } from "react";
import { ModuleHeader } from "@/components/layout/module-header";
import {
  plateauMonths,
  plateauOperationsByMonth,
  plateauWeeks,
} from "@/lib/plateau-data";

export default function PlanPlateauPage() {
  const [activeMonthId, setActiveMonthId] = useState(plateauMonths[0]?.id ?? "");
  const activeWeeks = useMemo(
    () => plateauWeeks.filter((week) => week.monthId === activeMonthId),
    [activeMonthId],
  );
  const [activeWeekId, setActiveWeekId] = useState(activeWeeks[0]?.id ?? "");

  const activeMonth = plateauMonths.find((month) => month.id === activeMonthId) ?? plateauMonths[0];
  const activeWeek =
    activeWeeks.find((week) => week.id === activeWeekId) ?? activeWeeks[0];
  const archivedMonths = plateauMonths.filter((month) => month.status === "Archive").length;
  const monthlyOperations = plateauOperationsByMonth[activeMonth.id] ?? {};
  const totalZones = activeWeek?.zones.length ?? 0;

  const selectedZoneNames = new Set((activeWeek?.zones ?? []).map((zone) => zone.name));
  const focusOperations = Object.entries(monthlyOperations)
    .filter(([zone]) => selectedZoneNames.has(zone))
    .flatMap(([zone, operations]) =>
      operations.map((operation) => ({
        zone,
        ...operation,
      })),
    );

  return (
    <section className="module-layout module-theme-plateau plateau-workbench">
      <ModuleHeader
        moduleKey="plateau"
        title="Plan Plateau"
        description="Lecture manager active des implantations terrain avec navigation mois/semaine, focus zone et recap operations."
      />

      <article className="module-card">
        <div className="plateau-toolbar">
          <div className="week-chip-row">
            {plateauMonths.map((month) => (
              <button
                key={month.id}
                type="button"
                className={`week-chip${month.id === activeMonth.id ? " week-chip-active" : ""}`}
                onClick={() => {
                  setActiveMonthId(month.id);
                  const firstWeek = plateauWeeks.find((week) => week.monthId === month.id);
                  setActiveWeekId(firstWeek?.id ?? "");
                }}
              >
                {month.label}
              </button>
            ))}
          </div>
          <div className="week-chip-row">
            {activeWeeks.map((week) => (
              <button
                key={week.id}
                type="button"
                className={`week-chip${week.id === activeWeek?.id ? " week-chip-active" : ""}`}
                onClick={() => setActiveWeekId(week.id)}
              >
                {week.label}
              </button>
            ))}
          </div>
        </div>
      </article>

      <div className="planning-summary-grid">
        <article className="module-card">
          <p className="panel-kicker">Mois actif</p>
          <h2>{activeMonth.label}</h2>
          <p>Source terrain: {activeMonth.pdfLabel}.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Semaines chargees</p>
          <h2>{activeWeeks.length}</h2>
          <p>Decoupage pour retrouver vite la bonne periode.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Zones suivies</p>
          <h2>{totalZones}</h2>
          <p>Plateaux actifs dans la semaine selectionnee.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Archives</p>
          <h2>{archivedMonths}</h2>
          <p>Mois gardes en reference historique.</p>
        </article>
      </div>

      {activeWeek ? (
        <div className="dashboard-grid dashboard-grid-bottom">
          <article className="dashboard-card">
            <div className="section-heading compact-heading">
              <div>
                <p className="panel-kicker">Semaine focus</p>
                <h2>{activeWeek.label}</h2>
              </div>
            </div>
            <div className="status-grid">
              <div className="status-row">
                <span>Periode</span>
                <strong>{activeWeek.dateRange}</strong>
              </div>
              <div className="status-row">
                <span>Theme</span>
                <strong>{activeWeek.theme}</strong>
              </div>
              <div className="status-row">
                <span>Priorite manager</span>
                <strong>{activeWeek.priority}</strong>
              </div>
            </div>
          </article>

          <article className="dashboard-card">
            <div className="section-heading compact-heading">
              <div>
                <p className="panel-kicker">Operations semaine</p>
                <h2>Recap rapide</h2>
              </div>
            </div>
            <div className="plateau-ops-list">
              {focusOperations.slice(0, 8).map((operation) => (
                <div
                  key={`${operation.zone}-${operation.slot}-${operation.operation}`}
                  className="plateau-ops-item"
                >
                  <strong>{operation.zone}</strong>
                  <span>
                    {operation.slot}
                    {operation.zone ? ` · ${operation.operation}` : ""}
                  </span>
                </div>
              ))}
              {focusOperations.length === 0 ? (
                <div className="absences-empty">Aucune operation sur cette selection.</div>
              ) : null}
            </div>
          </article>
        </div>
      ) : null}

      <div className="plateau-grid">
        {(activeWeek?.zones ?? []).map((zone) => (
          <article key={zone.name} className="plateau-card">
            <div className="plateau-card-head">
              <div>
                <p className="panel-kicker">Zone terrain</p>
                <h2>{zone.name}</h2>
              </div>
              <span className="mini-badge mini-badge-tg">{zone.owner}</span>
            </div>
            <div className="plateau-card-body">
              <div className="plateau-focus-block">
                <span>Focus semaine</span>
                <strong>{zone.focus}</strong>
              </div>
              <p>{zone.notes}</p>
            </div>
          </article>
        ))}
      </div>

      <article className="module-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="panel-kicker">Recap mois</p>
            <h2>Operations par zone</h2>
          </div>
        </div>
        <div className="shortcut-grid">
          {Object.entries(monthlyOperations).map(([zone, operations]) => (
            <div key={zone} className="shortcut-card">
              <h3>{zone}</h3>
              <ul>
                {operations.map((operation) => (
                  <li key={`${zone}-${operation.slot}-${operation.operation}`}>
                    {operation.slot}
                    {operation.zone ? ` (${operation.zone})` : ""} : {operation.operation}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
