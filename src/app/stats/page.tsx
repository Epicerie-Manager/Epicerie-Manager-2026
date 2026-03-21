"use client";

import { useMemo, useState } from "react";
import { ModuleHeader } from "@/components/layout/module-header";
import {
  balisageData,
  balisageMonths,
  balisageObjective,
  type BalisageEmployeeStat,
} from "@/lib/balisage-data";

type SortBy = "name" | "total" | "alert";

function getProgress(total: number) {
  return Math.min(Math.round((total / balisageObjective) * 100), 100);
}

function getStatus(total: number) {
  if (total >= balisageObjective) return "OK";
  if (total >= balisageObjective * 0.5) return "En retard";
  return "Alerte";
}

export default function StatsPage() {
  const [activeMonthIndex, setActiveMonthIndex] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingTotal, setEditingTotal] = useState("");
  const [editingErrorRate, setEditingErrorRate] = useState("");
  const [localData, setLocalData] = useState<Record<string, BalisageEmployeeStat[]>>(
    balisageData,
  );

  const activeMonth = balisageMonths[activeMonthIndex];
  const activeStats = useMemo(
    () => localData[activeMonth.id] ?? [],
    [activeMonth.id, localData],
  );

  const sortedStats = useMemo(() => {
    const list = [...activeStats];
    if (sortBy === "total") {
      return list.sort((a, b) => b.total - a.total);
    }
    if (sortBy === "alert") {
      return list.sort((a, b) => a.total - b.total);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [activeStats, sortBy]);

  const totalControls = activeStats.reduce((sum, item) => sum + item.total, 0);
  const employeesOk = activeStats.filter((item) => item.total >= balisageObjective).length;
  const employeesAlert = activeStats.filter(
    (item) => item.total < balisageObjective * 0.5,
  ).length;
  const bestEmployee = [...activeStats].sort((a, b) => b.total - a.total)[0];
  const globalPercent = Math.min(
    Math.round((totalControls / (Math.max(activeStats.length, 1) * balisageObjective)) * 100),
    100,
  );

  const openEdit = (employee: BalisageEmployeeStat) => {
    setEditingName(employee.name);
    setEditingTotal(String(employee.total));
    setEditingErrorRate(
      employee.errorRate === null ? "" : String(employee.errorRate),
    );
  };

  const saveEdit = () => {
    if (!editingName) return;
    setLocalData((current) => ({
      ...current,
      [activeMonth.id]: (current[activeMonth.id] ?? []).map((employee) =>
        employee.name === editingName
          ? {
              ...employee,
              total: Number.isNaN(Number(editingTotal)) ? employee.total : Number(editingTotal),
              errorRate:
                editingErrorRate.trim() === ""
                  ? null
                  : Number.isNaN(Number(editingErrorRate))
                    ? employee.errorRate
                    : Number(editingErrorRate),
            }
          : employee,
      ),
    }));
    setEditingName(null);
  };

  return (
    <section className="module-layout module-theme-stats balisage-workbench">
      <ModuleHeader
        moduleKey="balisage"
        title="Stats balisage"
        description="Vue manager interactive inspiree de Claude AI: tri rapide, suivi du mois, edition des valeurs et lecture immediate des alertes equipe."
      />

      <article className="module-card">
        <div className="balisage-toolbar">
          <div className="week-chip-row">
            <button
              type="button"
              className="week-chip"
              onClick={() => setActiveMonthIndex((index) => Math.max(0, index - 1))}
            >
              ←
            </button>
            <strong>{activeMonth.label}</strong>
            <button
              type="button"
              className="week-chip"
              onClick={() =>
                setActiveMonthIndex((index) =>
                  Math.min(balisageMonths.length - 1, index + 1),
                )
              }
            >
              →
            </button>
          </div>
          <div className="week-chip-row">
            {(["name", "total", "alert"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`week-chip${sortBy === value ? " week-chip-active" : ""}`}
                onClick={() => setSortBy(value)}
              >
                {value === "name" ? "A-Z" : value === "total" ? "Controles" : "Alertes"}
              </button>
            ))}
          </div>
        </div>
      </article>

      <div className="planning-summary-grid">
        <article className="module-card">
          <p className="panel-kicker">Total controles</p>
          <h2>{totalControls}</h2>
          <p>Somme des controles du mois charge.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Avancement global</p>
          <h2>{globalPercent}%</h2>
          <p>Niveau global vs objectif equipe.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Employes OK</p>
          <h2>{employeesOk}</h2>
          <p>Ont atteint ou depasse {balisageObjective} controles.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Alertes</p>
          <h2>{employeesAlert}</h2>
          <p>En dessous de 50% de l&apos;objectif mensuel.</p>
        </article>
      </div>

      <div className="dashboard-grid dashboard-grid-bottom">
        <article className="dashboard-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="panel-kicker">Classement</p>
              <h2>Meilleur niveau actuel</h2>
            </div>
          </div>
          <div className="status-grid">
            <div className="status-row">
              <span>Employe en tete</span>
              <strong>{bestEmployee?.name ?? "-"}</strong>
            </div>
            <div className="status-row">
              <span>Total controles</span>
              <strong>{bestEmployee?.total ?? 0}</strong>
            </div>
            <div className="status-row">
              <span>Objectif mensuel</span>
              <strong>{balisageObjective}</strong>
            </div>
          </div>
        </article>

        <article className="dashboard-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="panel-kicker">Periodes</p>
              <h2>Mois disponibles</h2>
            </div>
          </div>
          <div className="week-chip-row">
            {balisageMonths.map((month) => (
              <button
                key={month.id}
                type="button"
                className={`week-chip${month.id === activeMonth.id ? " week-chip-active" : ""}`}
                onClick={() =>
                  setActiveMonthIndex(
                    balisageMonths.findIndex((item) => item.id === month.id),
                  )
                }
              >
                {month.label}
              </button>
            ))}
          </div>
        </article>
      </div>

      <article className="module-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="panel-kicker">Vue equipe</p>
            <h2>Tableau mensuel editable</h2>
          </div>
        </div>
        <div className="stats-table-wrap">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Employe</th>
                <th>Total</th>
                <th>Avancement</th>
                <th>Taux erreur</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedStats.map((employee) => {
                const progress = getProgress(employee.total);
                const status = getStatus(employee.total);
                return (
                  <tr key={employee.name}>
                    <td>{employee.name}</td>
                    <td>{employee.total}</td>
                    <td>
                      <div className="stats-progress-cell">
                        <div className="stats-progress-bar">
                          <div
                            className="stats-progress-fill"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span>{progress}%</span>
                      </div>
                    </td>
                    <td>
                      {employee.errorRate === null ? "-" : `${employee.errorRate}%`}
                    </td>
                    <td>
                      <span
                        className={`mini-badge ${
                          status === "OK"
                            ? "mini-badge-ok"
                            : status === "En retard"
                              ? "mini-badge-warn"
                              : "mini-badge-alert"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="week-chip"
                        onClick={() => openEdit(employee)}
                      >
                        Editer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      {editingName ? (
        <div className="planning-modal-overlay" role="presentation" onClick={() => setEditingName(null)}>
          <div
            className="planning-modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="panel-kicker">Edition balisage</p>
            <h2>{editingName}</h2>
            <label className="planning-select-field">
              <span>Total controles</span>
              <input
                value={editingTotal}
                onChange={(event) => setEditingTotal(event.target.value)}
                className="absences-input"
                type="number"
                min={0}
              />
            </label>
            <label className="planning-select-field" style={{ marginTop: 10 }}>
              <span>Taux erreur (%)</span>
              <input
                value={editingErrorRate}
                onChange={(event) => setEditingErrorRate(event.target.value)}
                className="absences-input"
                type="number"
                min={0}
                step="0.1"
                placeholder="Laisser vide si inconnu"
              />
            </label>
            <div className="planning-modal-actions">
              <button type="button" className="week-chip" onClick={() => setEditingName(null)}>
                Annuler
              </button>
              <button type="button" className="week-chip week-chip-active" onClick={saveEdit}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
