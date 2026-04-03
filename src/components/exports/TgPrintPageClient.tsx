"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TgExportSheet from "@/components/exports/TgExportSheet";
import { formatTgWeekLabel, getTgOverviewData } from "@/components/exports/tg-print-utils";
import { loadTgDefaultAssignments, loadTgRayons, loadTgWeekPlans, syncTgFromSupabase } from "@/lib/tg-store";

type TgPrintPageClientProps = {
  weekId: string;
};

export default function TgPrintPageClient({ weekId }: TgPrintPageClientProps) {
  const printStartedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [sheetData, setSheetData] = useState(() =>
    getTgOverviewData(weekId, loadTgRayons(), loadTgDefaultAssignments(), loadTgWeekPlans()),
  );
  const weekLabel = useMemo(() => formatTgWeekLabel(weekId), [weekId]);
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
        await syncTgFromSupabase();
      } catch {
        // keep local fallback
      }
      if (!mounted) return;
      setSheetData(getTgOverviewData(weekId, loadTgRayons(), loadTgDefaultAssignments(), loadTgWeekPlans()));
      setReady(true);
    };
    void loadData();
    return () => {
      mounted = false;
    };
  }, [weekId]);

  useEffect(() => {
    document.title = `Plan TG-GB - ${weekLabel}`;
  }, [weekLabel]);

  useEffect(() => {
    if (printStartedRef.current) return;
    if (!ready) return;
    printStartedRef.current = true;
    const timeout = window.setTimeout(() => {
      window.print();
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [ready]);

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", padding: 12 }}>
      <style>{`
        @page {
          size: A3 landscape;
          margin: 8mm;
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
          .tg-page-break {
            break-before: page;
            page-break-before: always;
          }
        }
      `}</style>
      <TgExportSheet
        weekLabel={weekLabel}
        periodHeader={weekLabel}
        saleRows={sheetData.sale}
        sucreRows={sheetData.sucre}
        printedAt={printedAt}
        elevated={false}
      />
    </div>
  );
}
