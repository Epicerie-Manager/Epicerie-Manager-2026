"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CollabBottomNav, CollabHeader, CollabPage, SectionCard, SectionTitle } from "@/components/collab/layout";
import { collabSerifTitleStyle, collabTheme } from "@/components/collab/theme";
import { getCollabProfile } from "@/lib/collab-auth";
import { getAbsenceStatusLabel, getAbsenceStatusTone, getMyAbsences } from "@/lib/collab-data";

function formatShortDateRange(start: unknown, end: unknown) {
  const left = new Date(`${String(start ?? "")}T12:00:00`);
  const right = new Date(`${String(end ?? start ?? "")}T12:00:00`);
  const leftLabel = left.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const rightLabel = right.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return `${leftLabel} → ${rightLabel}`;
}

function getTypeIcon(type: string) {
  const upper = type.toUpperCase();
  if (upper === "CP") return { glyph: "◷", color: collabTheme.gold, bg: "#fff6e8" };
  if (upper.includes("DEPLACEMENT")) return { glyph: "○", color: "#9c7d50", bg: "#faf5ed" };
  if (upper === "MAL") return { glyph: "+", color: collabTheme.accent, bg: collabTheme.redBg };
  return { glyph: "□", color: collabTheme.blue, bg: "#eef4ff" };
}

function AbsenceRow({ row }: { row: Record<string, unknown> }) {
  const statusTone = getAbsenceStatusTone(row.statut);
  const icon = getTypeIcon(String(row.type ?? ""));
  return (
    <div style={{ padding: "14px 14px", borderRadius: 16, background: "#fffdfb", border: `1px solid ${collabTheme.line}`, display: "grid", gridTemplateColumns: "34px 1fr auto", gap: 12, alignItems: "start" }}>
      <div style={{ width: 34, height: 34, borderRadius: 12, background: icon.bg, color: icon.color, display: "grid", placeItems: "center", fontSize: 17, fontWeight: 700 }}>
        {icon.glyph}
      </div>
      <div>
        <div style={{ ...collabSerifTitleStyle({ fontSize: 21 }) }}>{String(row.type ?? "Absence").replaceAll("_", " ")}</div>
        <div style={{ marginTop: 4, fontSize: 13, color: collabTheme.muted }}>{formatShortDateRange(row.date_debut, row.date_fin)}</div>
        {String(row.motif_refus ?? row.reason ?? "") ? <div style={{ marginTop: 8, fontSize: 12, color: collabTheme.accent }}>Motif : {String(row.motif_refus ?? row.reason ?? "")}</div> : null}
      </div>
      <span style={{ borderRadius: 999, padding: "6px 10px", background: statusTone.bg, color: statusTone.color, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{getAbsenceStatusLabel(row.statut)}</span>
    </div>
  );
}

export default function CollabAbsencesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    void getCollabProfile()
      .then((profile) => {
        if (!profile || profile.role !== "collaborateur") {
          router.replace("/collab/login");
          return;
        }
        return getMyAbsences()
          .then((data) => {
            setRows(data as Array<Record<string, unknown>>);
            setLoadError("");
          })
          .catch(() => {
            setRows([]);
            setLoadError("Impossible de charger vos absences pour le moment.");
          });
      })
      .catch(() => router.replace("/collab/login"));
  }, [router]);

  const sections = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      pending: rows.filter((row) => String(row.statut ?? "").toLowerCase().includes("attente")),
      treated: rows.filter((row) => {
        const status = String(row.statut ?? "").toLowerCase();
        const endDate = String(row.date_fin ?? row.date_debut ?? "9999-12-31");
        return !status.includes("attente") || endDate < today;
      }),
    };
  }, [rows]);

  return (
    <CollabPage>
      <CollabHeader
        title="Absences"
        subtitle="Suivez vos demandes et les retours manager."
        right={
          <Link href="/collab/absences/new" style={{ textDecoration: "none", borderRadius: 999, background: collabTheme.black, color: "#fff", padding: "7px 12px", fontSize: 12, fontWeight: 700 }}>
            + Nouvelle
          </Link>
        }
        showRefresh
      />

      <div style={{ display: "grid", gap: 16 }}>
        {loadError ? (
          <SectionCard style={{ background: "#fff7eb" }}>
            <div style={{ color: collabTheme.gold, fontSize: 13 }}>{loadError}</div>
          </SectionCard>
        ) : null}

        <SectionCard>
          <SectionTitle>En attente</SectionTitle>
          <div style={{ display: "grid", gap: 12 }}>
            {sections.pending.length ? sections.pending.map((row, index) => <AbsenceRow key={`pending-${index}`} row={row} />) : <div style={{ fontSize: 13, color: collabTheme.muted }}>Aucune demande en attente.</div>}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionTitle>Traitées</SectionTitle>
          <div style={{ display: "grid", gap: 12 }}>
            {sections.treated.length ? sections.treated.map((row, index) => <AbsenceRow key={`treated-${index}`} row={row} />) : <div style={{ fontSize: 13, color: collabTheme.muted }}>Aucune demande traitée.</div>}
          </div>
        </SectionCard>
      </div>

      <CollabBottomNav />
    </CollabPage>
  );
}
