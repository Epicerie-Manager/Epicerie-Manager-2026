"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CollabBottomNav,
  CollabHeader,
  CollabPage,
  SectionCard,
  SectionTitle,
  StatusPill,
} from "@/components/collab/layout";
import { collabSerifTitleStyle, collabTheme } from "@/components/collab/theme";
import { getCollabProfile, type CollabProfile } from "@/lib/collab-auth";
import {
  confirmAnnouncementReadingInSupabase,
  getCollabInfosFromSupabase,
  getInfosUpdatedEventName,
  markAnnouncementsSeenInSupabase,
} from "@/lib/infos-store";
import type { InfoAnnouncement, InfoCategory, InfoItem } from "@/lib/infos-data";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 o";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function priorityMeta(priority: InfoAnnouncement["priority"]) {
  if (priority === "urgent") {
    return { label: "Urgent", bg: "#fff1f2", color: "#991b1b", border: "#fda4af", pillBg: "#ffffff" };
  }
  if (priority === "important") {
    return { label: "Important", bg: "#fff3e0", color: "#b45309", border: "#fdba74", pillBg: "#ffffff" };
  }
  return { label: "Info", bg: "#fff8d6", color: "#9a6700", border: "#f6d365", pillBg: "#ffffff" };
}

function getAttachmentLabel(item: InfoItem) {
  if (!item.attachment) return "Sans pièce jointe";
  return `${item.attachment.name} · ${formatBytes(item.attachment.size)}`;
}

