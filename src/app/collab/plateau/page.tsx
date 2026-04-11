"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CollabBottomNav, CollabHeader, CollabPage, SectionCard } from "@/components/collab/layout";
import PlateauExcelViewer from "@/components/plateau/plateau-excel-viewer";
import { collabTheme } from "@/components/collab/theme";
import { getCollabProfile } from "@/lib/collab-auth";
import {
  getActiveExcelSource,
  loadPlateauExcelSources,
  syncPlateauExcelSourcesFromSupabase,
  type PlateauExcelSource,
} from "@/lib/plateau-store";

function formatWeekLabel(source: { weekNumber: number; implantationDate: string; desimplantationDate: string }) {
  const from = new Date(`${source.implantationDate}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
  const to = new Date(`${source.desimplantationDate}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
  return `S${source.weekNumber} · du ${from} au ${to}`;
}

export default function CollabPlateauPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState("PLATEAU A");
  const [activeSource, setActiveSource] = useState<PlateauExcelSource | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      const profile = await getCollabProfile();
      if (!profile || profile.role !== "collaborateur") {
        router.replace("/collab/login");
        return;
      }

      await syncPlateauExcelSourcesFromSupabase();
      const sources = loadPlateauExcelSources();
      if (cancelled) return;
      setActiveSource(getActiveExcelSource(sources) ?? sources.at(-1) ?? null);
      setLastRefreshAt(new Date());
      setReady(true);
    }

    void loadPage().catch(() => router.replace("/collab/login"));
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await syncPlateauExcelSourcesFromSupabase();
      const sources = loadPlateauExcelSources();
      setActiveSource(getActiveExcelSource(sources) ?? sources.at(-1) ?? null);
      setLastRefreshAt(new Date());
    } finally {
      setRefreshing(false);
    }
  }

  if (!ready) return null;

  return (
    <CollabPage>
      <CollabHeader
        title="Plans Plateau"
        subtitle={activeSource ? formatWeekLabel(activeSource) : "Aucun fichier partagé pour le moment"}
        showRefresh
        onRefresh={handleRefresh}
        refreshing={refreshing}
        lastRefreshAt={lastRefreshAt}
      />

      <SectionCard style={{ display: "grid", gap: 14 }}>
        <div style={{ fontSize: 13, color: collabTheme.muted }}>
          Retrouvez le plan plateau partagé par la semaine en cours. Les vues A, B et C lisent exactement le même fichier Excel que le manager.
        </div>

        {activeSource ? (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["PLATEAU A", "PLATEAU B", "PLATEAU C"].map((sheet) => (
                <button
                  key={sheet}
                  type="button"
                  onClick={() => setSelectedSheetName(sheet)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 999,
                    border: `1px solid ${selectedSheetName === sheet ? collabTheme.accent : collabTheme.line}`,
                    background: selectedSheetName === sheet ? collabTheme.accent : "#fffdfb",
                    color: selectedSheetName === sheet ? "#fff8f1" : collabTheme.muted,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {sheet}
                </button>
              ))}
            </div>

            <PlateauExcelViewer
              filePath={activeSource.filePath}
              sheetName={selectedSheetName}
              weekLabel={formatWeekLabel(activeSource)}
            />
          </>
        ) : (
          <div
            style={{
              padding: "18px 16px",
              borderRadius: 16,
              border: `1px dashed ${collabTheme.line}`,
              background: "#fffdfb",
              textAlign: "center",
              fontSize: 13,
              color: collabTheme.muted,
            }}
          >
            Aucun plan plateau disponible pour cette semaine.
          </div>
        )}
      </SectionCard>

      <CollabBottomNav />
    </CollabPage>
  );
}
