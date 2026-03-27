"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ModuleHeader } from "@/components/layout/module-header";
import {
  balisageMonths,
  balisageObjective,
  type BalisageEmployeeStat,
} from "@/lib/balisage-data";
import { getBalisageUpdatedEventName, loadBalisageData, saveBalisageData, saveBalisageEntryToSupabase, syncBalisageFromSupabase } from "@/lib/balisage-store";
import { moduleThemes } from "@/lib/theme";

type SortBy = "name" | "total" | "alert";

function getProgress(total: number) {
  return Math.min(Math.round((total / balisageObjective) * 100), 100);
}

function parseMonthFromId(monthId: string) {
  const [rawMonth, rawYear] = monthId.split("_");
  const year = Number(rawYear);
  const monthMap: Record<string, number> = {
    JANV: 0,
    FEVR: 1,
    MARS: 2,
    AVRIL: 3,
    MAI: 4,
    JUIN: 5,
    JUIL: 6,
    AOUT: 7,
    SEPT: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11,
  };
  return {
    year,
    month: monthMap[rawMonth] ?? 0,
  };
}

function getDynamicStatus(total: number, monthId: string, today = new Date()) {
  const { year, month } = parseMonthFromId(monthId);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const totalDays = monthEnd.getDate();

  const isPastMonth = today > monthEnd;
  const isFutureMonth = today < monthStart;

  if (isFutureMonth) return "OK";
  if (isPastMonth) {
    if (total >= balisageObjective) return "OK";
    if (total >= balisageObjective * 0.9) return "En retard";
    return "Alerte";
  }

  const completedDays = Math.max(today.getDate() - 1, 0);
  const remainingDays = Math.max(totalDays - completedDays, 1);
  const remainingControls = Math.max(balisageObjective - total, 0);

  const nominalDailyPace = balisageObjective / totalDays;
  const requiredDailyPace = remainingControls / remainingDays;
  const paceRatio = requiredDailyPace / nominalDailyPace;

  if (paceRatio <= 1) return "OK";
  if (paceRatio <= 1.1) return "En retard";
  return "Alerte";
}

function getCurrentBalisageMonthIndex(today = new Date()) {
  const monthKeys = ["JANV", "FEVR", "MARS", "AVRIL", "MAI", "JUIN", "JUIL", "AOUT", "SEPT", "OCT", "NOV", "DEC"];
  const key = monthKeys[today.getMonth()] ?? "JANV";
  const fullId = `${key}_${today.getFullYear()}`;
  const exactIndex = balisageMonths.findIndex((month) => month.id === fullId);
  if (exactIndex >= 0) return exactIndex;
  const monthOnlyIndex = balisageMonths.findIndex((month) => month.id.startsWith(`${key}_`));
  if (monthOnlyIndex >= 0) return monthOnlyIndex;
  return 0;
}

