"use client";

import { useEffect, useMemo, useState } from "react";
import PeriodSelector from "@/components/exports/PeriodSelector";
import BalisageExportSheet from "@/components/exports/BalisageExportSheet";
import {
  getBalisageMonthLabel,
  getCurrentBalisageMonthId,
  getPreviousBalisageMonthId,
  type BalisagePrintStat,
} from "@/components/exports/balisage-print-utils";
import { balisageMonths } from "@/lib/balisage-data";
import { attachRhActivityToBalisageStats } from "@/lib/balisage-rh";
import { loadBalisageData, syncBalisageFromSupabase } from "@/lib/balisage-store";
import { loadRhEmployees, syncRhFromSupabase } from "@/lib/rh-store";
import { colors } from "@/lib/theme";

export default function ExportsBalisagePage() {
  const [monthId, setMonthId] = useState<string>(() => getCurrentBalisageMonthId());
  const [stats, setStats] = useState<BalisagePrintStat[]>([]);
  const [error, setError] = useState("");

  const monthIndex = useMemo(
    () => Math.max(0, balisageMonths.findIndex((month) => month.id === monthId)),
    [monthId],
  );
  const periodLabel = "Contrôle balisage";
  const periodSub = useMemo(() => getBalisageMonthLabel(monthId), [monthId]);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        await syncRhFromSupabase();
        await syncBalisageFromSupabase();
      } catch {
        // Keep local cache fallback.
      }
      if (!mounted) return;
      const rhEmployees = loadRhEmployees();
      const balisageData = loadBalisageData();
      const monthStats = balisageData[monthId] ?? [];
      const previousMonthId = getPreviousBalisageMonthId(monthId);
      const previousStats = previousMonthId ? balisageData[previousMonthId] ?? [] : [];
      const previousMap = new Map(previousStats.map((employee) => [employee.name.trim().toUpperCase(), employee.total]));
      const currentWithRh = attachRhActivityToBalisageStats(monthStats, rhEmployees).map((employee) => {
        const previousTotal = previousMonthId ? (previousMap.get(employee.name.trim().toUpperCase()) ?? 0) : null;
        return {
          ...employee,
          previousTotal,
          deltaFromPrevious: previousTotal === null ? null : employee.total - previousTotal,
        };
      });
      setStats(currentWithRh);
    };
    void loadData();
    return () => {
      mounted = false;
    };
  }, [monthId]);

  const handlePrev = () => {
    const next = Math.max(0, monthIndex - 1);
    setMonthId(balisageMonths[next]?.id ?? monthId);
  };

  const handleNext = () => {
    const next = Math.min(balisageMonths.length - 1, monthIndex + 1);
    setMonthId(balisageMonths[next]?.id ?? monthId);
  };

  const handlePrint = () => {
    const params = new URLSearchParams({ monthId });
    const popup = window.open(`/exports/balisage/print?${params.toString()}`, "exports-balisage-print", "popup=yes,width=1700,height=1000");
    if (!popup) {
      setError("Autorisez les fenêtres popup pour lancer l'impression.");
      return;
    }
    popup.focus();
  };

  return (
    <div style={{ maxWidth: 1520, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: colors.textStrong, letterSpacing: "-0.04em" }}>
          Contrôle balisage
        </h1>
        <p style={{ fontSize: 13, color: colors.muted, marginTop: 6 }}>
          Préparez une synthèse mensuelle A3 paysage pour le suivi balisage équipe.
        </p>
      </div>

      <PeriodSelector periodLabel={periodLabel} periodSub={periodSub} onPrev={handlePrev} onNext={handleNext} onPrint={handlePrint}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            value={monthId}
            onChange={(event) => setMonthId(event.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #dbe3eb",
              background: "#ffffff",
              color: colors.text,
              fontSize: 12,
              fontWeight: 600,
              minWidth: 170,
            }}
          >
            {balisageMonths.map((month) => (
              <option key={month.id} value={month.id}>
                {month.label}
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

      <BalisageExportSheet monthId={monthId} monthLabel={periodSub} stats={stats} elevated />
    </div>
  );
}
