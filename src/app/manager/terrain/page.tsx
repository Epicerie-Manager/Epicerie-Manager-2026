"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadRecentMetreAudits, type MetreAuditListItem } from "@/lib/followup-store";
import ManagerNotesPanel from "@/components/manager/manager-notes-panel";

function shellCard(): React.CSSProperties {
  return {
    borderRadius: 28,
    padding: "16px 18px 16px",
    background: "rgba(255,255,255,0.86)",
    border: "1px solid rgba(255,255,255,0.8)",
    boxShadow: "0 16px 40px rgba(17,24,39,0.08)",
  };
}

function metricTileStyle(): React.CSSProperties {
  return {
    borderRadius: 22,
    padding: "14px 14px 12px",
    background: "#fffdfb",
    border: "1px solid rgba(230,220,212,0.92)",
    boxShadow: "0 10px 24px rgba(17,24,39,0.04)",
  };
}

function formatCompactDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(date));
}

export default function ManagerTerrainLandingPage() {
  const [audits, setAudits] = useState<MetreAuditListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadPage = async () => {
      try {
        setLoading(true);
        const recent = await loadRecentMetreAudits(8);
        if (!cancelled) setAudits(recent);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadPage();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div style={shellCard()}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9f1239" }}>
            Terrain
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.06em", color: "#111827" }}>
            Visites terrain
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
            Création d&apos;une nouvelle visite terrain et consultation rapide de l&apos;historique.
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
            <Link
              href="/manager/terrain/nouveau"
              style={{
                textDecoration: "none",
                minHeight: 44,
                borderRadius: 999,
                padding: "0 18px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #be123c, #ef4444)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 800,
                boxShadow: "0 14px 28px rgba(190,24,93,0.24)",
              }}
            >
              Créer une visite terrain
            </Link>
          </div>
        </div>
      </div>

      <ManagerNotesPanel
        limit={6}
        title="Notes et taches terrain"
        description="Ajoute ici une note simple ou une tache a faire depuis le telephone. Tout remonte aussi sur le dashboard."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        <div style={metricTileStyle()}>
          <div style={{ fontSize: 11, color: "#6b7280" }}>Audits enregistrés</div>
          <div style={{ marginTop: 6, fontSize: 26, fontWeight: 800, color: "#111827" }}>{audits.length}</div>
        </div>
        <div style={metricTileStyle()}>
          <div style={{ fontSize: 11, color: "#6b7280" }}>Dernier score</div>
          <div style={{ marginTop: 6, fontSize: 26, fontWeight: 800, color: "#7c2d12" }}>
            {audits[0] ? `${Math.round(audits[0].globalScore)}%` : "-"}
          </div>
        </div>
        <div style={metricTileStyle()}>
          <div style={{ fontSize: 11, color: "#6b7280" }}>Dernier passage</div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: "#6d28d9" }}>
            {audits[0] ? formatCompactDate(audits[0].auditDate) : "-"}
          </div>
        </div>
      </div>

      <div style={shellCard()}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0f766e" }}>
            Dernières visites
          </div>
          {loading ? (
            <div style={{ fontSize: 14, color: "#6b7280" }}>Chargement des passages récents...</div>
          ) : audits.length ? (
            audits.map((audit) => (
              <div
                key={audit.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 10,
                  alignItems: "center",
                  borderRadius: 22,
                  background: "#fffdfb",
                  border: "1px solid rgba(230,220,212,0.95)",
                  padding: "14px 14px 15px",
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em" }}>
                    {audit.collaboratorName}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                    {formatCompactDate(audit.auditDate)} · {audit.rayon || "Rayon à préciser"}
                  </div>
                </div>
                <div
                  style={{
                    minWidth: 60,
                    textAlign: "center",
                    borderRadius: 999,
                    padding: "8px 10px",
                    background: audit.globalScore >= 80 ? "#ecfdf5" : audit.globalScore >= 60 ? "#fffbeb" : "#fef2f2",
                    color: audit.globalScore >= 80 ? "#166534" : audit.globalScore >= 60 ? "#92400e" : "#b91c1c",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {Math.round(audit.globalScore)}%
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 14, color: "#6b7280" }}>Aucune visite terrain saisie pour le moment.</div>
          )}
        </div>
      </div>
    </section>
  );
}
