"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CpExportSheet from "@/components/exports/CpExportSheet";
import {
  formatPeriodLabel,
  getCpRequestsInPeriod,
  getWeeksInRange,
  parseSerializedManualCpPeriods,
} from "@/components/exports/cp-print-utils";
import { loadAbsenceRequests, syncAbsencesFromSupabase } from "@/lib/absences-store";
import { type AbsenceRequest } from "@/lib/absences-data";
import { loadRhEmployees, syncRhFromSupabase, type RhEmployee } from "@/lib/rh-store";

type CpPrintPageClientProps = {
  title: string;
  startIso: string;
  endIso: string;
  faridaSerialized: string;
};

export default function CpPrintPageClient({ title, startIso, endIso, faridaSerialized }: CpPrintPageClientProps) {
  const printStartedRef = useRef(false);
  const [employees, setEmployees] = useState<RhEmployee[]>([]);
  const [requests, setRequests] = useState<AbsenceRequest[]>([]);

  const weeks = useMemo(() => getWeeksInRange(startIso, endIso), [startIso, endIso]);
  const periodHeader = useMemo(() => formatPeriodLabel(startIso, endIso), [startIso, endIso]);
  const faridaPeriods = useMemo(
    () => parseSerializedManualCpPeriods(faridaSerialized, startIso, endIso),
    [faridaSerialized, startIso, endIso],
  );
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
        await syncAbsencesFromSupabase();
      } catch {
        // fallback cache
      }
      if (!mounted) return;
      setEmployees(loadRhEmployees());
      setRequests(getCpRequestsInPeriod(loadAbsenceRequests(), startIso, endIso));
    };
    void loadData();
    return () => {
      mounted = false;
    };
  }, [startIso, endIso]);

  useEffect(() => {
    document.title = `${title} - ${periodHeader}`;
  }, [periodHeader, title]);

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
          margin: 5mm;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .print-sheet {
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
      <CpExportSheet
        title={title}
        startIso={startIso}
        endIso={endIso}
        weeks={weeks}
        employees={employees}
        requests={requests}
        faridaPeriods={faridaPeriods}
        periodHeader={periodHeader}
        printedAt={printedAt}
        elevated={false}
      />
    </div>
  );
}
