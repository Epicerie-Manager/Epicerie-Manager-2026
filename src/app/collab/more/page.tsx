"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CollabBottomNav, CollabHeader, CollabPage, SectionCard, SectionTitle } from "@/components/collab/layout";
import { collabSerifTitleStyle, collabTheme } from "@/components/collab/theme";
import { collabSignOut, getCollabProfile } from "@/lib/collab-auth";
import { getCollabInfosFromSupabase } from "@/lib/infos-store";
import type { InfoAnnouncement } from "@/lib/infos-data";

function InlineBadge({
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
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minHeight: 24,
        borderRadius: 999,
        padding: "0 9px",
        background: bg,
        color,
        fontSize: 10,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
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
        }}
      >
        {count}
      </span>
    </span>
  );
}

export default function CollabMorePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [announcements, setAnnouncements] = useState<InfoAnnouncement[]>([]);

  useEffect(() => {
    let cancelled = false;

    void getCollabProfile()
      .then(async (profile) => {
        if (!profile || profile.role !== "collaborateur") {
          router.replace("/collab/login");
          return;
        }
        let infoPayload: { announcements: InfoAnnouncement[] } = { announcements: [] };
        try {
          infoPayload = await getCollabInfosFromSupabase(profile.employee_id ?? "");
        } catch {
          infoPayload = { announcements: [] };
        }
        if (cancelled) return;
        setAnnouncements(infoPayload.announcements);
        setReady(true);
      })
      .catch(() => router.replace("/collab/login"));
    return () => {
      cancelled = true;
    };
  }, [router]);

  const announcementCounts = useMemo(
    () =>
      announcements
        .filter((announcement) => !announcement.selfReceipt?.seenAt)
        .reduce(
          (acc: Record<"urgent" | "important" | "normal", number>, announcement) => {
            acc[announcement.priority] += 1;
            return acc;
          },
          { urgent: 0, important: 0, normal: 0 },
        ),
    [announcements],
  );

  const infoBadges = (
    <>
      {announcementCounts.urgent ? <InlineBadge label="Urgent" count={announcementCounts.urgent} bg="#c1121f" color="#fff8f3" /> : null}
      {announcementCounts.important ? <InlineBadge label="Important" count={announcementCounts.important} bg="#d97706" color="#fffaf2" /> : null}
      {announcementCounts.normal ? <InlineBadge label="Info" count={announcementCounts.normal} bg="#facc15" color="#6b4f00" /> : null}
    </>
  );

  if (!ready) return null;

  return (
    <CollabPage>
      <CollabHeader title="Plus" subtitle="Liens et accès complémentaires." showRefresh />
      <div style={{ display: "grid", gap: 16 }}>
        <SectionCard>
          <SectionTitle>Liens</SectionTitle>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { title: "Plan TG/GB", subtitle: "Voir vos rayons et la vue d’ensemble magasin.", tone: collabTheme.green, href: "/collab/plan-tg" },
              { title: "Infos & annonces", subtitle: "Voir les annonces et documents utiles.", tone: collabTheme.gold, href: "/collab/infos" },
            ].map((link) => (
              <Link
                key={link.title}
                href={link.href}
                style={{
                  padding: "14px 14px",
                  borderRadius: 16,
                  background: "#fffdfb",
                  border: `1px solid ${collabTheme.line}`,
                  textDecoration: "none",
                  color: collabTheme.text,
                  display: "block",
                }}
              >
                <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 999, background: link.tone, flexShrink: 0 }} />
                    <div style={{ ...collabSerifTitleStyle({ fontSize: 20 }) }}>{link.title}</div>
                  </div>
                  {link.href === "/collab/infos" && (announcementCounts.urgent || announcementCounts.important || announcementCounts.normal) ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
                      {infoBadges}
                    </div>
                  ) : null}
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: collabTheme.muted }}>{link.subtitle}</div>
              </Link>
            ))}
          </div>
        </SectionCard>
        <SectionCard>
          <SectionTitle>Déconnexion</SectionTitle>
          <button
            type="button"
            onClick={() => void collabSignOut().then(() => router.replace("/collab/login"))}
            style={{ width: "100%", minHeight: 52, borderRadius: 16, border: "none", background: collabTheme.black, color: "#fff", fontWeight: 700, cursor: "pointer" }}
          >
            Se déconnecter
          </button>
        </SectionCard>
      </div>
      <CollabBottomNav />
    </CollabPage>
  );
}
