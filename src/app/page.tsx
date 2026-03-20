import Link from "next/link";
import packageJson from "../../package.json";

const dashboardKpis = [
  {
    label: "Equipe attendue ce matin",
    value: "9 presents",
    detail: "2 absences et 1 conge long a surveiller",
  },
  {
    label: "Operations terrain",
    value: "4 priorites",
    detail: "TG, plateaux et balisage a suivre aujourd'hui",
  },
  {
    label: "Controle balisage",
    value: "312 / 800",
    detail: "39% de l'objectif mensuel atteint",
  },
  {
    label: "Point manager",
    value: "3 alertes",
    detail: "Actions a lire avant l'ouverture",
  },
];

const shortcuts = [
  {
    title: "Planning equipe",
    value: "7 profils",
    href: "/planning",
    description: "Consulter les horaires, repos et statuts de la semaine.",
  },
  {
    title: "Plan TG / GB",
    value: "1 module actif",
    href: "/plan-tg",
    description: "Retrouver les actions par semaine, rayon et responsable.",
  },
  {
    title: "Plateaux",
    value: "PDF mensuel",
    href: "/plan-plateau",
    description: "Acceder rapidement aux plans terrain par periode.",
  },
  {
    title: "Stats balisage",
    value: "Suivi mensuel",
    href: "/stats",
    description: "Visualiser l&apos;avancement et les alertes de l&apos;equipe.",
  },
];

const morningAlerts = [
  {
    title: "Effectif matin a confirmer",
    text: "Jeremy est en absence, Kamar reste a verifier avant la prise de poste.",
    tone: "alert",
  },
  {
    title: "Plan TG semaine 10 actif",
    text: "4 lignes TG et 2 lignes GB sont a repartir avant le pic de flux.",
    tone: "info",
  },
  {
    title: "Plateau A prioritaire",
    text: "Le bloc pates / sauces doit etre remis au propre des ce matin.",
    tone: "warn",
  },
];

const dayChecklist = [
  "Verifier les absences et les remplacements",
  "Confirmer les priorites plateau avant 9h",
  "Relancer le balisage en retard sur les zones critiques",
  "Partager la priorite TG du jour avec l'equipe",
];

const planningSnapshot = [
  { day: "Lun", value: "9", meta: "matin" },
  { day: "Mar", value: "10", meta: "matin" },
  { day: "Mer", value: "10", meta: "matin" },
  { day: "Jeu", value: "9", meta: "matin" },
  { day: "Ven", value: "9", meta: "matin" },
  { day: "Sam", value: "8", meta: "matin" },
];

const projectFocusItems = [
  "Pilotage planning sur PC et tablette",
  "Centralisation des donnees aujourd'hui dispersees",
  "Base solide pour les absences et l'audit terrain",
];

const projectStatus = [
  { label: "Base applicative", value: "Operationnelle" },
  { label: "Module planning", value: "En construction" },
  { label: "Import Excel automatique", value: "Etape suivante" },
  { label: "Hebergement", value: "Plus tard" },
];

export default function Home() {
  return (
    <section className="dashboard-layout dashboard-layout-compact">
      <header className="dashboard-hero dashboard-card">
        <div className="dashboard-hero-copy">
          <p className="eyebrow">Tableau de bord manager</p>
          <h1>Epicerie Villebon 2</h1>
          <p className="dashboard-intro">
            Une base de pilotage plus propre que le Google Site, pensee pour la
            gestion quotidienne sur PC et tablette.
          </p>
        </div>

        <div className="dashboard-highlight">
          <div className="highlight-top-row">
            <div className="highlight-badge">V1 en preparation</div>
            <span className="version-badge version-badge-soft">
              version {packageJson.version}
            </span>
          </div>
          <strong>Objectif prioritaire</strong>
          <p>
            Rendre le planning, les plans TG, les plateaux et les stats plus
            clairs, plus rapides a consulter et plus simples a faire evoluer.
          </p>
          <div className="hero-actions">
            <Link href="/planning" className="action action-primary">
              Ouvrir le planning
            </Link>
            <Link href="/plan-tg" className="action action-secondary">
              Voir le plan TG
            </Link>
          </div>
        </div>
      </header>

      <section className="dashboard-kpi-grid">
        {dashboardKpis.map((item) => (
          <article key={item.label} className="dashboard-card dashboard-kpi-card dashboard-card-dense">
            <p className="panel-kicker">{item.label}</p>
            <h2>{item.value}</h2>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-grid dashboard-grid-main dashboard-grid-main-compact">
        <article className="dashboard-card dashboard-section-wide dashboard-card-dense">
          <div className="section-heading">
            <div>
              <p className="panel-kicker">Acces rapide</p>
              <h2>Modules principaux</h2>
            </div>
            <p className="section-note">
              Les raccourcis ci-dessous serviront de point d&apos;entree principal
              pour la manager.
            </p>
          </div>

          <div className="shortcut-grid">
            {shortcuts.map((item) => (
              <Link key={item.href} href={item.href} className="shortcut-card">
                <span className="shortcut-value">{item.value}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </Link>
            ))}
          </div>
        </article>

        <article className="dashboard-card dashboard-side-panel dashboard-card-dense">
          <p className="panel-kicker">Rappel du jour</p>
          <h2>Check-list manager</h2>
          <ul className="focus-list focus-list-tight">
            {dayChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid-insights dashboard-grid-insights-compact">
        <article className="dashboard-card dashboard-alerts-card dashboard-card-dense">
          <div className="section-heading compact-heading">
            <div>
              <p className="panel-kicker">Brief matinal</p>
              <h2>Alertes a lire en premier</h2>
            </div>
          </div>
          <div className="manager-alert-list">
            {morningAlerts.map((alert) => (
              <div
                key={alert.title}
                className={`manager-alert manager-alert-${alert.tone}`}
              >
                <strong>{alert.title}</strong>
                <p>{alert.text}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-card dashboard-planning-card dashboard-card-dense">
          <div className="section-heading compact-heading">
            <div>
              <p className="panel-kicker">Semaine en cours</p>
              <h2>Effectif matin</h2>
            </div>
            <Link href="/planning" className="dashboard-inline-link">
              Ouvrir le planning
            </Link>
          </div>
          <div className="planning-snapshot-grid">
            {planningSnapshot.map((item, index) => (
              <div
                key={item.day}
                className={`planning-snapshot-card${index === 0 ? " planning-snapshot-card-active" : ""}`}
              >
                <span>{item.day}</span>
                <strong>{item.value}</strong>
                <small>{item.meta}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-card dashboard-card-dense">
          <div className="section-heading compact-heading">
            <div>
              <p className="panel-kicker">Suivi projet</p>
              <h2>Etat actuel</h2>
            </div>
          </div>
          <div className="status-grid">
            {projectStatus.map((item) => (
              <div key={item.label} className="status-row">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="panel-kicker">Fil rouge</p>
              <h2>Ce que doit reussir la V1</h2>
            </div>
          </div>
          <ul className="focus-list">
            {projectFocusItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </section>
  );
}
