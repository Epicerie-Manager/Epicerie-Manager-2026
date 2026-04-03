"use client";

import { useEffect, useMemo, useState } from "react";
import PeriodSelector from "@/components/exports/PeriodSelector";
import TgExportSheet from "@/components/exports/TgExportSheet";
import { formatTgWeekLabel, getCurrentTgWeekId, getTgOverviewData } from "@/components/exports/tg-print-utils";
import { tgWeeks } from "@/lib/tg-data";
import { loadTgDefaultAssignments, loadTgRayons, loadTgWeekPlans, syncTgFromSupabase } from "@/lib/tg-store";
import { colors } from "@/lib/theme";

export default function ExportsTgPage() {
  const initialWeekId = getCurrentTgWeekId() || tgWeeks[0]?.id || "";
  const [weekId, setWeekId] = useState<string>(initialWeekId);
  const [error, setError] = useState("");
  const [sheetData, setSheetData] = useState(() =>
    getTgOverviewData(initialWeekId, loadTgRayons(), loadTgDefaultAssignments(), loadTgWeekPlans()),
  );

  const weekIndex = useMemo(() => Math.max(0, tgWeeks.findIndex((week) => week.id === weekId)), [weekId]);
  const periodLabel = "Vue d’ensemble TG / GB";
  const periodSub = useMemo(() => formatTgWeekLabel(weekId), [weekId]);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        await syncTgFromSupabase();
      } catch {
        // Keep local cache fallback.
      }
      if (!mounted) return;
      setSheetData(getTgOverviewData(weekId, loadTgRayons(), loadTgDefaultAssignments(), loadTgWeekPlans()));
    };
    void loadData();
    return () => {
      mounted = false;
    };
  }, [weekId]);

  const handlePrev = () => {
    const next = Math.max(0, weekIndex - 1);
    setWeekId(tgWeeks[next]?.id ?? weekId);
  };

  const handleNext = () => {
    const next = Math.min(tgWeeks.length - 1, weekIndex + 1);
    setWeekId(tgWeeks[next]?.id ?? weekId);
  };

  const handlePrint = () => {
    const params = new URLSearchParams({ weekId });
    const popup = window.open(`/exports/tg/print?${params.toString()}`, "exports-tg-print", "popup=yes,width=1700,height=1000");
    if (!popup) {
      setError("Autorisez les fenêtres popup pour lancer l'impression.");
      return;
    }
    popup.focus();
  };

  return (
    <div style={{ maxWidth: 1680, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: colors.textStrong, letterSpacing: "-0.04em" }}>
          Plan TG / GB
        </h1>
        <p style={{ fontSize: 13, color: colors.muted, marginTop: 6 }}>
          Préparez la vue d’ensemble hebdomadaire A3 paysage des rayons salés et sucrés.
        </p>
      </div>

      <PeriodSelector periodLabel={periodLabel} periodSub={periodSub} onPrev={handlePrev} onNext={handleNext} onPrint={handlePrint}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            value={weekId}
            onChange={(event) => setWeekId(event.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #dbe3eb",
              background: "#ffffff",
              color: colors.text,
              fontSize: 12,
              fontWeight: 600,
              minWidth: 190,
            }}
          >
            {tgWeeks.map((week) => (
              <option key={week.id} value={week.id}>
                {week.label}
              </option>
            ))}
          </select>
        </div>
      </PeriodSelector>

      {error ? (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      ) : null}

      <TgExportSheet
        weekLabel={periodSub}
        periodHeader={periodSub}
        saleRows={sheetData.sale}
        sucreRows={sheetData.sucre}
        elevated
      />
    </div>
  );
}
