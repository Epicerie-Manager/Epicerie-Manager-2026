import Link from "next/link";
import packageJson from "../../package.json";

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

const focusItems = [
  "Pilotage planning sur PC et tablette",
  "Centralisation des donnees aujourd&apos;hui dispersees",
  "Base solide pour les absences et l&apos;audit terrain",
];

const projectStatus = [
  { label: "Base applicative", value: "Operationnelle" },
  { label: "Module planning", value: "En construction" },
  { label: "Import Excel automatique", value: "Etape suivante" },
  { label: "Hebergement", value: "Plus tard" },
];

export default function Home() {
  return (
    <section className="dashboard-layout">
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

      <section className="dashboard-grid dashboard-grid-main">
        <article className="dashboard-card dashboard-section-wide">
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

        <article className="dashboard-card dashboard-side-panel">
          <p className="panel-kicker">Fil rouge</p>
          <h2>Ce que doit reussir la V1</h2>
          <ul className="focus-list">
            {focusItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid-bottom">
        <article className="dashboard-card">
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
              <p className="panel-kicker">Vision produit</p>
              <h2>Phases du projet</h2>
            </div>
          </div>
          <div className="phase-list">
            <div className="phase-item">
              <span>V1</span>
              <p>Consulter planning, TG, plateaux et stats.</p>
            </div>
            <div className="phase-item">
              <span>V2</span>
              <p>Gerer les demandes d&apos;absence et leur suivi.</p>
            </div>
            <div className="phase-item">
              <span>V3</span>
              <p>Piloter le terrain avec les audits et comptes-rendus.</p>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}
