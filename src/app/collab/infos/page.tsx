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
    return { label: "Urgent", bg: "#fff1f2", color: "#9f1239", border: "#fecdd3" };
  }
  if (priority === "important") {
    return { label: "Important", bg: "#fffbeb", color: "#92400e", border: "#fde68a" };
  }
  return { label: "Info", bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
}

function getAttachmentLabel(item: InfoItem) {
  if (!item.attachment) return "Sans pièce jointe";
  return `${item.attachment.name} · ${formatBytes(item.attachment.size)}`;
}

export default function CollabInfosPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState<InfoCategory[]>([]);
  const [announcements, setAnnouncements] = useState<InfoAnnouncement[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("proc");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
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

    const load = async () => {
      const profile = await getCollabProfile();
      if (!profile || profile.role !== "collaborateur") {
        router.replace("/collab/login");
        return;
      }
      if (cancelled) return;
      setReady(true);
      refresh();
      const synced = await syncInfosFromSupabase();
      if (synced && !cancelled) refresh();
    };

    void load().catch(() => router.replace("/collab/login"));
    const eventName = getInfosUpdatedEventName();
    window.addEventListener(eventName, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(eventName, refresh);
    };
  }, [router]);

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
      />

      <div style={{ display: "grid", gap: 16 }}>
        <SectionCard>
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
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                      <div>
                        <div style={{ ...collabSerifTitleStyle({ fontSize: 20 }) }}>{announcement.title}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: collabTheme.muted }}>{announcement.date}</div>
                      </div>
                      <span
                        style={{
                          borderRadius: 999,
                          padding: "5px 9px",
                          background: "#ffffff",
                          color: meta.color,
                          fontSize: 11,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: collabTheme.text }}>
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

        <SectionCard>
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
            }}
          />

          <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 12, paddingBottom: 2 }}>
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
                  }}
                >
                  <div style={{ ...collabSerifTitleStyle({ fontSize: 20 }) }}>{item.title}</div>
                  <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, color: collabTheme.muted }}>
                    {item.description}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: collabTheme.muted }}>
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
