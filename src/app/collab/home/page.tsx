"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CollabBottomNav, CollabHeader, CollabPage, QuickTile, SectionCard, SectionTitle, StatusPill } from "@/components/collab/layout";
import { collabTheme } from "@/components/collab/theme";
import { getCollabProfile, type CollabProfile } from "@/lib/collab-auth";
import {
  formatFrenchLongDate,
  getCurrentTGPlan,
  getEntryDate,
  getMyWeekPlanning,
  getRecentAnnonces,
  getShiftDisplayText,
  getTodayAndTomorrowIso,
  type CollabPlanningEntry,
} from "@/lib/collab-data";

export default function CollabHomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CollabProfile | null>(null);
  const [todayEntry, setTodayEntry] = useState<CollabPlanningEntry | null>(null);
  const [tomorrowEntry, setTomorrowEntry] = useState<CollabPlanningEntry | null>(null);
  const [tgPlan, setTgPlan] = useState<Record<string, unknown> | null>(null);
  const [annonces, setAnnonces] = useState<Array<Record<string, unknown>>>([]);
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
        const planningRows = await getMyWeekPlanning(today, tomorrow);
        setTodayEntry((planningRows.find((entry) => getEntryDate(entry) === today) as CollabPlanningEntry | undefined) ?? null);
        setTomorrowEntry((planningRows.find((entry) => getEntryDate(entry) === tomorrow) as CollabPlanningEntry | undefined) ?? null);
        setLoadError("");
      } catch {
        setTodayEntry(null);
        setTomorrowEntry(null);
        setLoadError("Certaines informations collaborateur n'ont pas pu être chargées.");
      }

      const [currentTgPlan, recentAnnonces] = await Promise.allSettled([getCurrentTGPlan(), getRecentAnnonces(3)]);
      setTgPlan(currentTgPlan.status === "fulfilled" ? (currentTgPlan.value as Record<string, unknown> | null) ?? null : null);
      setAnnonces(
        recentAnnonces.status === "fulfilled"
          ? (recentAnnonces.value as Array<Record<string, unknown>>)
          : [],
      );
    };

    void load().catch(() => router.replace("/collab/login"));
  }, [router]);

  if (!profile) return null;

  const displayName = profile.employees?.name ?? "Collaborateur";
  const displayDate = formatFrenchLongDate(new Date());

  return (
    <CollabPage>
      <CollabHeader title={`Bonjour ${displayName}.`} subtitle={displayDate} />
      <div style={{ marginBottom: 16 }}>
        <StatusPill label="Connecté(e)" color={collabTheme.green} background={collabTheme.greenBg} />
      </div>
      <div style={{ display: "grid", gap: 16 }}>
        <SectionCard>
          <SectionTitle>Aujourd’hui</SectionTitle>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{todayEntry ? getShiftDisplayText(todayEntry, profile) : "Aucun horaire"}</div>
          <div style={{ marginTop: 6, fontSize: 13, color: collabTheme.muted }}>Votre planning du jour.</div>
        </SectionCard>
        <SectionCard>
          <SectionTitle>Demain</SectionTitle>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{tomorrowEntry ? getShiftDisplayText(tomorrowEntry, profile) : "Aucun horaire"}</div>
          <div style={{ marginTop: 6, fontSize: 13, color: collabTheme.muted }}>Anticipez votre prochaine journée.</div>
        </SectionCard>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <QuickTile href="/collab/planning" title="Planning" subtitle="Vue semaine, mois et équipe." />
          <QuickTile href="/collab/absences" title="Absences" subtitle="Suivi de vos demandes et nouvelle saisie." />
          <QuickTile href="/collab/more" title="Plan TG" subtitle={tgPlan ? "Un plan est disponible aujourd’hui." : "Accès aux plans du moment."} />
          <QuickTile href="/collab/more" title="Infos" subtitle={annonces.length ? `${annonces.length} annonce(s) récente(s).` : "Documents et annonces magasin."} />
        </div>
        <SectionCard>
          <SectionTitle>Annonces récentes</SectionTitle>
          <div style={{ display: "grid", gap: 10 }}>
            {annonces.length ? annonces.map((annonce, index) => (
              <div key={index} style={{ padding: "12px 0", borderTop: index ? `1px solid ${collabTheme.line}` : "none" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{String(annonce.titre ?? annonce.title ?? "Annonce")}</div>
                <div style={{ marginTop: 6, fontSize: 13, color: collabTheme.muted, lineHeight: 1.45 }}>{String(annonce.contenu ?? annonce.content ?? "")}</div>
              </div>
            )) : <div style={{ fontSize: 13, color: collabTheme.muted }}>Aucune annonce récente.</div>}
          </div>
        </SectionCard>
        {loadError ? (
          <SectionCard style={{ background: "#fff8ec" }}>
            <div style={{ fontSize: 13, color: collabTheme.amber }}>{loadError}</div>
          </SectionCard>
        ) : null}
        <SectionCard>
          <SectionTitle>Accès rapide</SectionTitle>
          <Link href="/collab/more" style={{ color: collabTheme.accent, textDecoration: "none", fontWeight: 700 }}>Voir les liens complémentaires</Link>
        </SectionCard>
      </div>
      <CollabBottomNav />
    </CollabPage>
  );
}


