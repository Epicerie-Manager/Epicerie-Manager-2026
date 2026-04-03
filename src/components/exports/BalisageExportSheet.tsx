"use client";

import packageJson from "../../../package.json";
import PrintFooter from "@/components/exports/PrintFooter";
import PrintHeader from "@/components/exports/PrintHeader";
import { ProgressBar } from "@/components/ui/progress-bar";
import { balisageObjective } from "@/lib/balisage-data";
import { moduleThemes, shadows } from "@/lib/theme";
import {
  getDynamicStatus,
  getProgress,
  getStatusStyle,
  sortBalisageStats,
  type BalisagePrintStat,
} from "@/components/exports/balisage-print-utils";

const LEGENDS = [
  { label: "OK", color: "#166534", bg: "#dcfce7" },
  { label: "En retard", color: "#92400e", bg: "#fef3c7" },
  { label: "Alerte", color: "#991b1b", bg: "#fee2e2" },
];

type BalisageExportSheetProps = {
  monthId: string;
  monthLabel: string;
  printedAt?: string;
  stats: BalisagePrintStat[];
  elevated?: boolean;
};

function StatCard({
  value,
  label,
  tone,
}: {
  value: string | number;
  label: string;
  tone: "teal" | "green" | "amber" | "red";
}) {
  const tones = {
    teal: { bg: "#e8f9fc", color: "#065567", border: "#c0eaf3" },
    green: { bg: "#ecfdf5", color: "#166534", border: "#86efac" },
    amber: { bg: "#fffbeb", color: "#92400e", border: "#fcd34d" },
    red: { bg: "#fef2f2", color: "#991b1b", border: "#fca5a5" },
  } as const;
  const palette = tones[tone];
  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        padding: "9px 12px",
      }}
    >
      <div style={{ fontSize: 21, fontWeight: 900, letterSpacing: "-0.04em", color: palette.color }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginTop: 3 }}>{label}</div>
    </div>
  );
}

function DeltaIndicator({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span style={{ fontSize: 8, fontWeight: 700, color: "#94a3b8" }}>— vs mois précédent</span>;
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
        gap: 3,
        padding: "2px 5px",
        borderRadius: 999,
        background: rising ? "#ecfdf5" : falling ? "#fef2f2" : "#fffbeb",
        color: tone,
        fontSize: 8,
        fontWeight: 800,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 9 }}>{symbol}</span>
      <span>{label} vs mois préc.</span>
    </span>
  );
}

