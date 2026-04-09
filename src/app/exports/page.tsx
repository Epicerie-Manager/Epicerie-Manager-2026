"use client";

import { useRouter } from "next/navigation";
import { colors, shadows } from "@/lib/theme";

type ExportCardProps = {
  emoji: string;
  title: string;
  description: string;
  chips: string[];
  badgeLabel: string;
  iconBg: string;
  badgeBg: string;
  badgeColor: string;
  href?: string;
};

function ExportCard({
  emoji,
  title,
  description,
  chips,
  badgeLabel,
  iconBg,
  badgeBg,
  badgeColor,
  href,
}: ExportCardProps) {
  const router = useRouter();
  const disabled = !href;

  return (
    <button
      type="button"
      onClick={() => href && router.push(href)}
      style={{
        textAlign: "left",
        padding: 18,
        borderRadius: 20,
        border: `1px solid ${colors.border}`,
        background: "#ffffff",
        boxShadow: shadows.card,
        opacity: disabled ? 0.72 : 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        minHeight: 236,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          marginBottom: 12,
        }}
      >
        {emoji}
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: colors.textStrong, minHeight: 38 }}>{title}</div>
      <div style={{ fontSize: 11, color: colors.muted, marginTop: 4, minHeight: 32 }}>{description}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
        {chips.map((chip) => (
          <span
            key={chip}
            style={{
              padding: "4px 8px",
              borderRadius: 999,
              border: `1px solid ${colors.border}`,
              background: "#f8fafc",
              fontSize: 10,
              fontWeight: 700,
              color: colors.muted,
            }}
          >
            {chip}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 16 }}>
        <span
          style={{
            padding: "5px 10px",
            borderRadius: 999,
            background: badgeBg,
            color: badgeColor,
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          {badgeLabel}
        </span>
        <span style={{ fontSize: 24, color: badgeColor, lineHeight: 1 }}>›</span>
      </div>
    </button>
  );
}

export default function ExportsPage() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: colors.textStrong, letterSpacing: "-0.04em" }}>
          Exports & impressions
        </h1>
        <p style={{ fontSize: 13, color: colors.muted, marginTop: 6 }}>
          Format A3 paysage — choisissez le document à préparer avant impression.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        <ExportCard
          emoji="🗓️"
          title="Planning équipe"
          description="Préparer une affiche planning 2 semaines ou 1 mois pour l’équipe."
          chips={["2 semaines", "1 mois", "A3 paysage"]}
          badgeLabel="Disponible"
          badgeBg="#dcfce7"
          badgeColor="#15803d"
          iconBg="#f0fdf4"
          href="/exports/planning"
        />
        <ExportCard
          emoji="🏖️"
          title="Planning CP"
          description="Préparer une frise hebdomadaire des congés payés approuvés sur une période libre."
          chips={["Période libre", "Semaines ISO", "A3 paysage"]}
          badgeLabel="Disponible"
          badgeBg="#dcfce7"
          badgeColor="#15803d"
          iconBg="#fff7ed"
          href="/exports/cp"
        />
        <ExportCard
          emoji="🏷️"
          title="Contrôle balisage"
          description="Préparer une synthèse mensuelle équipe pour le suivi balisage."
          chips={["Mensuel", "Equipe", "A3 paysage"]}
          badgeLabel="Disponible"
          badgeBg="#dcfce7"
          badgeColor="#15803d"
          iconBg="#fef9c3"
          href="/exports/balisage"
        />
        <ExportCard
          emoji="🛒"
          title="Plan TG/GB"
          description="Préparer la vue d’ensemble hebdomadaire des rayons salés et sucrés."
          chips={["Hebdomadaire", "Vue d’ensemble", "A3 paysage"]}
          badgeLabel="Disponible"
          badgeBg="#dcfce7"
          badgeColor="#15803d"
          iconBg="#eff6ff"
          href="/exports/tg"
        />
      </div>
    </div>
  );
}
