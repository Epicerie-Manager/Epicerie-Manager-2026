import Link from "next/link";
import packageJson from "../../package.json";

const todayLabel = "Vendredi 20 mars 2026";

const presenceStats = [
  { label: "Matin", value: 11, tone: "success" },
  { label: "Apres-midi", value: 2, tone: "secondary" },
  { label: "Etudiants", value: 0, tone: "neutral" },
];

const absences = ["KAMAR", "LIYAKATH", "KHANH"];
const triCaddie = ["JEREMY", "KAMEL"];

const alerts = [
  {
    title: "Lundi 23 mars : seulement 7 presents matin",
    module: "Planning",
    tone: "warn",
  },
  {
    title: "3 controles balisage en retard ce mois",
    module: "Balisage",
    tone: "alert",
  },
  {
    title: "Nouveau plan plateau Mars 4 disponible",
    module: "Plateau",
    tone: "info",
  },
];

const weekStats = [
  { day: "Lun", value: 11 },
  { day: "Mar", value: 10 },
  { day: "Mer", value: 9 },
  { day: "Jeu", value: 10 },
  { day: "Ven", value: 10, active: true },
  { day: "Sam", value: 13 },
];

const operations = [
  { title: "Chocolat de Paques", detail: "Plateau A · Entree mag", tone: "red" },
  { title: "Foire au vin", detail: "Plateau A · Allee centrale", tone: "blue" },
  { title: "Jardin", detail: "Plateau B · Cote ecolier", tone: "green" },
  { title: "Little Italy", detail: "Plateau C/D · Zone centrale", tone: "orange" },
];

const shortcuts = [
  {
    title: "Planning",
    detail: "Horaires, presences, repos",
    href: "/planning",
    icon: "Planning",
  },
  {
    title: "Plan TG",
    detail: "Tetes de gondole par rayon",
    href: "/plan-tg",
    icon: "TG",
  },
  {
    title: "Plans plateau",
    detail: "Implantations A/B/C/D",
    href: "/plan-plateau",
    icon: "Plateau",
  },
  {
    title: "Balisage",
    detail: "Controles et suivi erreurs",
    href: "/stats",
    icon: "OK",
  },
];

export default function Home() {
  return (
    <section className="manager-dashboard">
      <header className="dashboard-topbar dashboard-card">
        <div>
          <p className="eyebrow">Tableau de bord manager</p>
          <h1>Vue du jour</h1>
          <p className="dashboard-topbar-text">
            Priorites du matin, alertes et acces modules en un seul ecran.
          </p>
        </div>
        <div className="dashboard-topbar-side">
          <span className="dashboard-date-pill">{todayLabel}</span>
          <span className="version-badge version-badge-soft">
            version {packageJson.version}
          </span>
        </div>
      </header>

      <section className="dashboard-row dashboard-row-top">
        <article className="dashboard-card manager-panel">
          <div className="manager-panel-head">
            <div className="panel-icon-badge">Equipe</div>
            <div>
              <h2>Presences aujourd&apos;hui</h2>
            </div>
          </div>

          <div className="presence-grid">
            {presenceStats.map((item) => (
              <div
                key={item.label}
                className={`presence-stat presence-stat-${item.tone}`}
              >
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="manager-mini-box manager-mini-box-warn">
            <p className="manager-mini-label">Absents ({absences.length})</p>
            <div className="tag-row">
              {absences.map((name) => (
                <span key={name} className="soft-tag soft-tag-warn">
                  {name}
                </span>
              ))}
            </div>
          </div>

          <div className="manager-inline-row">
            <span className="manager-inline-label">Tri caddie</span>
            <div className="tag-row">
              {triCaddie.map((name) => (
                <span key={name} className="soft-tag soft-tag-alert">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </article>

        <article className="dashboard-card manager-panel">
          <div className="manager-panel-head">
            <div className="panel-icon-badge">Alertes</div>
            <div>
              <h2>Alertes</h2>
              <p>{alerts.length} notifications</p>
            </div>
          </div>

          <div className="alert-stack">
            {alerts.map((alert) => (
              <div
                key={alert.title}
                className={`alert-item alert-item-${alert.tone}`}
              >
                <strong>{alert.title}</strong>
                <span>{alert.module}</span>
              </div>
            ))}
          </div>
        </article>

        <div className="dashboard-side-stack">
          <article className="dashboard-card manager-panel manager-panel-tight">
            <div className="manager-panel-head">
              <div className="panel-icon-badge">Note</div>
              <div>
                <h2>Note du jour</h2>
              </div>
            </div>
            <div className="headline-note">Implantation chocolat Paques</div>
          </article>

          <article className="dashboard-card manager-panel manager-panel-tight">
            <div className="manager-panel-head">
              <div className="panel-icon-badge">Balisage</div>
              <div>
                <h2>Controle balisage</h2>
                <p>Mars</p>
              </div>
            </div>

            <div className="balisage-summary">
              <div>
                <strong>312</strong>
                <span>/ 800 objectif</span>
              </div>
              <div className="balisage-aside">
                <strong>39%</strong>
                <span>Taux erreur : 4.2%</span>
              </div>
            </div>

            <div className="balisage-bar">
              <div className="balisage-bar-fill" style={{ width: "39%" }} />
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-row dashboard-row-middle">
        <article className="dashboard-card manager-panel">
          <div className="manager-panel-head">
            <div className="panel-icon-badge">Semaine</div>
            <div>
              <h2>Semaine en cours</h2>
              <p>Effectifs par jour</p>
            </div>
          </div>

          <div className="week-stats-grid">
            {weekStats.map((item) => (
              <div
                key={item.day}
                className={`week-stat-card${item.active ? " week-stat-card-active" : ""}`}
              >
                <span>{item.day}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-card manager-panel">
          <div className="manager-panel-head">
            <div className="panel-icon-badge">Ops</div>
            <div>
              <h2>Operations en cours</h2>
              <p>Cette semaine</p>
            </div>
          </div>

          <div className="operations-list">
            {operations.map((operation) => (
              <div
                key={operation.title}
                className={`operation-card operation-card-${operation.tone}`}
              >
                <strong>{operation.title}</strong>
                <span>{operation.detail}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-row">
        <article className="dashboard-card manager-panel">
          <div className="section-heading compact-heading">
            <div>
              <p className="panel-kicker">Acces rapide</p>
              <h2>Tous les modules</h2>
            </div>
            <div className="hero-actions hero-actions-compact">
              <Link href="/planning" className="action action-primary">
                Ouvrir le planning
              </Link>
              <Link href="/plan-tg" className="action action-secondary">
                Voir le plan TG
              </Link>
            </div>
          </div>

          <div className="dashboard-shortcut-grid">
            {shortcuts.map((item) => (
              <Link key={item.href} href={item.href} className="dashboard-shortcut-card">
                <span className="dashboard-shortcut-icon">{item.icon}</span>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}
