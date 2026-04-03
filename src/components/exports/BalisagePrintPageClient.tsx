"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BalisageExportSheet from "@/components/exports/BalisageExportSheet";
import {
  getBalisageMonthLabel,
  getPreviousBalisageMonthId,
  type BalisagePrintStat,
} from "@/components/exports/balisage-print-utils";
import { attachRhActivityToBalisageStats } from "@/lib/balisage-rh";
import { loadBalisageData, syncBalisageFromSupabase } from "@/lib/balisage-store";
import { loadRhEmployees, syncRhFromSupabase } from "@/lib/rh-store";

type BalisagePrintPageClientProps = {
  monthId: string;
};

export default function BalisagePrintPageClient({ monthId }: BalisagePrintPageClientProps) {
  const printStartedRef = useRef(false);
  const [stats, setStats] = useState<BalisagePrintStat[]>([]);
  const monthLabel = useMemo(() => getBalisageMonthLabel(monthId), [monthId]);
  const printedAt = useMemo(
    () =>
      new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [],
  );

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        await syncRhFromSupabase();
        await syncBalisageFromSupabase();
      } catch {
        // fallback cache
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

  useEffect(() => {
    document.title = `Contrôle balisage - ${monthLabel}`;
  }, [monthLabel]);

  useEffect(() => {
    if (printStartedRef.current) return;
    if (!stats.length) return;
    printStartedRef.current = true;
    const timeout = window.setTimeout(() => {
      window.print();
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [stats.length]);

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", padding: 12 }}>
      <style>{`
        @page {
          size: A3 landscape;
          margin: 7mm;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-sheet {
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
      <BalisageExportSheet monthId={monthId} monthLabel={monthLabel} printedAt={printedAt} stats={stats} elevated={false} />
    </div>
  );
}
