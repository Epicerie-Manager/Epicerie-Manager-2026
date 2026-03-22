import packageJson from "../../package.json";
import { Card }        from "@/components/ui/card";
import { Kicker }      from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { ProgressBar } from "@/components/ui/progress-bar";
import { NavCard, NavCardGrid } from "@/components/ui/nav-card";
import AgendaCard from "@/components/dashboard/agenda-card";
import { moduleThemes } from "@/lib/theme";

// ── Données statiques (Mars 2026) ────────────────
const ABSENTS    = ["Kamar", "Liyakath", "Khanh"];
const TRI_CADDIE = ["Jérémy", "Kamel"];
const BINOME     = ["Mohamed", "Kamar"];

const ALERTS = [
  { id: 1, text: "Seulement 7 présents lundi matin", module: "Planning", tone: "yellow" as const },
  { id: 2, text: "3 contrôles balisage en retard",   module: "Balisage", tone: "red"    as const },
  { id: 3, text: "Nouveau plan plateau disponible",  module: "Plateau",  tone: "blue"   as const },
];

const WEEK = [
  { label: "LUN", value: 7,  sub: "⚠ bas",      alert: true  },
  { label: "MAR", value: 10, sub: "OK",          alert: false },
  { label: "MER", value: 9,  sub: "OK",          alert: false },
  { label: "JEU", value: 10, sub: "OK",          alert: false },
  { label: "VEN", value: 11, sub: "Aujourd'hui", active: true },
  { label: "SAM", value: 13, sub: "Renforcé",    alert: false },
];

const BALISAGE_RANK = [
  { name: "Kamel",   total: 721, pct: 90, status: "ok"    as const },
  { name: "Jérémy",  total: 590, pct: 74, status: "ok"    as const },
  { name: "Fatima",  total: 448, pct: 56, status: "warn"  as const },
  { name: "Mohamed", total: 312, pct: 39, status: "alert" as const },
];

const OPERATIONS = [
  { name: "Chocolat de Pâques", detail: "S10→S15 · Zone Sucré", color: "#b91c2e", badge: "Plat. A" },
  { name: "Foire au vin",       detail: "S11→S14 · Zone Salé",  color: "#1d5fa0", badge: "Plat. A" },
  { name: "Jardin / Printemps", detail: "S12→S16 · Zone Mixte", color: "#167a48", badge: "Plat. B" },
  { name: "Little Italy",       detail: "S13→S17 · Zone Salé",  color: "#c05a0c", badge: "Plat. C/D" },
];

// ── Helpers ──────────────────────────────────────
const alertColors = {
  yellow: { bg: "#fffbeb", border: "#fef3c7", dot: "#d97706", text: "#92400e", tag: "#fef3c7" },
  red:    { bg: "#fef2f2", border: "#fee2e2", dot: "#dc2626", text: "#991b1b", tag: "#fee2e2" },
  blue:   { bg: "#eff6ff", border: "#dbeafe", dot: "#2563eb", text: "#1e40af", tag: "#dbeafe" },
};

const statusStyles = {
  ok:    { bg: "#ecfdf5", color: "#065f46", dot: "#16a34a" },
  warn:  { bg: "#fffbeb", color: "#92400e", dot: "#d97706" },
  alert: { bg: "#fef2f2", color: "#991b1b", dot: "#dc2626" },
};

const medals = ["🥇", "🥈", "🥉"];

// ── Icônes SVG inline (strokeWidth 1.8) ──────────
const svgProps = {
  viewBox: "0 0 24 24",
  width: 14, height: 14,
  fill: "none", stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round"  as const,
  strokeLinejoin: "round" as const,
};

const IconUsers      = () => <svg {...svgProps}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
const IconCalendar   = () => <svg {...svgProps}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconShoppingBag= () => <svg {...svgProps}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
const IconMap        = () => <svg {...svgProps}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
const IconCheck      = () => <svg {...svgProps}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconFile       = () => <svg {...svgProps}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IconInfo       = () => <svg {...svgProps}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconAlert      = () => <svg {...svgProps}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>;
const IconPen        = () => <svg {...svgProps}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
const IconTrend      = () => <svg {...svgProps}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IconGrid       = () => <svg {...svgProps}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;

// ── Composants locaux ─────────────────────────────

