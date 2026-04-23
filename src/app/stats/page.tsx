"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ModuleHeader } from "@/components/layout/module-header";
import { getPreviousBalisageMonthId } from "@/components/exports/balisage-print-utils";
import {
  balisageMonths,
  balisageObjective,
  type BalisageEmployeeStat,
} from "@/lib/balisage-data";
import {
  getBalisageDynamicStatus,
  getBalisageProgress,
  getCurrentBalisageMonthIndex,
} from "@/lib/balisage-metrics";
import { attachRhActivityToBalisageStats, getActiveBalisageStats } from "@/lib/balisage-rh";
import { getBalisageUpdatedEventName, loadBalisageData, saveBalisageEntryToSupabase, syncBalisageFromSupabase } from "@/lib/balisage-store";
import { getRhUpdatedEventName, loadRhEmployees, syncRhFromSupabase } from "@/lib/rh-store";
import { moduleThemes } from "@/lib/theme";

type SortBy = "name" | "total" | "alert";
type BalisageStatsWithDelta = ReturnType<typeof attachRhActivityToBalisageStats>[number] & {
  previousTotal: number | null;
  deltaFromPrevious: number | null;
};

function areMonthStatsEqual(a: BalisageEmployeeStat[], b: BalisageEmployeeStat[]) {
  return a.length === b.length && a.every((item, index) => (
    item.name === b[index]?.name &&
    item.total === b[index]?.total &&
    item.errorRate === b[index]?.errorRate
  ));
}

function areBalisageDataEqual(
  a: Record<string, BalisageEmployeeStat[]>,
  b: Record<string, BalisageEmployeeStat[]>,
) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => areMonthStatsEqual(a[key] ?? [], b[key] ?? []));
}

function DeltaIndicator({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8" }}>— vs mois précédent</span>;
  }

  const rising = delta > 0;
  const falling = delta < 0;
  const tone = rising ? "#16a34a" : falling ? "#dc2626" : "#d97706";
  const symbol = rising ? "↑" : falling ? "↓" : "=";
  const label = rising ? `+${delta}` : String(delta);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 7px",
        borderRadius: "999px",
        background: rising ? "#ecfdf5" : falling ? "#fef2f2" : "#fffbeb",
        color: tone,
        fontSize: "10px",
        fontWeight: 800,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: "11px" }}>{symbol}</span>
      <span>{label} vs mois préc.</span>
    </span>
  );
}

