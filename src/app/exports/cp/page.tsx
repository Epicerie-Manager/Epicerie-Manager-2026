"use client";

import { useEffect, useMemo, useState } from "react";
import PeriodSelector from "@/components/exports/PeriodSelector";
import CpExportSheet from "@/components/exports/CpExportSheet";
import {
  formatIsoDate,
  formatPeriodLabel,
  getCpRequestsInPeriod,
  getWeeksInRange,
  parseSerializedManualCpPeriods,
  serializeManualCpPeriods,
  shiftPeriodByWeeks,
} from "@/components/exports/cp-print-utils";
import { loadAbsenceRequests, syncAbsencesFromSupabase } from "@/lib/absences-store";
import { type AbsenceRequest } from "@/lib/absences-data";
import {
  getPlanningCpUpdatedEventName,
  loadPlanningCpExports,
  savePlanningCpExportToSupabase,
  syncPlanningCpExportsFromSupabase,
  type PlanningCpExportRecord,
} from "@/lib/planning-cp-store";
import { loadRhEmployees, syncRhFromSupabase, type RhEmployee } from "@/lib/rh-store";
import { colors } from "@/lib/theme";

function getDefaultStartIso() {
  return "2026-06-01";
}

function getDefaultEndIso() {
  return "2026-10-31";
}

