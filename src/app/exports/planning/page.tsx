"use client";

import { useEffect, useMemo, useState } from "react";
import PeriodSelector from "@/components/exports/PeriodSelector";
import PlanningExportSheet from "@/components/exports/PlanningExportSheet";
import {
  type ExportPlanningFormat,
  addDays,
  addMonths,
  getMondayOfWeek,
  getPeriodDates,
  getPeriodLabel,
  getPeriodSubLabel,
  groupEmployeesForExport,
} from "@/components/exports/planning-print-utils";
import {
  type PlanningBinomes,
  type PlanningOverrides,
  formatPlanningDate,
  getPlanningMonthKey,
  loadPlanningBinomes,
  loadPlanningOverrides,
  loadPlanningTriData,
  syncPlanningFromSupabase,
  type PlanningTriData,
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
import { colors } from "@/lib/theme";

function getInitialAnchor(format: ExportPlanningFormat) {
  const now = new Date();
  return format === "1m" ? new Date(now.getFullYear(), now.getMonth(), 1) : getMondayOfWeek(now);
}

export default function ExportsPlanningPage() {
  const [format, setFormat] = useState<ExportPlanningFormat>("2s");
  const [anchorDate, setAnchorDate] = useState<Date>(() => getInitialAnchor("2s"));
  const [dateInput, setDateInput] = useState(() => formatPlanningDate(getInitialAnchor("2s")));
  const [monthInput, setMonthInput] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [employees, setEmployees] = useState<RhEmployee[]>([]);
  const [cycles, setCycles] = useState<RhCycles>({});
  const [overrides, setOverrides] = useState<PlanningOverrides>({});
  const [triData, setTriData] = useState<PlanningTriData>({});
  const [binomes, setBinomes] = useState<PlanningBinomes>([]);
  const [presenceThresholds, setPresenceThresholds] = useState<PresenceThresholds>(loadPresenceThresholds());
  const [error, setError] = useState("");

  const dates = useMemo(() => getPeriodDates(format, anchorDate), [format, anchorDate]);
  const sections = useMemo(() => groupEmployeesForExport(employees), [employees]);
  const periodLabel = useMemo(() => getPeriodLabel(format, anchorDate), [format, anchorDate]);
  const periodSub = useMemo(() => getPeriodSubLabel(format, anchorDate), [format, anchorDate]);
  const periodHeader = useMemo(() => `${periodLabel} · ${periodSub}`, [periodLabel, periodSub]);

  const updateAnchor = (nextDate: Date, nextFormat: ExportPlanningFormat = format) => {
    setAnchorDate(nextDate);
    if (nextFormat === "2s") {
      setDateInput(formatPlanningDate(nextDate));
      return;
    }
    setMonthInput(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`);
  };

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

  const handleFormatChange = (value: string) => {
    const nextFormat = value === "1m" ? "1m" : "2s";
    setFormat(nextFormat);
    updateAnchor(getInitialAnchor(nextFormat), nextFormat);
  };

  const handlePrev = () => {
    updateAnchor(format === "1m" ? addMonths(anchorDate, -1) : addDays(anchorDate, -14));
  };

  const handleNext = () => {
    updateAnchor(format === "1m" ? addMonths(anchorDate, 1) : addDays(anchorDate, 14));
  };

  const handleDateApply = () => {
    const next = new Date(`${dateInput}T00:00:00`);
    if (Number.isNaN(next.getTime())) return;
    updateAnchor(next, "2s");
  };

  const handleMonthApply = () => {
    const [year, month] = monthInput.split("-").map(Number);
    if (!year || !month) return;
    updateAnchor(new Date(year, month - 1, 1), "1m");
  };

  const handlePrint = () => {
    const params = new URLSearchParams({
      format,
      anchor: formatPlanningDate(anchorDate),
    });
    const popup = window.open(`/exports/planning/print?${params.toString()}`, "exports-planning-print", "popup=yes,width=1700,height=1000");
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
          Planning équipe
        </h1>
        <p style={{ fontSize: 13, color: colors.muted, marginTop: 6 }}>
          Préparez une affiche A3 paysage pour l’équipe, sans l’habillage manager.
        </p>
      </div>

      <PeriodSelector
        formats={[
          { label: "2 semaines", value: "2s" },
          { label: "1 mois", value: "1m" },
        ]}
        selectedFormat={format}
        onFormatChange={handleFormatChange}
        periodLabel={periodLabel}
        periodSub={periodSub}
        onPrev={handlePrev}
        onNext={handleNext}
        onPrint={handlePrint}
      >
        {format === "2s" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="date"
              value={dateInput}
              onChange={(event) => setDateInput(event.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #dbe3eb",
                background: "#ffffff",
                color: colors.text,
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            <button
              type="button"
              onClick={handleDateApply}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: "#ffffff",
                border: "1px solid #dbe3eb",
                color: colors.muted,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Appliquer
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="month"
              value={monthInput}
              onChange={(event) => setMonthInput(event.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #dbe3eb",
                background: "#ffffff",
                color: colors.text,
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            <button
              type="button"
              onClick={handleMonthApply}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: "#ffffff",
                border: "1px solid #dbe3eb",
                color: colors.muted,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Appliquer
            </button>
          </div>
        )}
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
        elevated
      />
    </div>
  );
}
