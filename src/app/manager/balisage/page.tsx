"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  balisageMonths,
  type BalisageEmployeeStat,
} from "@/lib/balisage-data";
import {
  getBalisageDynamicStatus,
  getBalisageProgress,
  getCurrentBalisageMonthIndex,
  getPreviousBalisageMonthId,
} from "@/lib/balisage-metrics";
import { attachRhActivityToBalisageStats } from "@/lib/balisage-rh";
import { getBalisageUpdatedEventName, loadBalisageData, syncBalisageFromSupabase } from "@/lib/balisage-store";
import { getRhUpdatedEventName, loadRhEmployees, syncRhFromSupabase } from "@/lib/rh-store";

type BalisageStatsWithDelta = ReturnType<typeof attachRhActivityToBalisageStats>[number] & {
  previousTotal: number | null;
  deltaFromPrevious: number | null;
};

function innerPanelStyle(): React.CSSProperties {
  return {
    borderRadius: 22,
    padding: "14px 14px 12px",
    background: "#fffdfb",
    border: "1px solid rgba(230,220,212,0.92)",
    boxShadow: "0 10px 24px rgba(17,24,39,0.04)",
  };
}

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

function getStatusPalette(status: string, active: boolean) {
  if (!active) return { bg: "#e2e8f0", color: "#475569", tone: "#94a3b8" };
  if (status === "OK") return { bg: "#dcfce7", color: "#166534", tone: "#0f9f63" };
  if (status === "En retard") return { bg: "#fef3c7", color: "#92400e", tone: "#d97706" };
  return { bg: "#fee2e2", color: "#991b1b", tone: "#dc2626" };
}

function DeltaIndicator({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span style={{ fontSize: 11, color: "#94a3b8" }}>Pas de mois précédent</span>;
  }

  const rising = delta > 0;
  const falling = delta < 0;
  const tone = rising ? "#16a34a" : falling ? "#dc2626" : "#d97706";
  const bg = rising ? "#ecfdf5" : falling ? "#fef2f2" : "#fffbeb";
  const symbol = rising ? "↑" : falling ? "↓" : "=";
  const label = rising ? `+${delta}` : String(delta);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 8px",
        borderRadius: 999,
        background: bg,
        color: tone,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      <span>{symbol}</span>
      <span>{label} vs mois préc.</span>
    </span>
  );
}

export default function ManagerBalisagePage() {
  const [activeMonthIndex, setActiveMonthIndex] = useState(() => getCurrentBalisageMonthIndex());
  const [localData, setLocalData] = useState<Record<string, BalisageEmployeeStat[]>>(() => loadBalisageData());
  const [rhEmployees, setRhEmployees] = useState(() => loadRhEmployees());

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

  const sortedStats = useMemo(() => {
    const list = [...statsWithRhState];
    return list.sort((left, right) => {
      if (left.actif !== right.actif) return left.actif ? -1 : 1;
      return left.name.localeCompare(right.name, "fr");
    });
  }, [statsWithRhState]);

  useEffect(() => {
    const refresh = () => {
      const nextData = loadBalisageData();
      setLocalData((current) => (areBalisageDataEqual(current, nextData) ? current : nextData));
      setRhEmployees(loadRhEmployees());
    };

    void Promise.all([syncBalisageFromSupabase(), syncRhFromSupabase()]).then(([balisageSynced, rhSynced]) => {
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

  const summary = useMemo(() => {
    const activeRows = sortedStats.filter((employee) => employee.actif);
    const totalControls = activeRows.reduce((sum, employee) => sum + employee.total, 0);
    const okCount = activeRows.filter((employee) => getBalisageDynamicStatus(employee.total, activeMonth.id) === "OK").length;
    const lateCount = activeRows.filter((employee) => getBalisageDynamicStatus(employee.total, activeMonth.id) === "En retard").length;
    const alertCount = activeRows.filter((employee) => getBalisageDynamicStatus(employee.total, activeMonth.id) === "Alerte").length;

    return {
      totalControls,
      okCount,
      lateCount,
      alertCount,
    };
  }, [activeMonth.id, sortedStats]);

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div style={innerPanelStyle()}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.05em", color: "#111827" }}>
                Balisage
              </div>
              <div style={{ marginTop: 4, fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                {summary.totalControls} contrôles sur le mois · {summary.okCount} OK · {summary.lateCount} en retard · {summary.alertCount} alertes
              </div>
            </div>

            <label style={{ display: "grid", gap: 4, minWidth: 150 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b" }}>
                Mois
              </span>
              <select
                value={activeMonth.id}
                onChange={(event) =>
                  startTransition(() =>
                    setActiveMonthIndex(balisageMonths.findIndex((item) => item.id === event.target.value)),
                  )
                }
                style={{
                  minHeight: 42,
                  borderRadius: 14,
                  border: "1px solid #dbe3eb",
                  background: "#fff",
                  color: "#111827",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "0 12px",
                }}
              >
                {balisageMonths.map((month) => (
                  <option key={month.id} value={month.id}>
                    {month.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
          {sortedStats.map((employee) => {
            const progress = getBalisageProgress(employee.total);
            const status = employee.actif ? getBalisageDynamicStatus(employee.total, activeMonth.id) : "Inactif RH";
            const palette = getStatusPalette(status, employee.actif);

            return (
              <div
                key={employee.name}
                style={{
                  borderRadius: 18,
                  padding: "10px 11px",
                  background: employee.actif ? "#fffdfb" : "#f8fafc",
                  border: `1px solid ${employee.actif ? "rgba(230,220,212,0.92)" : "#e2e8f0"}`,
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", color: employee.actif ? "#111827" : "#64748b" }}>
                      {employee.name}
                    </div>
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <strong style={{ fontSize: 13, color: employee.actif ? "#111827" : "#64748b" }}>{employee.total}</strong>
                    <span
                      style={{
                        borderRadius: 999,
                        background: palette.bg,
                        color: palette.color,
                        padding: "5px 8px",
                        fontSize: 10,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {status}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <ProgressBar
                    value={progress}
                    moduleKey="balisage"
                    showPercent
                    noShimmer
                    height={7}
                    style={{ marginTop: 0 }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
                  <div style={{ transform: "scale(0.92)", transformOrigin: "left center" }}>
                    <DeltaIndicator delta={employee.deltaFromPrevious} />
                  </div>
                  <div style={{ fontSize: 10.5, color: "#6b7280" }}>
                    Taux erreur : <strong style={{ color: employee.actif ? "#111827" : "#64748b" }}>
                      {employee.errorRate === null ? "-" : `${employee.errorRate}%`}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
