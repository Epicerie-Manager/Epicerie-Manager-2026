"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CollabBottomNav,
  CollabHeader,
  CollabPage,
  QuickTile,
  SectionCard,
  StatusPill,
} from "@/components/collab/layout";
import { collabSerifTitleStyle, collabTheme } from "@/components/collab/theme";
import { collabSignOut, getCollabProfile, type CollabProfile } from "@/lib/collab-auth";
import {
  formatFrenchLongDate,
  getCurrentTGPlan,
  getEntryDate,
  getMyAbsences,
  getMyWeekPlanning,
  getShiftDisplayText,
  getTodayAndTomorrowIso,
  type CollabPlanningEntry,
} from "@/lib/collab-data";
import { confirmAnnouncementReadingInSupabase, getCollabInfosFromSupabase } from "@/lib/infos-store";
import type { InfoAnnouncement, InfoCategory } from "@/lib/infos-data";

function getCollabInfosDocumentsSeenKey(profileKey: string) {
  return `epicerie-collab-infos-documents-seen:${profileKey}`;
}

function countDocumentsAfter(categories: InfoCategory[], seenTimestamp: string) {
  if (!seenTimestamp) {
    return categories.reduce((total, category) => total + category.items.length, 0);
  }
  return categories.reduce(
    (total, category) =>
      total +
      category.items.filter((item) => String(item.updatedAt ?? item.createdAt ?? "") > seenTimestamp).length,
    0,
  );
}