export default function BalisageExportSheet({
  monthId,
  monthLabel,
  printedAt,
  stats,
  elevated = true,
}: BalisageExportSheetProps) {
  const theme = moduleThemes.balisage;
  const sortedStats = sortBalisageStats(stats);
  const activeStats = sortedStats.filter((item) => item.actif);
  const totalControls = activeStats.reduce((sum, item) => sum + item.total, 0);
  const globalPercent = Math.min(
    Math.round((totalControls / (Math.max(activeStats.length, 1) * balisageObjective)) * 100),
    100,
  );
  const employeesOk = activeStats.filter((item) => getDynamicStatus(item.total, monthId) === "OK").length;
  const employeesAlert = activeStats.filter((item) => getDynamicStatus(item.total, monthId) === "Alerte").length;
  return (
    <div
      className="print-sheet"
      style={{
        background: "#ffffff",
        border: `2px solid ${theme.medium}`,
        borderRadius: 24,
        boxShadow: elevated ? shadows.card : "none",
        padding: 12,
        backgroundImage: "linear-gradient(180deg,#ffffff 0%,#fbfeff 100%)",
      }}
    >
      <PrintHeader title="Contrôle balisage" dates={monthLabel} printedAt={printedAt} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <StatCard value={totalControls} label="Total contrôles" tone="teal" />
        <StatCard value={`${globalPercent}%`} label="Avancement global" tone="green" />
        <StatCard value={employeesOk} label="Employés OK" tone="amber" />
        <StatCard value={employeesAlert} label="Alertes" tone="red" />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            border: `1px solid ${theme.medium}`,
            borderRadius: 18,
            background: "#ffffff",
            padding: 10,
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: theme.color }}>
            Vision équipe
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
            Objectif mensuel : {balisageObjective} contrôles par collaborateur
          </div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
            Lecture rapide de l’avancement et des alertes du mois.
          </div>
          <ProgressBar
            value={globalPercent}
            moduleKey="balisage"
            showPercent
            label="Avancement collectif"
            subLeft={`${activeStats.length} collaborateurs actifs`}
            subRight={`${totalControls} contrôles saisis`}
            noShimmer
            style={{ marginTop: 8 }}
          />
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            {[
              { label: "Collaborateur", width: 200, align: "left" as const },
              { label: "Total", width: 104, align: "center" as const },
              { label: "Avancement", width: 210, align: "left" as const },
              { label: "Taux erreur", width: 96, align: "center" as const },
              { label: "Statut", width: 110, align: "center" as const },
            ].map((head) => (
              <th
                key={head.label}
                style={{
                  width: head.width,
                  padding: "6px 8px",
                  textAlign: head.align,
                  fontSize: 9.5,
                  fontWeight: 800,
                  color: "#0f172a",
                  background: "#f8fafc",
                  border: "1px solid #dbe3eb",
                }}
              >
                {head.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedStats.map((employee) => {
            const progress = getProgress(employee.total);
            const status = employee.actif ? getDynamicStatus(employee.total, monthId) : "Inactif";
            const statusStyle = status === "Inactif"
              ? { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" }
              : getStatusStyle(status);
            return (
              <tr key={employee.name}>
                <td
                  style={{
                    padding: "4px 8px",
                    border: "1px solid #dbe3eb",
                    background: employee.actif ? "#ffffff" : "#f8fafc",
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: employee.actif ? "#0f172a" : "#94a3b8",
                  }}
                >
                  {employee.name}
                </td>
                <td
                  style={{
                    padding: "4px 6px",
                    textAlign: "center",
                    border: "1px solid #dbe3eb",
                    background: employee.actif ? "#ffffff" : "#f8fafc",
                    color: employee.actif ? theme.dark : "#94a3b8",
                  }}
                >
                  <div style={{ display: "grid", justifyItems: "center", gap: 3 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800 }}>{employee.total}</div>
                    <DeltaIndicator delta={employee.deltaFromPrevious} />
                  </div>
                </td>
                <td
                  style={{
                    padding: "3px 8px",
                    border: "1px solid #dbe3eb",
                    background: employee.actif ? "#ffffff" : "#f8fafc",
                  }}
                >
                  <ProgressBar
                    value={progress}
                    moduleKey="balisage"
                    noShimmer
                    showPercent
                    height={8}
                    style={{ marginTop: 0 }}
                  />
                </td>
                <td
                  style={{
                    padding: "4px 6px",
                    textAlign: "center",
                    border: "1px solid #dbe3eb",
                    background: employee.actif ? "#ffffff" : "#f8fafc",
                    fontSize: 9,
                    fontWeight: 800,
                    color: employee.actif ? "#0f172a" : "#94a3b8",
                  }}
                >
                  {employee.errorRate === null || employee.errorRate === undefined ? "—" : `${employee.errorRate}%`}
                </td>
                <td
                  style={{
                    padding: "4px 6px",
                    textAlign: "center",
                    border: "1px solid #dbe3eb",
                    background: employee.actif ? "#ffffff" : "#f8fafc",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 84,
                      padding: "4px 8px",
                      borderRadius: 999,
                      background: statusStyle.bg,
                      color: statusStyle.color,
                      border: `1px solid ${statusStyle.border}`,
                      fontSize: 8,
                      fontWeight: 800,
                    }}
                  >
                    {status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <PrintFooter version={packageJson.version} legends={LEGENDS} />
    </div>
  );
}