export default function CollabInfosPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CollabProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<InfoCategory[]>([]);
  const [announcements, setAnnouncements] = useState<InfoAnnouncement[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("proc");
  const [search, setSearch] = useState("");
  const [confirmingAnnouncementId, setConfirmingAnnouncementId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async (currentProfile: CollabProfile, markSeen: boolean) => {
      if (!currentProfile.employee_id) return;
      const payload = await getCollabInfosFromSupabase(currentProfile.employee_id);
      if (cancelled) return;

      const unseenIds = payload.announcements
        .filter((announcement) => !announcement.selfReceipt?.seenAt)
        .map((announcement) => announcement.id);

      if (markSeen && unseenIds.length) {
        const seenAt = new Date().toISOString();
        await markAnnouncementsSeenInSupabase(currentProfile.employee_id, unseenIds);
        payload.announcements = payload.announcements.map((announcement) =>
          unseenIds.includes(announcement.id)
            ? {
                ...announcement,
                selfReceipt: {
                  seenAt,
                  confirmedAt: announcement.selfReceipt?.confirmedAt ?? null,
                },
              }
            : announcement,
        );
      }

      if (cancelled) return;
      setCategories(payload.categories);
      setAnnouncements(payload.announcements);
      setActiveCategoryId((current) => {
        if (current && payload.categories.some((category) => category.id === current)) return current;
        return payload.categories[0]?.id ?? "proc";
      });
    };

    const bootstrap = async () => {
      const currentProfile = await getCollabProfile();
      if (!currentProfile || currentProfile.role !== "collaborateur") {
        router.replace("/collab/login");
        return;
      }
      if (cancelled) return;
      setProfile(currentProfile);
      setReady(true);
      setRefreshing(true);
      try {
        await load(currentProfile, true);
      } catch {
        if (!cancelled) {
          setCategories([]);
          setAnnouncements([]);
        }
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    };

    void bootstrap().catch(() => router.replace("/collab/login"));

    const eventName = getInfosUpdatedEventName();
    const handleInfosUpdated = () => {
      void getCollabProfile().then((currentProfile) => {
        if (!currentProfile?.employee_id || cancelled) return;
        setRefreshing(true);
        void load(currentProfile, false)
          .catch(() => undefined)
          .finally(() => {
            if (!cancelled) setRefreshing(false);
          });
      });
    };
    window.addEventListener(eventName, handleInfosUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(eventName, handleInfosUpdated);
    };
  }, [router]);

  const handleManualRefresh = async () => {
    if (!profile?.employee_id || refreshing) return;
    setRefreshing(true);
    try {
      const payload = await getCollabInfosFromSupabase(profile.employee_id);
      const unseenIds = payload.announcements
        .filter((announcement) => !announcement.selfReceipt?.seenAt)
        .map((announcement) => announcement.id);
      if (unseenIds.length) {
        const seenAt = new Date().toISOString();
        await markAnnouncementsSeenInSupabase(profile.employee_id, unseenIds);
        payload.announcements = payload.announcements.map((announcement) =>
          unseenIds.includes(announcement.id)
            ? {
                ...announcement,
                selfReceipt: {
                  seenAt,
                  confirmedAt: announcement.selfReceipt?.confirmedAt ?? null,
                },
              }
            : announcement,
        );
      }
      setCategories(payload.categories);
      setAnnouncements(payload.announcements);
      setActiveCategoryId((current) => {
        if (current && payload.categories.some((category) => category.id === current)) return current;
        return payload.categories[0]?.id ?? "proc";
      });
    } catch {
      setCategories([]);
      setAnnouncements([]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleConfirmAnnouncement = async (announcementId: string) => {
    if (!profile?.employee_id || confirmingAnnouncementId) return;
    setConfirmingAnnouncementId(announcementId);
    try {
      const confirmedAt = new Date().toISOString();
      await confirmAnnouncementReadingInSupabase(profile.employee_id, announcementId);
      setAnnouncements((current) =>
        current.map((announcement) =>
          announcement.id === announcementId
            ? {
                ...announcement,
                selfReceipt: {
                  seenAt: announcement.selfReceipt?.seenAt ?? confirmedAt,
                  confirmedAt,
                },
              }
            : announcement,
        ),
      );
    } catch {
      // Keep current state if confirmation fails.
    } finally {
      setConfirmingAnnouncementId(null);
    }
  };

  const activeCategory = useMemo(
    () => categories.find((category) => category.id === activeCategoryId) ?? categories[0] ?? null,
    [activeCategoryId, categories],
  );

  const filteredItems = useMemo(() => {
    if (!activeCategory) return [];
    if (!search.trim()) return activeCategory.items;
    const normalized = search.toLowerCase().trim();
    return activeCategory.items.filter(
      (item) =>
        item.title.toLowerCase().includes(normalized) ||
        item.description.toLowerCase().includes(normalized),
    );
  }, [activeCategory, search]);

  const pendingConfirmations = useMemo(
    () =>
      announcements.filter(
        (announcement) => announcement.confirmationRequired && !announcement.selfReceipt?.confirmedAt,
      ).length,
    [announcements],
  );

  if (!ready) return null;

  return (
    <CollabPage>
      <CollabHeader
        title="Infos & annonces"
        subtitle="Documents utiles et communications manager."
        right={
          <StatusPill
            label={
              pendingConfirmations
                ? `${pendingConfirmations} confirmation${pendingConfirmations > 1 ? "s" : ""}`
                : `${announcements.length} annonce${announcements.length > 1 ? "s" : ""}`
            }
            color={pendingConfirmations ? "#9a3412" : collabTheme.gold}
            background={pendingConfirmations ? "#fff7ed" : "#fff7e8"}
          />
        }
        showRefresh
        onRefresh={handleManualRefresh}
        refreshing={refreshing}
      />

      <div style={{ display: "grid", gap: 16 }}>
        <SectionCard style={{ width: "100%", minWidth: 0 }}>
          <SectionTitle>Annonces</SectionTitle>
          <div style={{ display: "grid", gap: 10 }}>
            {announcements.length ? (
              announcements.map((announcement) => {
                const meta = priorityMeta(announcement.priority);
                const isConfirmed = Boolean(announcement.selfReceipt?.confirmedAt);
                return (
                  <div
                    key={announcement.id}
                    style={{
                      borderRadius: 16,
                      border: `1px solid ${meta.border}`,
                      background: meta.bg,
                      padding: "12px 12px 11px",
                      width: "100%",
                      minWidth: 0,
                      boxSizing: "border-box",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                        <div style={{ ...collabSerifTitleStyle({ fontSize: 20 }), overflowWrap: "anywhere" }}>{announcement.title}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: collabTheme.muted }}>{announcement.date}</div>
                      </div>
                      <span
                        style={{
                          borderRadius: 999,
                          padding: "5px 9px",
                          background: meta.pillBg,
                          color: meta.color,
                          fontSize: 11,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: collabTheme.text,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {announcement.content}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" }}>
                      <span
                        style={{
                          borderRadius: 999,
                          padding: "5px 9px",
                          background: announcement.selfReceipt?.seenAt ? "#ecfdf5" : "#fff7ed",
                          color: announcement.selfReceipt?.seenAt ? "#166534" : "#b45309",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {announcement.selfReceipt?.seenAt ? "Lu" : "Nouveau"}
                      </span>
                      {announcement.confirmationRequired ? (
                        isConfirmed ? (
                          <span
                            style={{
                              borderRadius: 999,
                              padding: "5px 9px",
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            Lecture confirmée
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleConfirmAnnouncement(announcement.id)}
                            disabled={confirmingAnnouncementId === announcement.id}
                            style={{
                              minHeight: 32,
                              borderRadius: 999,
                              border: "1px solid #1d4ed8",
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              padding: "0 12px",
                              fontSize: 11,
                              fontWeight: 800,
                              cursor: confirmingAnnouncementId === announcement.id ? "not-allowed" : "pointer",
                              opacity: confirmingAnnouncementId === announcement.id ? 0.7 : 1,
                            }}
                          >
                            {confirmingAnnouncementId === announcement.id ? "Confirmation..." : "Confirmer la lecture"}
                          </button>
                        )
                      ) : (
                        <span style={{ fontSize: 11, color: collabTheme.muted }}>
                          Confirmation non requise
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: 13, color: collabTheme.muted }}>Aucune annonce disponible pour le moment.</div>
            )}
          </div>
        </SectionCard>

        <SectionCard style={{ width: "100%", minWidth: 0 }}>
          <SectionTitle>Documents</SectionTitle>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un document ou une procédure"
            style={{
              width: "100%",
              minHeight: 42,
              borderRadius: 14,
              border: `1px solid ${collabTheme.line}`,
              background: "#fffdfb",
              color: collabTheme.text,
              padding: "0 14px",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 12, paddingBottom: 2, minWidth: 0 }}>
            {categories.map((category) => {
              const active = category.id === activeCategory?.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategoryId(category.id)}
                  style={{
                    borderRadius: 999,
                    border: `1px solid ${active ? collabTheme.accent : collabTheme.line}`,
                    background: active ? "#fff3f0" : "#fffdfb",
                    color: active ? collabTheme.accent : collabTheme.muted,
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                >
                  {category.label} · {category.items.length}
                </button>
              );
            })}
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {filteredItems.length ? (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${collabTheme.line}`,
                    background: "#fffdfb",
                    padding: "12px 12px 11px",
                    width: "100%",
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ ...collabSerifTitleStyle({ fontSize: 20 }), overflowWrap: "anywhere" }}>{item.title}</div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: collabTheme.muted,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {item.description}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: collabTheme.muted, overflowWrap: "anywhere" }}>
                    {getAttachmentLabel(item)}
                  </div>
                  {item.attachment ? (
                    <a
                      href={item.attachment.dataUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        marginTop: 10,
                        borderRadius: 999,
                        padding: "7px 11px",
                        background: `${collabTheme.blue}14`,
                        color: collabTheme.blue,
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: "none",
                        maxWidth: "100%",
                        whiteSpace: "normal",
                      }}
                    >
                      Ouvrir le document
                    </a>
                  ) : null}
                </div>
              ))
            ) : (
              <div style={{ fontSize: 13, color: collabTheme.muted }}>
                Aucun document trouvé dans cette catégorie.
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <CollabBottomNav />
    </CollabPage>
  );
}
