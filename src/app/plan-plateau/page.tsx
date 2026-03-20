import { ModuleHeader } from "@/components/layout/module-header";
import {
  plateauMonths,
  plateauOperationsByMonth,
  plateauWeeks,
} from "@/lib/plateau-data";

const activeMonth = plateauMonths[0];
const activeWeeks = plateauWeeks.filter((week) => week.monthId === activeMonth.id);
const highlightedWeek = activeWeeks[0];
const archivedMonths = plateauMonths.filter((month) => month.status === "Archive").length;
const totalZones = highlightedWeek.zones.length;
const monthlyOperations = plateauOperationsByMonth[activeMonth.id] ?? {};

export default function PlanPlateauPage() {
  return (
    <section className="module-layout module-theme-plateau">
      <ModuleHeader
        moduleKey="plateau"
        title="Plan Plateau"
        description="Cette version remplace le simple lien PDF par une lecture plus exploitable : mois visible, semaines reperables tout de suite et detail des plateaux A a D pour guider la preparation terrain."
      />

      <div className="planning-summary-grid">
        <article className="module-card">
          <p className="panel-kicker">Mois actif</p>
          <h2>{activeMonth.label}</h2>
          <p>Base de lecture actuelle pour preparer les mises en place terrain.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Semaines chargees</p>
          <h2>{activeWeeks.length}</h2>
          <p>Decoupage pense pour retrouver vite la bonne periode.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Zones suivies</p>
          <h2>{totalZones} plateaux</h2>
          <p>Lecture immediate des zones A, B, C et D.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Archives</p>
          <h2>{archivedMonths} mois</h2>
          <p>Le PDF mensuel reste la source de reference tant que l&apos;import n&apos;est pas automatise.</p>
        </article>
      </div>

      <div className="dashboard-grid dashboard-grid-bottom">
        <article className="dashboard-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="panel-kicker">Periodes</p>
              <h2>Mois disponibles</h2>
            </div>
          </div>
          <div className="week-chip-row">
            {plateauMonths.map((month, index) => (
              <div
                key={month.id}
                className={`week-chip${index === 0 ? " week-chip-active" : ""}`}
              >
                {month.label}
              </div>
            ))}
          </div>
          <p className="plateau-inline-note">
            Source actuelle: {activeMonth.pdfLabel}.
          </p>
        </article>

        <article className="dashboard-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="panel-kicker">Semaine focus</p>
              <h2>{highlightedWeek.label}</h2>
            </div>
          </div>
          <div className="status-grid">
            <div className="status-row">
              <span>Periode</span>
              <strong>{highlightedWeek.dateRange}</strong>
            </div>
            <div className="status-row">
              <span>Theme</span>
              <strong>{highlightedWeek.theme}</strong>
            </div>
            <div className="status-row">
              <span>Priorite manager</span>
              <strong>{highlightedWeek.priority}</strong>
            </div>
          </div>
        </article>
      </div>

      <article className="module-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="panel-kicker">Navigation hebdo</p>
            <h2>Semaines du mois</h2>
          </div>
        </div>
        <div className="plateau-week-list">
          {activeWeeks.map((week, index) => (
            <div
              key={week.id}
              className={`plateau-week-card${index === 0 ? " plateau-week-card-active" : ""}`}
            >
              <div className="plateau-week-head">
                <div>
                  <strong>{week.label}</strong>
                  <span>{week.dateRange}</span>
                </div>
                <span className="mini-badge mini-badge-ok">{week.zones.length} zones</span>
              </div>
              <p>{week.theme}</p>
              <p className="plateau-inline-note">Priorite: {week.priority}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="module-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="panel-kicker">Recap plateau</p>
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

      <div className="plateau-grid">
        {highlightedWeek.zones.map((zone) => (
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
            <p className="panel-kicker">Suite logique</p>
            <h2>Ce que ce module prepare</h2>
          </div>
        </div>
        <div className="shortcut-grid plateau-next-grid">
          <div className="shortcut-card">
            <span className="shortcut-value">Etape 1</span>
            <h3>Acces lisible au PDF</h3>
            <p>
              La structure par mois et semaine sert de passerelle avant un vrai
              import des plateaux.
            </p>
          </div>
          <div className="shortcut-card">
            <span className="shortcut-value">Etape 2</span>
            <h3>Version mobile propre</h3>
            <p>
              Les responsables terrain peuvent retrouver rapidement leur zone
              sans zoomer dans un document brut.
            </p>
          </div>
          <div className="shortcut-card">
            <span className="shortcut-value">Etape 3</span>
            <h3>Import structure plus tard</h3>
            <p>
              Quand le PDF sera mieux exploite, on pourra filtrer par plateau,
              responsable et semaine reelle.
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}
