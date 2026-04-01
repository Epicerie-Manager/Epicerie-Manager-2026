"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CollabBottomNav,
  CollabHeader,
  CollabPage,
  QuickTile,
  SectionCard,
  SectionTitle,
  StatusPill,
} from "@/components/collab/layout";
import { collabSerifTitleStyle, collabTheme } from "@/components/collab/theme";
import { getCollabProfile, type CollabProfile } from "@/lib/collab-auth";
import {
  formatFrenchLongDate,
  getCurrentTGPlan,
  getEntryDate,
  getMyAbsences,
  getMyWeekPlanning,
  getRecentAnnonces,
  getShiftDisplayText,
  getTodayAndTomorrowIso,
  type CollabPlanningEntry,
} from "@/lib/collab-data";

function getWeekLabel(dateIso: string) {
  const date = new Date(`${dateIso}T12:00:00`);
  const firstJanuary = new Date(date.getFullYear(), 0, 1);
  const diff = Math.floor((date.getTime() - firstJanuary.getTime()) / 86400000);
  return `Sem. ${Math.ceil((diff + firstJanuary.getDay() + 1) / 7)}`;
}

function PlanningMoment({
  label,
  dateLabel,
  value,
  badge,
  tone,
}: {
  label: string;
  dateLabel: string;
  value: string;
  badge: string;
  tone: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "3px 1fr auto",
        gap: 10,
        alignItems: "center",
        padding: "12px 0",
        borderTop: `1px solid ${collabTheme.line}`,
      }}
    >
      <div style={{ width: 3, alignSelf: "stretch", borderRadius: 999, background: tone }} />
      <div>
        <div style={{ fontSize: 11, color: collabTheme.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {label} — {dateLabel}
        </div>
        <div style={{ ...collabSerifTitleStyle({ fontSize: 26, lineHeight: 1.05, marginTop: 4 }) }}>{value}</div>
      </div>
      <span
        style={{
          borderRadius: 999,
          background: badge === "En cours" ? collabTheme.accent : collabTheme.black,
          color: "#ffffff",
          padding: "6px 10px",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {badge}
      </span>
    </div>
  );
}

export default function CollabHomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CollabProfile | null>(null);
  const [todayEntry, setTodayEntry] = useState<CollabPlanningEntry | null>(null);
  const [tomorrowEntry, setTomorrowEntry] = useState<CollabPlanningEntry | null>(null);
  const [tgPlan, setTgPlan] = useState<Record<string, unknown> | null>(null);
  const [annonces, setAnnonces] = useState<Array<Record<string, unknown>>>([]);
  const [pendingAbsences, setPendingAbsences] = useState(0);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const load = async () => {
      const collabProfile = await getCollabProfile();
      if (!collabProfile || collabProfile.role !== "collaborateur") {
        router.replace("/collab/login");
        return;
      }
      if (collabProfile.first_login) {
        router.replace("/collab/change-pin");
        return;
      }
      setProfile(collabProfile);

      const { today, tomorrow } = getTodayAndTomorrowIso();
      try {
        const [planningRows, currentTgPlan, recentAnnonces, absences] = await Promise.all([
          getMyWeekPlanning(today, tomorrow),
          getCurrentTGPlan(),
          getRecentAnnonces(3),
          getMyAbsences(),
        ]);
        setTodayEntry((planningRows.find((entry) => getEntryDate(entry) === today) as CollabPlanningEntry | undefined) ?? null);
        setTomorrowEntry((planningRows.find((entry) => getEntryDate(entry) === tomorrow) as CollabPlanningEntry | undefined) ?? null);
        setTgPlan((currentTgPlan as Record<string, unknown> | null) ?? null);
        setAnnonces(recentAnnonces as Array<Record<string, unknown>>);
        setPendingAbsences(
          (absences as Array<Record<string, unknown>>).filter((row) => String(row.statut ?? "").toLowerCase().includes("attente")).length,
        );
        setLoadError("");
      } catch {
        setTodayEntry(null);
        setTomorrowEntry(null);
        setTgPlan(null);
        setAnnonces([]);
        setPendingAbsences(0);
        setLoadError("Certaines informations collaborateur n'ont pas pu être chargées.");
      }
    };

    void load().catch(() => router.replace("/collab/login"));
  }, [router]);

  const displayName = profile?.employees?.name ?? "Collaborateur";
  const displayDate = useMemo(() => formatFrenchLongDate(new Date()), []);
  const todayIso = getTodayAndTomorrowIso().today;

  if (!profile) return null;

  return (
    <CollabPage>
      <CollabHeader
        title={`Bonjour, ${displayName}.`}
        subtitle={displayDate}
        right={<StatusPill label="Connecté" color="#0c7a45" background="#eefbf4" />}
      />

      <SectionCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ background: collabTheme.black, color: "#f8f1e8", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>Mon planning</div>
          <div style={{ fontSize: 12 }}>{getWeekLabel(todayIso)}</div>
        </div>
        <div style={{ padding: "0 14px 4px" }}>
          <PlanningMoment
            label="Aujourd'hui"
            dateLabel={new Date(`${todayIso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            value={todayEntry ? getShiftDisplayText(todayEntry, profile) : "Aucun horaire"}
            badge="En cours"
            tone={collabTheme.accent}
          />
          <PlanningMoment
            label="Demain"
            dateLabel={new Date(new Date().getTime() + 86400000).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            value={tomorrowEntry ? getShiftDisplayText(tomorrowEntry, profile) : "Aucun horaire"}
            badge="Demain"
            tone="#b7ada0"
          />
        </div>
      </SectionCard>

      <div style={{ marginTop: 18, marginBottom: 10, fontSize: 11, letterSpacing: "0.18em", color: collabTheme.muted, textTransform: "uppercase" }}>Accès rapide</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        <QuickTile href="/collab/planning" title="Planning" subtitle="Semaine · Mois · Équipe" tone={collabTheme.blue} icon="planning" />
        <QuickTile href="/collab/absences" title="Absences" subtitle={pendingAbsences ? `${pendingAbsences} en attente` : "Suivi des demandes"} tone={collabTheme.violet} icon="absences" badge={pendingAbsences || null} />
        <QuickTile href="/collab/plan-tg" title="Plan TG/GB" subtitle={tgPlan ? "Sem. en cours" : "À venir"} tone={collabTheme.green} icon="tg" />
        <QuickTile href="/collab/infos" title="Infos" subtitle={annonces.length ? `${annonces.length} nouveauté${annonces.length > 1 ? "s" : ""}` : "Actualités magasin"} tone={collabTheme.gold} icon="infos" badge={annonces.length || null} />
      </div>

      <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
        <SectionCard>
          <SectionTitle>Annonces récentes</SectionTitle>
          <div style={{ display: "grid", gap: 10 }}>
            {annonces.length ? annonces.map((annonce, index) => (
              <div key={index} style={{ paddingTop: index ? 10 : 0, borderTop: index ? `1px solid ${collabTheme.line}` : "none" }}>
                <div style={{ ...collabSerifTitleStyle({ fontSize: 18 }) }}>{String(annonce.titre ?? annonce.title ?? "Annonce")}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: collabTheme.muted }}>{String(annonce.date_publication ?? annonce.created_at ?? "").slice(0, 10)}</div>
                <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, color: collabTheme.muted }}>{String(annonce.contenu ?? annonce.content ?? "")}</div>
              </div>
            )) : <div style={{ fontSize: 13, color: collabTheme.muted }}>Aucune annonce récente.</div>}
          </div>
        </SectionCard>
        {loadError ? (
          <SectionCard style={{ background: "#fff7eb" }}>
            <div style={{ color: collabTheme.gold, fontSize: 13 }}>{loadError}</div>
          </SectionCard>
        ) : null}
      </div>

      <CollabBottomNav />
    </CollabPage>
  );
}