function AnnouncementBubble({
  label,
  count,
  bg,
  color,
}: {
  label: string;
  count: number;
  bg: string;
  color: string;
}) {
  return (
    <span
      style={{
        minHeight: 24,
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "0 8px 0 10px",
        background: bg,
        color,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        boxShadow: "0 4px 12px rgba(26,20,16,0.14)",
        border: "1px solid rgba(255,255,255,0.16)",
      }}
    >
      <span>{label}</span>
      <span
        style={{
          minWidth: 18,
          height: 18,
          borderRadius: 999,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.24)",
          color: "inherit",
          padding: "0 4px",
          fontSize: 10,
          fontWeight: 900,
        }}
      >
        {count}
      </span>
    </span>
  );
}

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
  const [announcements, setAnnouncements] = useState<InfoAnnouncement[]>([]);
  const [newDocumentsCount, setNewDocumentsCount] = useState(0);
  const [pendingAbsences, setPendingAbsences] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [openingAnnouncementId, setOpeningAnnouncementId] = useState<string | null>(null);

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
      if (!collabProfile.employee_id) {
        setLoadError("Profil collaborateur incomplet.");
        return;
      }
      setProfile(collabProfile);

      const { today, tomorrow } = getTodayAndTomorrowIso();
      try {
        const [planningRows, currentTgPlan, infoPayload, absences] = await Promise.all([
          getMyWeekPlanning(today, tomorrow),
          getCurrentTGPlan(),
          getCollabInfosFromSupabase(collabProfile.employee_id),
          getMyAbsences(),
        ]);
        setTodayEntry((planningRows.find((entry) => getEntryDate(entry) === today) as CollabPlanningEntry | undefined) ?? null);
        setTomorrowEntry((planningRows.find((entry) => getEntryDate(entry) === tomorrow) as CollabPlanningEntry | undefined) ?? null);
        setTgPlan((currentTgPlan as Record<string, unknown> | null) ?? null);
        setAnnouncements(infoPayload.announcements);
        const profileKey = String(
          collabProfile.employee_id ?? collabProfile.id ?? collabProfile.employees?.name ?? "collab",
        );
        const documentsSeenKey = getCollabInfosDocumentsSeenKey(profileKey);
        const seenDocumentsAt =
          typeof window !== "undefined" ? window.localStorage.getItem(documentsSeenKey) ?? "" : "";
        setNewDocumentsCount(countDocumentsAfter(infoPayload.categories, seenDocumentsAt));
        setPendingAbsences(
          (absences as Array<Record<string, unknown>>).filter((row) => String(row.statut ?? "").toLowerCase().includes("attente")).length,
        );
        setLoadError("");
        setLastRefreshAt(new Date());
      } catch {
        setTodayEntry(null);
        setTomorrowEntry(null);
        setTgPlan(null);
        setAnnouncements([]);
        setNewDocumentsCount(0);
        setPendingAbsences(0);
        setLoadError("Certaines informations collaborateur n'ont pas pu être chargées.");
      }
    };

    void load().catch(() => router.replace("/collab/login"));
  }, [router]);

  const displayName = profile?.employees?.name ?? "Collaborateur";
  const displayDate = useMemo(() => formatFrenchLongDate(new Date()), []);
  const todayIso = getTodayAndTomorrowIso().today;
  const unreadAnnouncements = useMemo(
    () => announcements.filter((announcement) => !announcement.selfReceipt?.seenAt),
    [announcements],
  );
  const pendingLoginAnnouncement = useMemo(
    () =>
      announcements.find(
        (announcement) => announcement.confirmationRequired && !announcement.selfReceipt?.confirmedAt,
      ) ?? null,
    [announcements],
  );
  const announcementCounts = useMemo(
    () =>
      unreadAnnouncements.reduce(
        (acc: Record<"urgent" | "important" | "normal", number>, announcement) => {
          acc[announcement.priority] += 1;
          return acc;
        },
        { urgent: 0, important: 0, normal: 0 },
      ),
    [unreadAnnouncements],
  );
  const unreadAnnouncementCount =
    announcementCounts.urgent + announcementCounts.important + announcementCounts.normal;
  const unreadAnnouncementSummary = [
    announcementCounts.urgent ? `${announcementCounts.urgent} urgent${announcementCounts.urgent > 1 ? "s" : ""}` : null,
    announcementCounts.important ? `${announcementCounts.important} important${announcementCounts.important > 1 ? "s" : ""}` : null,
    announcementCounts.normal ? `${announcementCounts.normal} info${announcementCounts.normal > 1 ? "s" : ""}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const infosSummaryParts = [
    newDocumentsCount ? `${newDocumentsCount} document${newDocumentsCount > 1 ? "s" : ""} nouveau${newDocumentsCount > 1 ? "x" : ""}` : null,
    unreadAnnouncementCount ? unreadAnnouncementSummary : null,
  ].filter(Boolean);
  const infosSubtitle = infosSummaryParts.length ? infosSummaryParts.join(" · ") : "Actualités magasin";
  const announcementBadge = unreadAnnouncementCount ? (
    <>
      {newDocumentsCount ? <AnnouncementBubble label="Docs" count={newDocumentsCount} bg="#2563eb" color="#eff6ff" /> : null}
      {announcementCounts.urgent ? <AnnouncementBubble label="Urgent" count={announcementCounts.urgent} bg="#c1121f" color="#fff8f3" /> : null}
      {announcementCounts.important ? <AnnouncementBubble label="Important" count={announcementCounts.important} bg="#d97706" color="#fffaf2" /> : null}
      {announcementCounts.normal ? <AnnouncementBubble label="Info" count={announcementCounts.normal} bg="#facc15" color="#6b4f00" /> : null}
    </>
  ) : newDocumentsCount ? (
    <AnnouncementBubble label="Docs" count={newDocumentsCount} bg="#2563eb" color="#eff6ff" />
  ) : null;

  if (!profile) return null;

  async function handleConfirmLoginAnnouncement() {
    if (!profile || !profile.employee_id || !pendingLoginAnnouncement || openingAnnouncementId) return;

    setOpeningAnnouncementId(pendingLoginAnnouncement.id);
    try {
      await confirmAnnouncementReadingInSupabase(profile.employee_id, pendingLoginAnnouncement.id);
      const readAt = new Date().toISOString();
      setAnnouncements((current) =>
        current.map((announcement) =>
          announcement.id === pendingLoginAnnouncement.id
            ? {
                ...announcement,
                selfReceipt: {
                  seenAt: announcement.selfReceipt?.seenAt ?? readAt,
                  confirmedAt: readAt,
                },
              }
            : announcement,
        ),
      );
    } finally {
      setOpeningAnnouncementId(null);
    }
  }

  async function handleSignOut() {
    await collabSignOut();
    router.replace("/collab/login");
  }

  return (
    <CollabPage>
      <CollabHeader
        title={`Bonjour, ${displayName}.`}
        subtitle={displayDate}
        right={
          <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
            <StatusPill label="Connecté" color="#0c7a45" background="#eefbf4" />
            <button
              type="button"
              onClick={() => void handleSignOut()}
              style={{
                minHeight: 30,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.28)",
                background: "rgba(255,255,255,0.12)",
                color: "#fff8f1",
                padding: "0 12px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Déconnexion
            </button>
          </div>
        }
        showRefresh
        lastRefreshAt={lastRefreshAt}
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
        <QuickTile href="/collab/plateau" title="Plan plateau" subtitle="Consulter le plan partagé de la semaine" tone={collabTheme.accent} icon="plateau" />
        <QuickTile
          href="/collab/infos"
          title="Infos"
          subtitle={infosSubtitle}
          tone={collabTheme.gold}
          icon="infos"
          badge={announcementBadge}
          badgeLabel={
            newDocumentsCount || unreadAnnouncementCount
              ? `${newDocumentsCount} documents nouveaux, ${unreadAnnouncementCount} annonces non lues`
              : undefined
          }
        />
      </div>

      <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
        {loadError ? (
          <SectionCard style={{ background: "#fff7eb" }}>
            <div style={{ color: collabTheme.gold, fontSize: 13 }}>{loadError}</div>
          </SectionCard>
        ) : null}
      </div>

      {pendingLoginAnnouncement ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(26,20,16,0.56)",
            backdropFilter: "blur(3px)",
            display: "grid",
            placeItems: "center",
            padding: 18,
            zIndex: 90,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              width: "min(520px, 100%)",
              borderRadius: 26,
              background: "#fffaf4",
              border: "1px solid rgba(229,226,221,0.9)",
              boxShadow: "0 24px 60px rgba(26,20,16,0.24)",
              padding: "18px 18px 20px",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: collabTheme.muted }}>
              Message manager
            </div>
            <div style={{ ...collabSerifTitleStyle({ fontSize: 28, lineHeight: 1.05 }) }}>
              {pendingLoginAnnouncement.title}
            </div>
            <div style={{ fontSize: 12, color: collabTheme.muted }}>
              {pendingLoginAnnouncement.date}
            </div>
            <div
              style={{
                borderRadius: 18,
                background:
                  pendingLoginAnnouncement.priority === "urgent"
                    ? "#fff1f2"
                    : pendingLoginAnnouncement.priority === "important"
                      ? "#fff7ed"
                      : "#fff8d6",
                border:
                  pendingLoginAnnouncement.priority === "urgent"
                    ? "1px solid #fecdd3"
                    : pendingLoginAnnouncement.priority === "important"
                      ? "1px solid #fed7aa"
                      : "1px solid #fde68a",
                padding: "14px 14px",
                fontSize: 14,
                color: "#3f3126",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {pendingLoginAnnouncement.content}
            </div>
            <button
              type="button"
              onClick={() => void handleConfirmLoginAnnouncement()}
              disabled={openingAnnouncementId === pendingLoginAnnouncement.id}
              style={{
                minHeight: 48,
                borderRadius: 999,
                border: "none",
                background: collabTheme.black,
                color: "#fffaf4",
                fontSize: 14,
                fontWeight: 700,
                cursor: openingAnnouncementId === pendingLoginAnnouncement.id ? "not-allowed" : "pointer",
                opacity: openingAnnouncementId === pendingLoginAnnouncement.id ? 0.75 : 1,
              }}
            >
              {openingAnnouncementId === pendingLoginAnnouncement.id ? "Validation..." : "OK, j'ai lu"}
            </button>
          </div>
        </div>
      ) : null}

      <CollabBottomNav />
    </CollabPage>
  );
}
