"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PlanningExportSheet from "@/components/exports/PlanningExportSheet";
import {
  type ExportPlanningFormat,
  getPeriodDates,
  getPeriodLabel,
  getPeriodSubLabel,
  groupEmployeesForExport,
} from "@/components/exports/planning-print-utils";
import {
  type PlanningBinomes,
  type PlanningOverrides,
  type PlanningTriData,
  getPlanningMonthKey,
  loadPlanningBinomes,
  loadPlanningOverrides,
  loadPlanningTriData,
  syncPlanningFromSupabase,
} from "@/lib/planning-store";
import { loadPresenceThresholds, syncPresenceThresholdsFromSupabase } from "@/lib/presence-thresholds-store";
import { type PresenceThresholds } from "@/lib/presence-thresholds";
import {
  type RhCycles,
  type RhEmployee,
  loadRhCycles,
  loadRhEmployees,
  syncRhFromSupabase,
} from "@/lib/rh-store";

type PlanningPrintPageClientProps = {
  format: ExportPlanningFormat;
  anchor: string;
};

export default function PlanningPrintPageClient({ format, anchor }: PlanningPrintPageClientProps) {
  const printStartedRef = useRef(false);
  const anchorDate = useMemo(() => new Date(`${anchor}T00:00:00`), [anchor]);
  const [employees, setEmployees] = useState<RhEmployee[]>([]);
  const [cycles, setCycles] = useState<RhCycles>({});
  const [overrides, setOverrides] = useState<PlanningOverrides>({});
  const [triData, setTriData] = useState<PlanningTriData>({});
  const [binomes, setBinomes] = useState<PlanningBinomes>([]);
  const [presenceThresholds, setPresenceThresholds] = useState<PresenceThresholds>(loadPresenceThresholds());

  const dates = useMemo(() => getPeriodDates(format, anchorDate), [format, anchorDate]);
  const sections = useMemo(() => groupEmployeesForExport(employees), [employees]);
  const periodLabel = useMemo(() => getPeriodLabel(format, anchorDate), [format, anchorDate]);
  const periodSub = useMemo(() => getPeriodSubLabel(format, anchorDate), [format, anchorDate]);
  const periodHeader = useMemo(() => `${periodLabel} · ${periodSub}`, [periodLabel, periodSub]);
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
        await syncPlanningFromSupabase(getPlanningMonthKey(anchorDate));
        await syncPresenceThresholdsFromSupabase();
      } catch {
        // Keep local cache fallback.
      }
      if (!mounted) return;
      const monthKey = getPlanningMonthKey(anchorDate);
      setEmployees(loadRhEmployees());
      setCycles(loadRhCycles());
      setOverrides(loadPlanningOverrides());
      setTriData(loadPlanningTriData(monthKey));
      setBinomes(loadPlanningBinomes(monthKey));
      setPresenceThresholds(loadPresenceThresholds());
    };
    void loadData();
    return () => {
      mounted = false;
    };
  }, [anchorDate]);

  useEffect(() => {
    const title =
      format === "1m"
        ? `Planning mensuel - ${periodSub}`
        : `Planning 2 semaines - ${periodLabel}`;
    document.title = title;
  }, [format, periodLabel, periodSub]);

  useEffect(() => {
    if (printStartedRef.current) return;
    if (!employees.length) return;
    printStartedRef.current = true;
    const timeout = window.setTimeout(() => {
      window.print();
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [employees.length]);

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", padding: 12 }}>
      <style>{`
        @page {
          size: A3 landscape;
          margin: 10mm;
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
      <PlanningExportSheet
        format={format}
        dates={dates}
        periodHeader={periodHeader}
        sections={sections}
        employees={employees}
        cycles={cycles}
        overrides={overrides}
        triData={triData}
        binomes={binomes}
        presenceThresholds={presenceThresholds}
        printedAt={printedAt}
        elevated={false}
      />
    </div>
  );
}
