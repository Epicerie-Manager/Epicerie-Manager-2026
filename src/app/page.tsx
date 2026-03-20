import packageJson from "../../package.json";
import { Card } from "@/components/ui/card";
import { NavCard } from "@/components/ui/nav-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { moduleThemes } from "@/lib/theme";

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
  { title: "Planning", detail: "Horaires et presences", href: "/planning" },
  { title: "Plan TG", detail: "Mecaniques rayon", href: "/plan-tg" },
  { title: "Plateaux", detail: "Implantations terrain", href: "/plan-plateau" },
  { title: "Balisage", detail: "Controle etiquetage", href: "/stats" },
  { title: "Absences", detail: "Demandes et validation", href: "/absences" },
  { title: "Infos", detail: "Base documentaire", href: "/infos" },
];

const operations = [
  { title: "Chocolat de Paques", detail: "Plateau A", tone: "redline" },
  { title: "Foire au vin", detail: "Plateau A", tone: "blueline" },
  { title: "Jardin", detail: "Plateau B", tone: "greenline" },
  { title: "Little Italy", detail: "Plateau C/D", tone: "orangeline" },
];

export default function Home() {
  const dashboardTheme = moduleThemes.dashboard;

  return (
    <section className="manager-dashboard-final module-theme-home">
      <Card
        className="manager-hero"
        style={{
          background: dashboardTheme.gradient,
          borderColor: dashboardTheme.medium,
        }}
      >
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
      </Card>

      <div className="manager-layout">
        <div className="manager-column">
          <Card className="card-final">
            <SectionHeader
              moduleKey="dashboard"
              kicker="Equipe"
              title="Presences du jour"
              description="Vision immediate des effectifs et des points a verifier."
            />

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
          </Card>

          <Card className="card-final">
            <SectionHeader
              moduleKey="dashboard"
              kicker="Navigation"
              title="Acces modules"
            />

            <div className="manager-nav-grid">
              {modules.map((module) => (
                <NavCard
                  key={module.title}
                  moduleKey={
                    module.title === "Planning"
                      ? "planning"
                      : module.title === "Plan TG"
                        ? "plantg"
                        : module.title === "Plateaux"
                          ? "plateau"
                          : module.title === "Absences"
                            ? "absences"
                            : module.title === "Infos"
                              ? "infos"
                              : "balisage"
                  }
                  title={module.title}
                  description={module.detail}
                  href={module.href}
                />
              ))}
            </div>
          </Card>
        </div>

        <div className="manager-column">
          <Card className="card-final">
            <SectionHeader
              moduleKey="dashboard"
              kicker="Priorites"
              title="Alertes a lire en premier"
            />

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
          </Card>

          <Card className="card-final">
            <SectionHeader
              moduleKey="dashboard"
              kicker="Semaine"
              title="Effectifs par jour"
            />

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
          </Card>
        </div>

        <div className="manager-column">
          <Card className="card-final">
            <SectionHeader
              moduleKey="dashboard"
              kicker="Consigne"
              title="Note du jour"
            />
            <div className="manager-item manager-item-red">
              <strong>Implantation chocolat Paques</strong>
              <span className="manager-muted">
                A diffuser a l&apos;ouverture a toute l&apos;equipe.
              </span>
            </div>
          </Card>

          <Card className="card-final">
            <SectionHeader
              moduleKey="dashboard"
              kicker="Suivi"
              title="Balisage"
            />

            <div className="manager-summary-figure">
              <strong>312 / 800</strong>
              <span className="manager-muted">
                39% atteint · Taux erreur 4.2%
              </span>
              <ProgressBar value={39} color="#d97f00" />
            </div>
          </Card>

          <Card className="card-final">
            <SectionHeader
              moduleKey="dashboard"
              kicker="Operations"
              title="Chantiers terrain"
            />

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
          </Card>
        </div>
      </div>
    </section>
  );
}