export default function ExportsCpPage() {
  const [selectedExportId, setSelectedExportId] = useState<string | null>(null);
  const [title, setTitle] = useState("Planning CP");
  const [faridaStartIso, setFaridaStartIso] = useState("");
  const [faridaEndIso, setFaridaEndIso] = useState("");
  const [faridaPeriods, setFaridaPeriods] = useState<ReturnType<typeof parseSerializedManualCpPeriods>>([]);
  const [history, setHistory] = useState<PlanningCpExportRecord[]>([]);
  const [startIso, setStartIso] = useState<string>(getDefaultStartIso);
  const [endIso, setEndIso] = useState<string>(getDefaultEndIso);
  const [draftStartIso, setDraftStartIso] = useState<string>(getDefaultStartIso);
  const [draftEndIso, setDraftEndIso] = useState<string>(getDefaultEndIso);
  const [employees, setEmployees] = useState<RhEmployee[]>([]);
  const [requests, setRequests] = useState<AbsenceRequest[]>([]);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");

  const weeks = useMemo(() => getWeeksInRange(startIso, endIso), [startIso, endIso]);
  const periodLabel = "Planning CP";
  const periodSub = useMemo(() => formatPeriodLabel(startIso, endIso), [startIso, endIso]);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        await syncRhFromSupabase();
        await syncAbsencesFromSupabase();
        await syncPlanningCpExportsFromSupabase();
      } catch {
        // Keep local cache fallback.
      }
      if (!mounted) return;
      setEmployees(loadRhEmployees());
      setRequests(getCpRequestsInPeriod(loadAbsenceRequests(), startIso, endIso));
      setHistory(loadPlanningCpExports());
    };
    void loadData();
    return () => {
      mounted = false;
    };
  }, [startIso, endIso]);

  useEffect(() => {
    const refreshHistory = () => {
      setHistory(loadPlanningCpExports());
    };
    refreshHistory();
    const eventName = getPlanningCpUpdatedEventName();
    window.addEventListener(eventName, refreshHistory);
    return () => window.removeEventListener(eventName, refreshHistory);
  }, []);

  const handlePrev = () => {
    const shifted = shiftPeriodByWeeks(startIso, endIso, -weeks.length);
    setStartIso(shifted.startIso);
    setEndIso(shifted.endIso);
    setDraftStartIso(shifted.startIso);
    setDraftEndIso(shifted.endIso);
  };

  const handleNext = () => {
    const shifted = shiftPeriodByWeeks(startIso, endIso, weeks.length);
    setStartIso(shifted.startIso);
    setEndIso(shifted.endIso);
    setDraftStartIso(shifted.startIso);
    setDraftEndIso(shifted.endIso);
  };

  const handleApply = () => {
    if (!draftStartIso || !draftEndIso || draftEndIso < draftStartIso) {
      setError("Choisissez une période valide.");
      return;
    }
    setError("");
    setStartIso(formatIsoDate(new Date(`${draftStartIso}T00:00:00`)));
    setEndIso(formatIsoDate(new Date(`${draftEndIso}T00:00:00`)));
    setSaveMessage("");
  };

  const handleAddFaridaPeriod = () => {
    if (!faridaStartIso || !faridaEndIso) {
      setError("Choisissez une période Farida valide.");
      return;
    }

    const nextSerialized = serializeManualCpPeriods([
      ...faridaPeriods,
      {
        startIso: faridaStartIso <= faridaEndIso ? faridaStartIso : faridaEndIso,
        endIso: faridaStartIso <= faridaEndIso ? faridaEndIso : faridaStartIso,
        label: "",
        days: 0,
      },
    ]);
    setFaridaPeriods(parseSerializedManualCpPeriods(nextSerialized, startIso, endIso));
    setFaridaStartIso("");
    setFaridaEndIso("");
    setError("");
    setSaveMessage("");
  };

  const handleRemoveFaridaPeriod = (indexToRemove: number) => {
    setFaridaPeriods((current) => current.filter((_, index) => index !== indexToRemove));
    setSaveMessage("");
  };

  const handleSelectHistory = (item: PlanningCpExportRecord) => {
    setSelectedExportId(item.id);
    setTitle(item.title);
    setStartIso(item.startDate);
    setEndIso(item.endDate);
    setDraftStartIso(item.startDate);
    setDraftEndIso(item.endDate);
    setFaridaPeriods(
      item.manualAbsences
        .filter((absence) => absence.employeeName === "FARIDA")
        .map((absence) => ({
          startIso: absence.startDate,
          endIso: absence.endDate,
          label: formatPeriodLabel(absence.startDate, absence.endDate),
          days: parseSerializedManualCpPeriods(
            `${absence.startDate}:${absence.endDate}`,
            item.startDate,
            item.endDate,
          )[0]?.days ?? 0,
        })),
    );
    setSaveMessage("");
    setError("");
  };

  const handleCreateNewExport = () => {
    setSelectedExportId(null);
    setSaveMessage("");
    setError("");
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Renseignez un titre avant d'enregistrer.");
      return;
    }
    if (!startIso || !endIso || endIso < startIso) {
      setError("Choisissez une période valide.");
      return;
    }

    try {
      setSaveBusy(true);
      setError("");
      setSaveMessage("");
      const saved = await savePlanningCpExportToSupabase({
        id: selectedExportId,
        title,
        startDate: startIso,
        endDate: endIso,
        manualAbsences: faridaPeriods.map((period) => ({
          employeeName: "FARIDA",
          absenceType: "CP",
          startDate: period.startIso,
          endDate: period.endIso,
        })),
      });
      setSelectedExportId(saved.id);
      setSaveMessage(selectedExportId ? "Planning CP mis à jour." : "Planning CP enregistré.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Impossible d'enregistrer le planning CP.");
    } finally {
      setSaveBusy(false);
    }
  };

  const handlePrint = () => {
    if (!startIso || !endIso || endIso < startIso) {
      setError("Choisissez une période valide.");
      return;
    }
    const params = new URLSearchParams({
      start: startIso,
      end: endIso,
      title,
      farida: serializeManualCpPeriods(faridaPeriods),
    });
    const popup = window.open(`/exports/cp/print?${params.toString()}`, "exports-cp-print", "popup=yes,width=1700,height=1000");
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
          Planning CP
        </h1>
        <p style={{ fontSize: 13, color: colors.muted, marginTop: 6 }}>
          Préparez une frise A3 paysage des congés payés approuvés sur la période de votre choix.
        </p>
      </div>

      <PeriodSelector periodLabel={periodLabel} periodSub={periodSub} onPrev={handlePrev} onNext={handleNext} onPrint={handlePrint}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Titre imprime"
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #dbe3eb",
              background: "#ffffff",
              color: colors.text,
              fontSize: 12,
              fontWeight: 600,
              minWidth: 180,
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              padding: "6px 8px",
              borderRadius: 10,
              border: "1px solid #dbe3eb",
              background: "#ffffff",
            }}
          >
            <span style={{ fontSize: 12, color: colors.text, fontWeight: 800 }}>Farida</span>
            <input
              type="date"
              value={faridaStartIso}
              onChange={(event) => setFaridaStartIso(event.target.value)}
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
            <span style={{ fontSize: 12, color: colors.muted, fontWeight: 700 }}>au</span>
            <input
              type="date"
              value={faridaEndIso}
              onChange={(event) => setFaridaEndIso(event.target.value)}
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
              onClick={handleAddFaridaPeriod}
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
              Ajouter
            </button>
          </div>
          <input
            type="date"
            value={draftStartIso}
            onChange={(event) => setDraftStartIso(event.target.value)}
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
          <span style={{ fontSize: 12, color: colors.muted, fontWeight: 700 }}>au</span>
          <input
            type="date"
            value={draftEndIso}
            onChange={(event) => setDraftEndIso(event.target.value)}
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
            onClick={handleApply}
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
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saveBusy}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              background: "#d40511",
              border: "1px solid #b8040f",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 800,
              opacity: saveBusy ? 0.7 : 1,
            }}
          >
            {saveBusy ? "Enregistrement..." : "Enregistrer"}
          </button>
          <button
            type="button"
            onClick={handleCreateNewExport}
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
            Nouveau planning
          </button>
        </div>
      </PeriodSelector>

      {faridaPeriods.length ? (
        <div
          style={{
            marginBottom: 12,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {faridaPeriods.map((period, index) => (
            <button
              key={`${period.startIso}-${period.endIso}-${index}`}
              type="button"
              onClick={() => handleRemoveFaridaPeriod(index)}
              title="Retirer cette période"
              style={{
                padding: "7px 10px",
                borderRadius: 999,
                border: "1px solid #fecdd3",
                background: "#fff1f2",
                color: "#9f1239",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {period.label}
            </button>
          ))}
        </div>
      ) : null}

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

      {saveMessage ? (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #86efac",
            background: "#ecfdf5",
            color: "#166534",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {saveMessage}
        </div>
      ) : null}

      {history.length ? (
        <div
          style={{
            marginBottom: 12,
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: colors.textStrong, letterSpacing: "-0.01em" }}>
            Historique des plannings CP
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {history.map((item) => {
              const active = item.id === selectedExportId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectHistory(item)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: `1px solid ${active ? "#fecaca" : "#dbe3eb"}`,
                    background: active ? "#fff1f2" : "#ffffff",
                    color: active ? "#991b1b" : colors.text,
                    fontSize: 12,
                    textAlign: "left",
                    minWidth: 220,
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{item.title}</div>
                  <div style={{ marginTop: 3, color: colors.muted, fontSize: 11 }}>
                    {formatPeriodLabel(item.startDate, item.endDate)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <CpExportSheet
        title={title}
        startIso={startIso}
        endIso={endIso}
        weeks={weeks}
        employees={employees}
        requests={requests}
        faridaPeriods={faridaPeriods}
        periodHeader={periodSub}
        elevated
      />
    </div>
  );
}
