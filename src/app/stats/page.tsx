import { balisageData, balisageMonths, balisageObjective } from "@/lib/balisage-data";

const activeMonth = balisageMonths[0];
const activeStats = balisageData[activeMonth.id];

const totalControls = activeStats.reduce((sum, item) => sum + item.total, 0);
const employeesOk = activeStats.filter((item) => item.total >= balisageObjective).length;
const employeesAlert = activeStats.filter((item) => item.total < balisageObjective * 0.5).length;
const bestEmployee = [...activeStats].sort((a, b) => b.total - a.total)[0];

function getProgress(total: number) {
  return Math.min(Math.round((total / balisageObjective) * 100), 100);
}

function getStatus(total: number) {
  if (total >= balisageObjective) return "OK";
  if (total >= balisageObjective * 0.5) return "En retard";
  return "Alerte";
}

export default function StatsPage() {
  return (
    <section className="module-layout">
      <header className="module-hero">
        <p className="eyebrow">Module V1</p>
        <h1>Stats balisage</h1>
        <p>
          Cette page reprend la logique dashboard des maquettes : synthese du
          mois, classement rapide et tableau par employe avec lecture manager.
        </p>
      </header>

      <div className="planning-summary-grid">
        <article className="module-card">
          <p className="panel-kicker">Mois actif</p>
          <h2>{activeMonth.label}</h2>
          <p>Base actuelle de lecture pour la manager.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Total controles</p>
          <h2>{totalControls}</h2>
          <p>Somme des controles du mois charge.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Employes OK</p>
          <h2>{employeesOk}</h2>
          <p>Ont atteint ou depasse l&apos;objectif de {balisageObjective}.</p>
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
              <strong>{bestEmployee.name}</strong>
            </div>
            <div className="status-row">
              <span>Total controles</span>
              <strong>{bestEmployee.total}</strong>
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
            {balisageMonths.map((month, index) => (
              <div
                key={month.id}
                className={`week-chip${index === 0 ? " week-chip-active" : ""}`}
              >
                {month.label}
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="module-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="panel-kicker">Vue equipe</p>
            <h2>Tableau mensuel</h2>
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
              </tr>
            </thead>
            <tbody>
              {activeStats.map((employee) => {
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
