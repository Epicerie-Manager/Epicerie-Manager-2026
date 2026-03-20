import packageJson from "../../package.json";

const teamStats = [
  { label: "Matin", value: 11, tone: "green" },
  { label: "Apres-midi", value: 2, tone: "blue" },
  { label: "Etudiants", value: 0, tone: "gray" },
];

const alerts = [
  {
    title: "Seulement 7 presents lundi matin",
    module: "Planning",
    tone: "yellow",
  },
  {
    title: "3 controles balisage en retard",
    module: "Balisage",
    tone: "red",
  },
  {
    title: "Nouveau plan plateau disponible",
    module: "Plateau",
    tone: "blue",
  },
];

const weekStats = [
  { label: "Lun", value: 11 },
  { label: "Mar", value: 10 },
  { label: "Mer", value: 9 },
  { label: "Jeu", value: 10 },
  { label: "Ven", value: 10, active: true },
  { label: "Sam", value: 13 },
];

const modules = [
  { title: "Planning", detail: "Horaires et presences" },
  { title: "Plan TG", detail: "Mecaniques rayon" },
  { title: "Plateaux", detail: "Implantations terrain" },
  { title: "Stats", detail: "Balisage et suivi" },
];

const operations = [
  { title: "Chocolat de Paques", detail: "Plateau A", tone: "redline" },
  { title: "Foire au vin", detail: "Plateau A", tone: "blueline" },
  { title: "Jardin", detail: "Plateau B", tone: "greenline" },
  { title: "Little Italy", detail: "Plateau C/D", tone: "orangeline" },
];

export default function Home() {
  return (
    <section className="manager-dashboard-final">
      <header className="manager-hero card-final">
        <div>
          <span className="manager-eyebrow">Epicerie manager 2026</span>
          <h1>Dashboard manager colonne centrale</h1>
          <p>
            Version de reference pour la suite : lisible, aeree et pensee pour
            une lecture manager en un coup d&apos;oeil.
          </p>
        </div>

        <div className="manager-hero-pills">
          <span className="manager-pill">Vendredi 20 mars 2026</span>
          <span className="manager-pill">11 presents matin</span>
          <span className="manager-pill">3 alertes</span>
          <span className="manager-pill manager-pill-version">
            v{packageJson.version}
          </span>
        </div>
      </header>

      <div className="manager-layout">
        <div className="manager-column">
          <article className="card-final">
            <span className="manager-section-kicker">Equipe</span>
            <h2>Presences du jour</h2>
            <p className="manager-muted">
              Vision immediate des effectifs et des points a verifier.
            </p>

            <div className="manager-kpi-line">
              {teamStats.map((item) => (
                <div
                  key={item.label}
                  className={`manager-kpi manager-kpi-${item.tone}`}
                >
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="manager-box manager-box-yellow">
              <strong>Absents : Kamar, Liyakath, Khanh</strong>
            </div>
            <div className="manager-box">
              <strong>Tri caddie : Jeremy, Kamel</strong>
            </div>
          </article>

          <article className="card-final">
            <span className="manager-section-kicker">Navigation</span>
            <h2>Acces modules</h2>

            <div className="manager-nav-grid">
              {modules.map((module) => (
                <div key={module.title} className="manager-nav-card">
                  <b>{module.title}</b>
                  <span className="manager-muted">{module.detail}</span>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="manager-column">
          <article className="card-final">
            <span className="manager-section-kicker">Priorites</span>
            <h2>Alertes a lire en premier</h2>

            <div className="manager-list">
              {alerts.map((alert) => (
                <div
                  key={alert.title}
                  className={`manager-item manager-item-${alert.tone}`}
                >
                  <strong>{alert.title}</strong>
                  <span className="manager-muted">{alert.module}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card-final">
            <span className="manager-section-kicker">Semaine</span>
            <h2>Effectifs par jour</h2>

            <div className="manager-week-grid">
              {weekStats.map((day) => (
                <div
                  key={day.label}
                  className={`manager-week-card${day.active ? " manager-week-card-active" : ""}`}
                >
                  <small>{day.label}</small>
                  <strong>{day.value}</strong>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="manager-column">
          <article className="card-final">
            <span className="manager-section-kicker">Consigne</span>
            <h2>Note du jour</h2>
            <div className="manager-item manager-item-red">
              <strong>Implantation chocolat Paques</strong>
              <span className="manager-muted">
                A diffuser a l&apos;ouverture a toute l&apos;equipe.
              </span>
            </div>
          </article>

          <article className="card-final">
            <span className="manager-section-kicker">Suivi</span>
            <h2>Balisage</h2>

            <div className="manager-summary-figure">
              <strong>312 / 800</strong>
              <span className="manager-muted">
                39% atteint · Taux erreur 4.2%
              </span>
              <div className="manager-summary-progress">
                <div />
              </div>
            </div>
          </article>

          <article className="card-final">
            <span className="manager-section-kicker">Operations</span>
            <h2>Chantiers terrain</h2>

            <div className="manager-compact-list">
              {operations.map((operation) => (
                <div
                  key={operation.title}
                  className={`manager-item manager-item-line ${operation.tone}`}
                >
                  <strong>{operation.title}</strong>
                  <span className="manager-muted">{operation.detail}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
