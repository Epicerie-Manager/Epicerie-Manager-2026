import { planningDays, planningEmployees } from "@/lib/planning-data";

export default function PlanningPage() {
  const highlightedEmployee = planningEmployees[0];

  return (
    <section className="module-layout">
      <header className="module-hero">
        <p className="eyebrow">Module V1</p>
        <h1>Planning</h1>
        <p>
          Cette premiere version affiche deja de vraies donnees issues du
          planning de mars 2026. L&apos;objectif maintenant sera d&apos;automatiser
          l&apos;import complet du fichier et d&apos;ajouter les filtres dynamiques.
        </p>
      </header>

      <div className="planning-summary-grid">
        <article className="module-card">
          <p className="panel-kicker">Periode chargee</p>
          <h2>Mars 2026</h2>
          <p>
            11 jours de planning reels ont ete prepares pour lancer le module.
          </p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Collaborateurs visibles</p>
          <h2>{planningEmployees.length} profils</h2>
          <p>
            Le jeu de donnees actuel couvre deja plusieurs cas : horaires,
            repos, CP, RH, ferie et conges longs.
          </p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Priorite suivante</p>
          <h2>Importer le fichier complet</h2>
          <p>
            Une fois la lecture automatique en place, cette page deviendra la
            vraie vue collaborateur / manager.
          </p>
        </article>
      </div>

      <div className="planning-employee-strip">
        {planningEmployees.map((employee) => (
          <article
            key={employee.id}
            className={`employee-chip${employee.id === highlightedEmployee.id ? " employee-chip-active" : ""}`}
          >
            <strong>{employee.name}</strong>
            <span>{employee.role}</span>
          </article>
        ))}
      </div>

      <div className="planning-layout-grid">
        <article className="module-card">
          <p className="panel-kicker">Focus collaborateur</p>
          <h2>{highlightedEmployee.name}</h2>
          <p>
            Horaire standard : {highlightedEmployee.standardShift}
            <br />
            Mardi : {highlightedEmployee.tuesdayShift}
          </p>
          {highlightedEmployee.note ? <p>{highlightedEmployee.note}</p> : null}
          <ul>
            {planningDays.slice(0, 6).map((day) => (
              <li key={day.date}>
                {day.dayLabel} {new Date(day.date).toLocaleDateString("fr-FR")} :{" "}
                {day.assignments[highlightedEmployee.id]}
              </li>
            ))}
          </ul>
        </article>

        <article className="module-card">
          <p className="panel-kicker">Lecture manager</p>
          <h2>Synthese de periode</h2>
          <ul>
            {planningDays.slice(0, 6).map((day) => (
              <li key={`${day.date}-manager`}>
                {day.dayLabel} {new Date(day.date).toLocaleDateString("fr-FR")} : matin {day.morningPresent} / statut {day.morningStatus}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <article className="module-card">
        <p className="panel-kicker">Vue planning</p>
        <h2>Semaine et debut de mois</h2>
        <div className="planning-table-wrap">
          <table className="planning-table">
            <thead>
              <tr>
                <th>Jour</th>
                <th>Date</th>
                <th>Matin</th>
                {planningEmployees.map((employee) => (
                  <th key={employee.id}>{employee.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planningDays.map((day) => (
                <tr key={day.date}>
                  <td>{day.dayLabel}</td>
                  <td>{new Date(day.date).toLocaleDateString("fr-FR")}</td>
                  <td>
                    {day.morningPresent}
                    <span className="planning-cell-note">statut {day.morningStatus}</span>
                  </td>
                  {planningEmployees.map((employee) => (
                    <td key={`${day.date}-${employee.id}`}>
                      {day.assignments[employee.id] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
