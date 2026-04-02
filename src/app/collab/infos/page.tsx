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
import { getCollabProfile } from "@/lib/collab-auth";
import { markCollabAnnouncementsSeen } from "@/lib/collab-data";
import {
  getInfosUpdatedEventName,
  loadInfoAnnouncements,
  loadInfoCategories,
  syncInfosFromSupabase,
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
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<InfoCategory[]>([]);
  const [announcements, setAnnouncements] = useState<InfoAnnouncement[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("proc");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    const refreshLocalState = () => {
      if (cancelled) return;
      const nextCategories = loadInfoCategories();
      const nextAnnouncements = loadInfoAnnouncements();
      setCategories(nextCategories);
      setAnnouncements(nextAnnouncements);
      setActiveCategoryId((current) => {
        if (current && nextCategories.some((category) => category.id === current)) return current;
        return nextCategories[0]?.id ?? "proc";
      });
    };

    const refreshRemoteState = async () => {
      if (!cancelled) setRefreshing(true);
      try {
        await syncInfosFromSupabase();
        if (!cancelled) refreshLocalState();
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    };

    const load = async () => {
      const profile = await getCollabProfile();
      if (!profile || profile.role !== "collaborateur") {
        router.replace("/collab/login");
        return;
      }
      if (cancelled) return;
      markCollabAnnouncementsSeen(profile);
      setReady(true);
      refreshLocalState();
      await refreshRemoteState();
    };

    void load().catch(() => router.replace("/collab/login"));
    const eventName = getInfosUpdatedEventName();
    window.addEventListener(eventName, refreshLocalState);
    return () => {
      cancelled = true;
      window.removeEventListener(eventName, refreshLocalState);
    };
  }, [router]);

  const handleManualRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await syncInfosFromSupabase();
      const nextCategories = loadInfoCategories();
      const nextAnnouncements = loadInfoAnnouncements();
      setCategories(nextCategories);
      setAnnouncements(nextAnnouncements);
      setActiveCategoryId((current) => {
        if (current && nextCategories.some((category) => category.id === current)) return current;
        return nextCategories[0]?.id ?? "proc";
      });
    } finally {
      setRefreshing(false);
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

  if (!ready) return null;

  return (
    <CollabPage>
      <CollabHeader
        title="Infos & annonces"
        subtitle="Documents utiles et communications manager."
        right={<StatusPill label={`${announcements.length} annonce${announcements.length > 1 ? "s" : ""}`} color={collabTheme.gold} background="#fff7e8" />}
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
