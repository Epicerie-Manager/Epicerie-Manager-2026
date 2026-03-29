"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CollabBottomNav, CollabHeader, CollabPage, SectionCard, SectionTitle } from "@/components/collab/layout";
import { collabTheme } from "@/components/collab/theme";
import { collabSignOut, getCollabProfile } from "@/lib/collab-auth";

const links = [
  { href: "/collab/more", title: "Plan TG", subtitle: "Consulter les têtes de gondole en cours." },
  { href: "/collab/more", title: "Infos", subtitle: "Voir les annonces et documents utiles." },
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
      <CollabHeader title="Plus" subtitle="Accès complémentaires pour la suite de la PWA collaborateur." accent={false} />
      <div style={{ display: "grid", gap: 16 }}>
        <SectionCard>
          <SectionTitle>Liens</SectionTitle>
          <div style={{ display: "grid", gap: 12 }}>
            {links.map((link) => (
              <div key={link.title} style={{ padding: "14px 0", borderTop: `1px solid ${collabTheme.line}` }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{link.title}</div>
                <div style={{ marginTop: 6, fontSize: 13, color: collabTheme.muted }}>{link.subtitle}</div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard>
          <SectionTitle>Déconnexion</SectionTitle>
          <button
            type="button"
            onClick={() => void collabSignOut().then(() => router.replace("/collab/login"))}
            style={{
              width: "100%",
              minHeight: 48,
              borderRadius: 18,
              border: "none",
              background: "#111111",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Se déconnecter
          </button>
        </SectionCard>
      </div>
      <CollabBottomNav />
    </CollabPage>
  );
}