export default function StatsPage() {
  const [activeMonthIndex, setActiveMonthIndex] = useState(() => getCurrentBalisageMonthIndex());
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingTotal, setEditingTotal] = useState("");
  const [editingErrorRate, setEditingErrorRate] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [localData, setLocalData] = useState<Record<string, BalisageEmployeeStat[]>>(() => loadBalisageData());

  const theme = moduleThemes.balisage;
  const activeMonth = balisageMonths[activeMonthIndex];
  const activeStats = useMemo(() => localData[activeMonth.id] ?? [], [activeMonth.id, localData]);

  const sortedStats = useMemo(() => {
    const list = [...activeStats];
    if (sortBy === "total") return list.sort((a, b) => b.total - a.total);
    if (sortBy === "alert") return list.sort((a, b) => a.total - b.total);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [activeStats, sortBy]);

  useEffect(() => {
    saveBalisageData(localData);
  }, [localData]);

  useEffect(() => {
    const refresh = () => setLocalData(loadBalisageData());
    void syncBalisageFromSupabase().then((synced) => {
      if (synced) refresh();
    });
    const eventName = getBalisageUpdatedEventName();
    window.addEventListener(eventName, refresh);
    return () => window.removeEventListener(eventName, refresh);
  }, []);

  const totalControls = activeStats.reduce((sum, item) => sum + item.total, 0);
  const employeesOk = activeStats.filter((item) => getDynamicStatus(item.total, activeMonth.id) === "OK").length;
  const employeesAlert = activeStats.filter((item) => getDynamicStatus(item.total, activeMonth.id) === "Alerte").length;
  const bestEmployee = [...activeStats].sort((a, b) => b.total - a.total)[0];
  const globalPercent = Math.min(
    Math.round((totalControls / (Math.max(activeStats.length, 1) * balisageObjective)) * 100),
    100,
  );

  const openEdit = (employee: BalisageEmployeeStat) => {
    setSaveError(null);
    setEditingName(employee.name);
    setEditingTotal(String(employee.total));
    setEditingErrorRate(employee.errorRate === null ? "" : String(employee.errorRate));
  };

  const saveEdit = async () => {
    if (!editingName) return;
    const newTotal = Number.isNaN(Number(editingTotal)) ? null : Number(editingTotal);
    const newErrorRate =
      editingErrorRate.trim() === ""
        ? null
        : Number.isNaN(Number(editingErrorRate))
          ? null
          : Number(editingErrorRate);
    const name = editingName;
    const monthId = activeMonth.id;
    let savedEntry: BalisageEmployeeStat | undefined;

    setSaveError(null);
    setIsSaving(true);
    setLocalData((current) => {
      const updated = (current[monthId] ?? []).map((employee) =>
        employee.name === name
          ? {
              ...employee,
              total: newTotal ?? employee.total,
              errorRate: editingErrorRate.trim() === "" ? null : (newErrorRate ?? employee.errorRate),
            }
          : employee,
      );
      const next = { ...current, [monthId]: updated };
      savedEntry = updated.find((employee) => employee.name === name);
      return next;
    });

    if (!savedEntry) {
      setSaveError("Impossible de retrouver la ligne à enregistrer.");
      setIsSaving(false);
      return;
    }

    const synced = await saveBalisageEntryToSupabase(
      monthId,
      name,
      savedEntry.total,
      savedEntry.errorRate,
    );

    if (!synced) {
      setSaveError("Modification enregistrée localement, mais la synchronisation Supabase a échoué.");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    setEditingName(null);
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    borderRadius: "999px",
    border: `1px solid ${active ? theme.color : "#dbe3eb"}`,
    background: active ? theme.medium : "#fff",
    color: active ? theme.color : "#64748b",
    fontWeight: active ? 700 : 500,
    fontSize: "12px",
    padding: "7px 12px",
  });

  const statusStyle = (status: string): React.CSSProperties => {
    if (status === "OK") return { background: "#dcfce7", color: "#166534" };
    if (status === "En retard") return { background: "#fef3c7", color: "#92400e" };
    return { background: "#fee2e2", color: "#991b1b" };
  };

  return (
    <section style={{ display: "grid", gap: "14px", marginTop: "20px" }}>
      <ModuleHeader
        compact
        moduleKey="balisage"
        title="Stats balisage"
        description="Vue manager interactive: tri rapide, suivi du mois, edition des valeurs et lecture immediate des alertes equipe."
      />

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button type="button" style={chipStyle(false)} onClick={() => setActiveMonthIndex((index) => Math.max(0, index - 1))}>←</button>
            <strong style={{ fontSize: "14px", color: "#0f172a" }}>{activeMonth.label}</strong>
            <button
              type="button"
              style={chipStyle(false)}
              onClick={() => setActiveMonthIndex((index) => Math.min(balisageMonths.length - 1, index + 1))}
            >
              →
            </button>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {(["name", "total", "alert"] as const).map((value) => (
              <button key={value} type="button" style={chipStyle(sortBy === value)} onClick={() => setSortBy(value)}>
                {value === "name" ? "A-Z" : value === "total" ? "Controles" : "Alertes"}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <KPIRow>
        <KPI moduleKey="balisage" value={totalControls} label="Total controles" />
        <KPI moduleKey="balisage" value={`${globalPercent}%`} label="Avancement global" />
        <KPI moduleKey="balisage" value={employeesOk} label="Employes OK" />
        <KPI moduleKey="balisage" value={employeesAlert} label="Alertes" />
      </KPIRow>

      <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "1fr 1fr" }}>
        <Card>
          <Kicker moduleKey="balisage" label="Classement" />
          <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Meilleur niveau actuel</h2>
          <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b" }}><span>Employe en tete</span><strong style={{ color: "#0f172a" }}>{bestEmployee?.name ?? "-"}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b" }}><span>Total controles</span><strong style={{ color: "#0f172a" }}>{bestEmployee?.total ?? 0}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b" }}><span>Objectif mensuel</span><strong style={{ color: "#0f172a" }}>{balisageObjective}</strong></div>
          </div>
        </Card>

        <Card>
          <Kicker moduleKey="balisage" label="Periodes" />
          <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Mois disponibles</h2>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
            {balisageMonths.map((month) => (
              <button
                key={month.id}
                type="button"
                style={chipStyle(month.id === activeMonth.id)}
                onClick={() => setActiveMonthIndex(balisageMonths.findIndex((item) => item.id === month.id))}
              >
                {month.label}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <Kicker moduleKey="balisage" label="Vue equipe" />
        <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Tableau mensuel editable</h2>

        <div style={{ overflowX: "auto", marginTop: "10px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "860px" }}>
            <thead>
              <tr>
                {["Employe", "Total", "Avancement", "Taux erreur", "Statut", "Actions"].map((head) => (
                  <th
                    key={head}
                    style={{
                      textAlign: "left",
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "#64748b",
                      borderBottom: "1px solid #dbe3eb",
                      padding: "8px 10px",
                    }}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedStats.map((employee) => {
                const progress = getProgress(employee.total);
                const status = getDynamicStatus(employee.total, activeMonth.id);
                return (
                  <tr key={employee.name}>
                    <td style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 10px", fontSize: "12px", color: "#0f172a", fontWeight: 600 }}>{employee.name}</td>
                    <td style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 10px", fontSize: "12px", color: "#0f172a" }}>{employee.total}</td>
                    <td style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 10px" }}>
                      <ProgressBar value={progress} moduleKey="balisage" showPercent noShimmer height={8} style={{ marginTop: 0 }} />
                    </td>
                    <td style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 10px", fontSize: "12px", color: "#0f172a" }}>
                      {employee.errorRate === null ? "-" : `${employee.errorRate}%`}
                    </td>
                    <td style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 10px" }}>
                      <span style={{ ...statusStyle(status), fontSize: "11px", fontWeight: 700, borderRadius: "999px", padding: "4px 8px" }}>{status}</span>
                    </td>
                    <td style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 10px" }}>
                      <button
                        type="button"
                        style={{ border: "1px solid #dbe3eb", borderRadius: "999px", background: "#fff", color: "#1e293b", fontSize: "12px", padding: "6px 10px" }}
                        onClick={() => openEdit(employee)}
                      >
                        Editer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {editingName ? (
        <div
          role="presentation"
          onClick={() => setEditingName(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.35)",
            backdropFilter: "blur(3px)",
            display: "grid",
            placeItems: "center",
            zIndex: 140,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(520px, 92vw)", background: "#fff", borderRadius: "16px", border: "1px solid #dbe3eb", padding: "16px" }}
          >
            <Kicker moduleKey="balisage" label="Edition balisage" />
            <h2 style={{ marginTop: "6px", fontSize: "20px", color: "#0f172a" }}>{editingName}</h2>

            {saveError ? (
              <div
                style={{
                  marginTop: "10px",
                  borderRadius: "10px",
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#991b1b",
                  fontSize: "12px",
                  lineHeight: 1.45,
                  padding: "10px 12px",
                }}
              >
                {saveError}
              </div>
            ) : null}

            <label style={{ display: "grid", gap: "5px", marginTop: "10px", fontSize: "12px", color: "#64748b" }}>
              <span>Total controles</span>
              <input
                value={editingTotal}
                onChange={(event) => setEditingTotal(event.target.value)}
                type="number"
                min={0}
                disabled={isSaving}
                style={{ minHeight: "36px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px" }}
              />
            </label>

            <label style={{ display: "grid", gap: "5px", marginTop: "10px", fontSize: "12px", color: "#64748b" }}>
              <span>Taux erreur (%)</span>
              <input
                value={editingErrorRate}
                onChange={(event) => setEditingErrorRate(event.target.value)}
                type="number"
                min={0}
                step="0.1"
                placeholder="Laisser vide si inconnu"
                disabled={isSaving}
                style={{ minHeight: "36px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px" }}
              />
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}>
              <button
                type="button"
                onClick={() => {
                  setSaveError(null);
                  setEditingName(null);
                }}
                disabled={isSaving}
                style={{ border: "1px solid #dbe3eb", borderRadius: "999px", background: "#fff", color: "#1e293b", fontSize: "12px", padding: "7px 12px" }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={isSaving}
                style={{ border: `1px solid ${theme.color}`, borderRadius: "999px", background: theme.medium, color: theme.color, fontWeight: 700, fontSize: "12px", padding: "7px 12px" }}
              >
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
