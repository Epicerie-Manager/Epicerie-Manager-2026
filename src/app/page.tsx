import Link from "next/link";

export default function Home() {
  return (
    <section className="hero-grid">
      <div className="hero-card hero-primary">
        <p className="eyebrow">Base du projet</p>
        <h1>Une vraie application remplace maintenant le Google Site.</h1>
        <p className="hero-copy">
          Cette premiere base sert a poser la navigation, les modules metier et
          la structure qui accueillera ensuite les donnees reelles.
        </p>
        <div className="hero-actions">
          <Link href="/planning" className="action action-primary">
            Ouvrir le planning
          </Link>
          <Link href="/stats" className="action action-secondary">
            Voir les stats
          </Link>
        </div>
      </div>

      <div className="hero-card hero-side">
        <p className="eyebrow">Etat actuel</p>
        <ul className="status-list">
          <li>Structure Next.js en place</li>
          <li>Navigation V1 preparee</li>
          <li>Modules principaux crees</li>
          <li>Prochaine etape : brancher les donnees</li>
        </ul>
      </div>

      <div className="panel-grid">
        <article className="panel-card">
          <p className="panel-kicker">V1</p>
          <h2>Consulter facilement</h2>
          <p>
            Planning, plans TG, plans plateau et stats balisage depuis une
            interface simple et mobile.
          </p>
        </article>
        <article className="panel-card">
          <p className="panel-kicker">V2</p>
          <h2>Gerer les demandes</h2>
          <p>
            Demandes d&apos;absence, validation manager et historique centralise.
          </p>
        </article>
        <article className="panel-card">
          <p className="panel-kicker">V3</p>
          <h2>Piloter le terrain</h2>
          <p>
            Audits terrain, comptes-rendus et suivi des actions correctives.
          </p>
        </article>
      </div>
    </section>
  );
}
