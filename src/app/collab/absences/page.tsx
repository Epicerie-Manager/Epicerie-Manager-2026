"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CollabBottomNav, CollabHeader, CollabPage, SectionCard, SectionTitle } from "@/components/collab/layout";
import { collabTheme } from "@/components/collab/theme";
import { getCollabProfile } from "@/lib/collab-auth";
import { getAbsenceStatusLabel, getAbsenceStatusTone, getMyAbsences } from "@/lib/collab-data";

export default function CollabAbsencesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"encours" | "historique">("encours");
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    void getCollabProfile()
      .then((profile) => {
        if (!profile || profile.role !== "collaborateur") {
          router.replace("/collab/login");
          return;
        }
        return getMyAbsences().then((data) => setRows(data as Array<Record<string, unknown>>));
      })
      .catch(() => router.replace("/collab/login"));
  }, [router]);

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (activeTab === "historique") return rows;
    return rows.filter((row) => String(row.date_fin ?? row.date_debut ?? "9999-12-31") >= today);
  }, [activeTab, rows]);

  return (
    <CollabPage>
      <CollabHeader title="Absences" subtitle="Suivez vos demandes et envoyez-en une nouvelle en quelques étapes." accent={false} />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button type="button" onClick={() => setActiveTab("encours")} style={{ flex: 1, minHeight: 40, borderRadius: 14, border: `1px solid ${activeTab === "encours" ? collabTheme.accent : collabTheme.line}`, background: activeTab === "encours" ? collabTheme.accentSoft : "#fffaf6", color: activeTab === "encours" ? collabTheme.accent : collabTheme.muted, fontWeight: 700, cursor: "pointer" }}>En cours</button>
        <button type="button" onClick={() => setActiveTab("historique")} style={{ flex: 1, minHeight: 40, borderRadius: 14, border: `1px solid ${activeTab === "historique" ? collabTheme.accent : collabTheme.line}`, background: activeTab === "historique" ? collabTheme.accentSoft : "#fffaf6", color: activeTab === "historique" ? collabTheme.accent : collabTheme.muted, fontWeight: 700, cursor: "pointer" }}>Historique</button>
      </div>
      <div style={{ display: "grid", gap: 16 }}>
        <SectionCard>
          <SectionTitle right={<Link href="/collab/absences/new" style={{ color: collabTheme.accent, textDecoration: "none", fontWeight: 700 }}>+ Nouvelle</Link>}>Mes demandes</SectionTitle>
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.length ? filtered.map((row, index) => {
              const tone = getAbsenceStatusTone(row.statut);
              return (
                <div key={index} style={{ padding: "14px 0", borderTop: index ? `1px solid ${collabTheme.line}` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{String(row.type ?? "Absence")}</div>
                    <span style={{ borderRadius: 999, padding: "6px 10px", background: tone.bg, color: tone.color, fontSize: 12, fontWeight: 700 }}>{getAbsenceStatusLabel(row.statut)}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: collabTheme.muted }}>{String(row.date_debut ?? "")} → {String(row.date_fin ?? "")}</div>
                  {String(row.motif_refus ?? row.reason ?? "") ? <div style={{ marginTop: 8, fontSize: 13, color: "#991b1b" }}>Motif : {String(row.motif_refus ?? row.reason ?? "")}</div> : null}
                </div>
              );
            }) : <div style={{ fontSize: 13, color: collabTheme.muted }}>Aucune demande à afficher.</div>}
          </div>
        </SectionCard>
      </div>
      <CollabBottomNav />
    </CollabPage>
  );
}