function Divider() {
  return (
    <div style={{
      height: "1px",
      margin: "14px 0",
      background: "linear-gradient(90deg, transparent, #dbe3eb, transparent)",
    }} />
  );
}

function StatusBox({ children, tone }: { children: React.ReactNode; tone: "yellow" | "neutral" }) {
  const styles = {
    yellow:  { bg: "#fffbeb", border: "#fef3c7", color: "#92400e" },
    neutral: { bg: "#f8fafc", border: "#dbe3eb",  color: "#1e293b" },
  }[tone];
  return (
    <div style={{
      padding: "10px 14px",
      borderRadius: "10px",
      marginBottom: "8px",
      fontSize: "13px",
      fontWeight: 500,
      border: `1px solid ${styles.border}`,
      background: styles.bg,
      color: styles.color,
      lineHeight: 1.45,
    }}>
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────
export default function DashboardPage() {
  const dash  = moduleThemes.dashboard;
  const plan  = moduleThemes.planning;
  const bal   = moduleThemes.balisage;
  const plat  = moduleThemes.plateau;

  return (
    <div>
      {/* ── HERO ─────────────────────────────────── */}
      <div style={{
        margin: "20px 0 16px",
        background: dash.gradient,
        border: `1px solid ${dash.medium}`,
        borderRadius: "20px",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.05)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Reflet */}
        <div aria-hidden style={{
          position: "absolute", inset: "0 0 auto 0", height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)",
          pointerEvents: "none",
        }} />
        <div>
          <span style={{
            display: "inline-block",
            fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em",
            textTransform: "uppercase", color: dash.color,
            background: dash.medium, padding: "3px 9px", borderRadius: "10px",
            marginBottom: "10px",
          }}>
            Épicerie Manager 2026
          </span>
          <h1 style={{
            fontSize: "28px", fontWeight: 700, letterSpacing: "-0.05em",
            color: "#0f172a", lineHeight: 1.15,
          }}>
            Dashboard manager<br />colonne centrale
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "6px" }}>
            Version de référence — lisible, aérée et pensée pour une lecture manager en un coup d&apos;œil.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {[
            { label: "Vendredi 20 mars 2026", color: plan.color,  bg: plan.light,  border: plan.medium },
            { label: "11 présents matin",     color: "#065f46",   bg: "#ecfdf5",   border: "#bbf7d0" },
            { label: "3 alertes",             color: dash.color,  bg: dash.light,  border: dash.medium },
            { label: `v${packageJson.version}`,color: "#64748b", bg: "#f1f5f9",   border: "#dbe3eb" },
          ].map((p) => (
            <span key={p.label} style={{
              fontSize: "12px", fontWeight: 600,
              padding: "6px 13px", borderRadius: "999px",
              background: p.bg, border: `1px solid ${p.border}`,
              color: p.color,
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}>
              {p.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── GRID 3 COL ───────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "0.9fr 1.2fr 0.9fr",
        gap: "14px",
      }}>

        {/* ─── COLONNE GAUCHE ──────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Présences */}
          <Card>
            <Kicker moduleKey="dashboard" label="Équipe" icon={<IconUsers />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Présences du jour</h2>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", marginBottom: "14px" }}>Vision immédiate des effectifs et des points à vérifier.</p>

            <KPIRow>
              <KPI value={11} label="Matin"      moduleKey="planning" icon={<IconUsers />} />
              <KPI value={2}  label="Après-midi" moduleKey="planning" icon={<IconUsers />} />
              <KPI value={0}  label="Étudiants"  moduleKey="balisage" icon={<IconUsers />} size="md" />
            </KPIRow>

            <StatusBox tone="yellow">
              <strong>Absents : </strong>{ABSENTS.join(", ")}
            </StatusBox>
            <StatusBox tone="neutral">
              <strong>Tri caddie : </strong>{TRI_CADDIE.join(", ")}
            </StatusBox>
          </Card>

          {/* Accès modules */}
          <Card>
            <Kicker moduleKey="dashboard" label="Navigation" icon={<IconGrid />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Accès modules</h2>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", marginBottom: "10px" }}>Raccourcis directs</p>

            <NavCardGrid>
              <NavCard moduleKey="planning" title="Planning"  description="Horaires et présences" icon={<IconCalendar />}    href="/planning" />
              <NavCard moduleKey="plantg"   title="Plan TG"   description="Mécaniques rayon"       icon={<IconShoppingBag />} href="/plan-tg"  />
              <NavCard moduleKey="plateau"  title="Plateaux"  description="Implantations terrain"  icon={<IconMap />}         href="/plan-plateau" />
              <NavCard moduleKey="balisage" title="Balisage"  description="Contrôle étiquetage"    icon={<IconCheck />}       href="/stats" />
              <NavCard moduleKey="absences" title="Absences"  description="Demandes et validation"  icon={<IconFile />}        href="/absences" />
              <NavCard moduleKey="infos"    title="Infos"     description="Base documentaire"       icon={<IconInfo />}        href="/infos"    />
            </NavCardGrid>
          </Card>

          {/* Opérations */}
          <Card>
            <Kicker moduleKey="plateau" label="Plateaux" icon={<IconMap />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Chantiers terrain</h2>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", marginBottom: "10px" }}>Mars – Avril 2026</p>

            {OPERATIONS.map((op) => (
              <div key={op.name} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 0", borderBottom: "1px solid #dbe3eb",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "3px", height: "36px", borderRadius: "2px", flexShrink: 0,
                    background: `linear-gradient(180deg, ${op.color}, ${op.color}99)`,
                  }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>{op.name}</div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{op.detail}</div>
                  </div>
                </div>
                <span style={{
                  fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em",
                  textTransform: "uppercase", padding: "3px 8px", borderRadius: "6px",
                  background: `${op.color}18`, color: op.color,
                }}>
                  {op.badge}
                </span>
              </div>
            ))}
            {/* Enlever la bordure du dernier élément */}
            <style>{`div[data-ops-last] { border-bottom: none !important; }`}</style>
          </Card>

        </div>

        {/* ─── COLONNE CENTRE ──────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Alertes */}
          <Card>
            <Kicker moduleKey="dashboard" label="Priorités" icon={<IconAlert />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Alertes à lire en premier</h2>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", marginBottom: "14px" }}>Points qui nécessitent votre attention</p>

            {ALERTS.map((a) => {
              const c = alertColors[a.tone];
              return (
                <div key={a.id} style={{
                  display: "flex", alignItems: "flex-start", gap: "10px",
                  padding: "12px 14px", borderRadius: "10px", marginBottom: "8px",
                  background: c.bg, border: `1px solid ${c.border}`,
                  cursor: "pointer",
                }}>
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: c.dot, flexShrink: 0, marginTop: "5px",
                    boxShadow: `0 0 0 3px ${c.dot}33`,
                  }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: c.text, lineHeight: 1.4 }}>{a.text}</div>
                    <span style={{
                      display: "inline-block", marginTop: "4px",
                      fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em",
                      textTransform: "uppercase", padding: "2px 7px", borderRadius: "6px",
                      background: c.tag, color: c.text,
                    }}>
                      {a.module}
                    </span>
                  </div>
                </div>
              );
            })}
          </Card>

          {/* Semaine */}
          <Card>
            <Kicker moduleKey="planning" label="Semaine" icon={<IconCalendar />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Effectifs par jour</h2>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", marginBottom: "12px" }}>Cliquer sur un jour pour éditer</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px" }}>
              {WEEK.map((d) => (
                <div key={d.label} style={{
                  borderRadius: "12px", padding: "10px 6px", textAlign: "center",
                  border: d.active
                    ? `1px solid ${plan.color}`
                    : "1px solid #dbe3eb",
                  background: d.active
                    ? `linear-gradient(135deg, ${plan.medium}, ${plan.light})`
                    : "white",
                  boxShadow: d.active ? `0 2px 8px ${plan.color}26` : "none",
                  cursor: "pointer",
                }}>
                  <div style={{
                    fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: d.active ? plan.color : "#94a3b8",
                  }}>
                    {d.label}
                  </div>
                  <div style={{
                    fontSize: "22px", fontWeight: 700, letterSpacing: "-0.04em",
                    color: d.active ? plan.color : "#0f172a", marginTop: "2px", lineHeight: 1,
                  }}>
                    {d.value}
                  </div>
                  <div style={{
                    fontSize: "9px", marginTop: "3px",
                    color: (d as { alert?: boolean }).alert ? "#dc2626" : "#64748b",
                    fontWeight: (d as { alert?: boolean }).alert ? 700 : 400,
                  }}>
                    {d.sub}
                  </div>
                </div>
              ))}
            </div>

            <Divider />

            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { label: "Tri caddie", value: TRI_CADDIE.join(" · ") },
                { label: "Binôme repos", value: BINOME.join(" · ") },
              ].map((b) => (
                <div key={b.label} style={{
                  flex: 1,
                  background: plan.light, border: `1px solid ${plan.medium}`,
                  borderRadius: "12px", padding: "10px 14px",
                }}>
                  <div style={{
                    fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.05em", color: plan.color, marginBottom: "4px",
                  }}>
                    {b.label}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>
                    {b.value}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* KPI mensuel */}
          <Card>
            <Kicker moduleKey="planning" label="Indicateurs" icon={<IconTrend />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Vue mensuelle</h2>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", marginBottom: "12px" }}>Mars 2026 — données en cours</p>
            <KPIRow style={{ marginBottom: 0 }}>
              <KPI value="10.2" label="Moy. matin/j"  moduleKey="planning"  icon={<IconTrend />} size="md" />
              <KPI value={2}    label="Jours alerte"  moduleKey="plateau"   icon={<IconAlert />} size="md" />
              <KPI value={14}   label="Effectif actif" moduleKey="plantg"   icon={<IconUsers />} size="md" />
            </KPIRow>
          </Card>

        </div>

        {/* ─── COLONNE DROITE ──────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Note du jour */}
          <Card>
            <Kicker moduleKey="dashboard" label="Consigne" icon={<IconPen />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Note du jour</h2>
            <div style={{
              marginTop: "10px",
              padding: "12px 14px", borderRadius: "12px",
              background: dash.light, border: `1px solid ${dash.medium}`,
              display: "flex", gap: "8px", alignItems: "flex-start",
            }}>
              <span style={{ color: dash.color, flexShrink: 0, marginTop: "1px" }}>
                <IconAlert />
              </span>
              <div style={{ fontSize: "13px", color: "#7f1320", fontWeight: 500, lineHeight: 1.5 }}>
                Implantation chocolat Pâques — à diffuser à l&apos;ouverture à toute l&apos;équipe.
              </div>
            </div>
          </Card>

          <AgendaCard calendarUrl="https://calendar.google.com" />

          {/* Balisage */}
          <Card>
            <Kicker moduleKey="balisage" label="Suivi" icon={<IconCheck />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Balisage</h2>

            {/* Gros chiffre */}
            <div style={{ textAlign: "center", padding: "14px 0 6px" }}>
              <div style={{
                fontSize: "44px", fontWeight: 700, letterSpacing: "-0.05em",
                color: bal.color, lineHeight: 1,
              }}>
                312 <span style={{ fontSize: "22px", color: "#64748b", fontWeight: 400 }}>/&nbsp;800</span>
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
                39% atteint · Taux erreur 4.2%
              </div>
            </div>

            <ProgressBar
              value={39}
              moduleKey="balisage"
              label="Avancement global"
              subLeft="8 employés suivis"
              subRight="3 alertes actives"
            />

            <Divider />

            {/* Classement */}
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#64748b", marginBottom: "8px" }}>
              Classement
            </div>
            {BALISAGE_RANK.map((emp, i) => {
              const s = statusStyles[emp.status];
              return (
                <div key={emp.name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0" }}>
                  <div style={{ width: "20px", fontSize: "13px", textAlign: "center", flexShrink: 0 }}>
                    {medals[i] ?? i + 1}
                  </div>
                  <div style={{ flex: 1, fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>
                    {emp.name}
                  </div>
                  <div style={{ width: "60px", height: "5px", background: bal.medium, borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${emp.pct}%`, background: `linear-gradient(90deg, ${bal.color}, #0ea5c4)`, borderRadius: "999px" }} />
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: bal.color, width: "28px", textAlign: "right", flexShrink: 0 }}>
                    {emp.total}
                  </div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "7px",
                    background: s.bg, color: s.color,
                  }}>
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                    {{ ok: "OK", warn: "Retard", alert: "Alerte" }[emp.status]}
                  </span>
                </div>
              );
            })}
          </Card>

        </div>
      </div>
    </div>
  );
}