function formatLastUpdateDate(value: string | null | undefined) {
  if (!value) return "Jamais";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Jamais";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
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
  const [rhEmployees, setRhEmployees] = useState(() => loadRhEmployees());

  const theme = moduleThemes.balisage;
  const activeMonth = balisageMonths[activeMonthIndex];
  const monthStats = useMemo(() => localData[activeMonth.id] ?? [], [activeMonth.id, localData]);
  const previousMonthId = useMemo(() => getPreviousBalisageMonthId(activeMonth.id), [activeMonth.id]);
  const previousMonthStats = useMemo(
    () => (previousMonthId ? localData[previousMonthId] ?? [] : []),
    [localData, previousMonthId],
  );
  const statsWithRhState = useMemo<BalisageStatsWithDelta[]>(() => {
    const previousMap = new Map(previousMonthStats.map((employee) => [employee.name.trim().toUpperCase(), employee.total]));
    return attachRhActivityToBalisageStats(monthStats, rhEmployees).map((employee) => {
      const previousTotal = previousMonthId ? (previousMap.get(employee.name.trim().toUpperCase()) ?? 0) : null;
      return {
        ...employee,
        previousTotal,
        deltaFromPrevious: previousTotal === null ? null : employee.total - previousTotal,
      };
    });
  }, [monthStats, previousMonthId, previousMonthStats, rhEmployees]);
  const activeStats = useMemo(
    () => getActiveBalisageStats(statsWithRhState),
    [statsWithRhState],
  );

  const sortedStats = useMemo(() => {
    const list = [...statsWithRhState];
    if (sortBy === "total") {
      return list.sort((a, b) => {
        if (a.actif !== b.actif) return a.actif ? -1 : 1;
        return b.total - a.total;
      });
    }
    if (sortBy === "alert") {
      return list.sort((a, b) => {
        if (a.actif !== b.actif) return a.actif ? -1 : 1;
        return a.total - b.total;
      });
    }
    return list.sort((a, b) => {
      if (a.actif !== b.actif) return a.actif ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [sortBy, statsWithRhState]);

  useEffect(() => {
    const refresh = () => {
      const nextData = loadBalisageData();
      setLocalData((current) => (areBalisageDataEqual(current, nextData) ? current : nextData));
      setRhEmployees(loadRhEmployees());
    };
    void Promise.all([
      syncBalisageFromSupabase(),
      syncRhFromSupabase(),
    ]).then(([balisageSynced, rhSynced]) => {
      if (balisageSynced || rhSynced) refresh();
    });
    const balisageEventName = getBalisageUpdatedEventName();
    const rhEventName = getRhUpdatedEventName();
    window.addEventListener(balisageEventName, refresh);
    window.addEventListener(rhEventName, refresh);
    return () => {
      window.removeEventListener(balisageEventName, refresh);
      window.removeEventListener(rhEventName, refresh);
    };
  }, []);

  const totalControls = activeStats.reduce((sum, item) => sum + item.total, 0);
  const employeesOk = activeStats.filter((item) => getBalisageDynamicStatus(item.total, activeMonth.id) === "OK").length;
  const employeesAlert = activeStats.filter((item) => getBalisageDynamicStatus(item.total, activeMonth.id) === "Alerte").length;
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
    const name = editingName.trim().toUpperCase();
    const monthId = activeMonth.id;
    const totalToSave = newTotal ?? 0;

    setSaveError(null);
    setIsSaving(true);

    const synced = await saveBalisageEntryToSupabase(
      monthId,
      name,
      totalToSave,
      newErrorRate,
    );

    if (!synced) {
      setSaveError("Échec de l'enregistrement dans Supabase. Aucune donnée locale n'a été conservée.");
      setIsSaving(false);
      return;
    }

    await syncBalisageFromSupabase();
    setLocalData((current) => {
      const nextData = loadBalisageData();
      return areBalisageDataEqual(current, nextData) ? current : nextData;
    });

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
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "980px" }}>
            <thead>
              <tr>
                {["Employe", "Total", "Avancement", "Taux erreur", "Dernière maj", "Statut", "Actions"].map((head) => (
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
                const progress = getBalisageProgress(employee.total);
                const status = employee.actif ? getBalisageDynamicStatus(employee.total, activeMonth.id) : "Inactif";
                return (
                  <tr key={employee.name} style={employee.actif ? undefined : { background: "#f8fafc" }}>
                    <td style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 10px", fontSize: "12px", color: employee.actif ? "#0f172a" : "#64748b", fontWeight: 600 }}>{employee.name}</td>
                    <td style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 10px", color: employee.actif ? "#0f172a" : "#64748b" }}>
                      <div style={{ display: "grid", gap: "4px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700 }}>{employee.total}</span>
                        <DeltaIndicator delta={employee.deltaFromPrevious} />
                      </div>
                    </td>
                    <td style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 10px", opacity: employee.actif ? 1 : 0.55 }}>
                      <ProgressBar value={progress} moduleKey="balisage" showPercent noShimmer height={8} style={{ marginTop: 0 }} />
                    </td>
                    <td style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 10px", fontSize: "12px", color: employee.actif ? "#0f172a" : "#64748b" }}>
                      {employee.errorRate === null ? "-" : `${employee.errorRate}%`}
                    </td>
                    <td style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 10px", fontSize: "12px", color: employee.actif ? "#0f172a" : "#64748b", whiteSpace: "nowrap" }}>
                      {formatLastUpdateDate(employee.lastUpdatedAt)}
                    </td>
                    <td style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 10px" }}>
                      <span style={{
                        ...(employee.actif ? statusStyle(status) : { background: "#e2e8f0", color: "#475569" }),
                        fontSize: "11px",
                        fontWeight: 700,
                        borderRadius: "999px",
                        padding: "4px 8px",
                      }}>
                        {employee.actif ? status : "Inactif RH"}
                      </span>
                    </td>
                    <td style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 10px" }}>
                      <button
                        type="button"
                        style={{
                          border: "1px solid #dbe3eb",
                          borderRadius: "999px",
                          background: "#fff",
                          color: employee.actif ? "#1e293b" : "#94a3b8",
                          fontSize: "12px",
                          padding: "6px 10px",
                          cursor: employee.actif ? "pointer" : "not-allowed",
                        }}
                        onClick={() => openEdit(employee)}
                        disabled={!employee.actif}
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
