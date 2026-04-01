"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CollabBottomNav, CollabHeader, CollabPage, SectionCard, SectionTitle } from "@/components/collab/layout";
import { collabSerifTitleStyle, collabTheme } from "@/components/collab/theme";
import { collabSignOut, getCollabProfile } from "@/lib/collab-auth";

const links = [
  { title: "Plan TG/GB", subtitle: "Voir vos rayons et la vue d’ensemble magasin.", tone: collabTheme.green, href: "/collab/plan-tg" },
  { title: "Infos & annonces", subtitle: "Voir les annonces et documents utiles.", tone: collabTheme.gold, href: "/collab/infos" },
];

export default function CollabMorePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void getCollabProfile()
      .then((profile) => {
        if (!profile || profile.role !== "collaborateur") {
          router.replace("/collab/login");
          return;
        }
        setReady(true);
      })
      .catch(() => router.replace("/collab/login"));
  }, [router]);

  if (!ready) return null;

  return (
    <CollabPage>
      <CollabHeader title="Plus" subtitle="Liens et accès complémentaires." showRefresh />
      <div style={{ display: "grid", gap: 16 }}>
        <SectionCard>
          <SectionTitle>Liens</SectionTitle>
          <div style={{ display: "grid", gap: 12 }}>
            {links.map((link) => (
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
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 999, background: link.tone }} />
                  <div style={{ ...collabSerifTitleStyle({ fontSize: 20 }) }}>{link.title}</div>
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
