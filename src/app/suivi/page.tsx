"use client";

import { useEffect, useMemo, useState } from "react";
import { ModuleHeader } from "@/components/layout/module-header";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { balisageObjective } from "@/lib/balisage-data";
import {
  METRE_A_METRE_SECTIONS,
  computeSectionScore,
  createEmptyMetreAuditDraft,
  type BooleanAnswer,
  type MetreAuditDraft,
} from "@/lib/metre-a-metre-config";
import {
  deleteMetreAudit,
  loadEmployeeAbsenceYearStats,
  loadEmployeeBalisageYearStats,
  loadFollowupEmployees,
  loadManagerDisplayName,
  loadMetreAuditDetail,
  loadRecentMetreAudits,
  saveMetreAudit,
  type EmployeeBalisageYearStats,
  type EmployeeAbsenceYearStats,
  type FollowupEmployeeOption,
  type MetreAuditDetail,
  type MetreAuditListItem,
} from "@/lib/followup-store";
import { moduleThemes } from "@/lib/theme";

type FollowupView = "form" | "team" | "mobile";
type TeamSubview = "overview" | "collaborator";
const ALL_EMPLOYEES_OPTION = "__all__";

type EmployeeFollowupSnapshot = {
  employeeId: string;
  name: string;
  rayons: string[];
  auditCount: number;
  averageScore: number;
  lastScore: number | null;
  bestScore: number | null;
  needsAttentionCount: number;
  lastAuditDate: string | null;
  audits: MetreAuditListItem[];
};

type TeamSeriesPoint = {
  label: string;
  value: number;
  target?: number;
};

type EligibleScope = "fieldVisit" | "balisage";

const innerTileStyle: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid #e8ecf1",
  background: "#fff",
  boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 20px rgba(15,23,42,0.05)",
  padding: "14px 16px",
};

const RATING_LEGEND = [
  { value: 0, label: "Très insuffisant", color: "#991b1b", background: "#fef2f2", border: "#fecaca" },
  { value: 1, label: "Insuffisant", color: "#b45309", background: "#fff7ed", border: "#fed7aa" },
  { value: 2, label: "À corriger", color: "#92400e", background: "#fffbeb", border: "#fde68a" },
  { value: 3, label: "Correct", color: "#166534", background: "#f0fdf4", border: "#bbf7d0" },
  { value: 4, label: "Très bon", color: "#166534", background: "#ecfdf5", border: "#86efac" },
  { value: 5, label: "Exemplaire", color: "#155e75", background: "#ecfeff", border: "#a5f3fc" },
];

function SectionScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 80 ? { bg: "#ecfdf5", color: "#166534" } :
    score >= 60 ? { bg: "#fffbeb", color: "#92400e" } :
    { bg: "#fef2f2", color: "#991b1b" };

  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        borderRadius: 999,
        padding: "4px 10px",
        background: tone.bg,
        color: tone.color,
        whiteSpace: "nowrap",
      }}
    >
      {score.toFixed(0)}%
    </span>
  );
}

function statusTone(score: number) {
  if (score >= 80) return { border: "#86efac", bg: "#ecfdf5", color: "#166534" };
  if (score >= 60) return { border: "#fde68a", bg: "#fffbeb", color: "#92400e" };
  return { border: "#fecaca", bg: "#fef2f2", color: "#991b1b" };
}

function globalAuditTone(score: number) {
  if (score >= 80) {
    return {
      label: "Bon niveau",
      accent: "#166534",
      background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)",
      border: "#86efac",
      progress: "#16a34a",
    };
  }

  if (score >= 60) {
    return {
      label: "À surveiller",
      accent: "#92400e",
      background: "linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%)",
      border: "#fcd34d",
      progress: "#d97706",
    };
  }

  return {
    label: "Attention - Insuffisant",
    accent: "#b91c1c",
    background: "linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)",
    border: "#fca5a5",
    progress: "#dc2626",
  };
}

function formatAuditDate(date: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(date));
}

function compactDate(date: string | null) {
  if (!date) return "Aucun audit";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(date));
}

function getEligibleEmployees(
  employees: FollowupEmployeeOption[],
  scope: EligibleScope,
) {
  return employees.filter((employee) =>
    scope === "fieldVisit" ? employee.eligibleForFieldVisit : employee.eligibleForBalisage,
  );
}

function CompactPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 38,
        borderRadius: 999,
        border: `1px solid ${active ? "#8b5cf6" : "#dbe3eb"}`,
        background: active ? "#f5f3ff" : "#fff",
        color: active ? "#6d28d9" : "#475569",
        padding: "0 14px",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function StarRatingInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (next: number) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {RATING_LEGEND.map((entry) => {
        const active = value === entry.value;
        return (
          <button
            key={entry.value}
            type="button"
            onClick={() => onChange(entry.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              minHeight: 38,
              borderRadius: 12,
              border: `1px solid ${active ? entry.border : "#dbe3eb"}`,
              background: active ? entry.background : "#fff",
              color: active ? entry.color : "#475569",
              padding: "0 12px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{active ? "★" : "☆"}</span>
            {entry.value}
          </button>
        );
      })}
    </div>
  );
}

function TeamBarsChart({
  title,
  subtitle,
  points,
  color,
  accent,
  unit,
  targetLabel,
  tone = "neutral",
}: {
  title: string;
  subtitle: string;
  points: TeamSeriesPoint[];
  color: string;
  accent: string;
  unit: string;
  targetLabel?: string;
  tone?: "neutral" | "violet" | "red";
}) {
  const maxValue = Math.max(
    ...points.flatMap((point) => [point.value, point.target ?? 0]),
    1,
  );
  const chartHeight = 190;
  const svgWidth = Math.max(points.length * 84, 420);
  const plotBackground =
    tone === "violet"
      ? "linear-gradient(180deg, rgba(139,92,246,0.08) 0%, rgba(255,255,255,0.9) 100%)"
      : tone === "red"
        ? "linear-gradient(180deg, rgba(239,68,68,0.08) 0%, rgba(255,255,255,0.9) 100%)"
        : "linear-gradient(180deg, rgba(148,163,184,0.08) 0%, rgba(255,255,255,0.9) 100%)";

  const linePath = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * (svgWidth - 36) + 18;
      const y = chartHeight - ((point.value / maxValue) * (chartHeight - 24) + 12);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const targetPath = points.some((point) => typeof point.target === "number")
    ? points
        .map((point, index) => {
          const x = (index / Math.max(points.length - 1, 1)) * (svgWidth - 36) + 18;
          const y = chartHeight - ((((point.target ?? 0) / maxValue) * (chartHeight - 24)) + 12);
          return `${index === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ")
    : null;

  return (
    <div
      style={{
        ...innerTileStyle,
        padding: "18px 18px 16px",
        background: plotBackground,
        boxShadow: "0 2px 6px rgba(15,23,42,0.05), 0 16px 38px rgba(15,23,42,0.08)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: accent }}>{unit}</span>
          {targetPath ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748b" }}>
              <span style={{ width: 18, borderTop: "2px dashed #94a3b8" }} />
              {targetLabel || "Objectif"}
            </span>
          ) : null}
        </div>
      </div>

      <div style={{ position: "relative", marginTop: 18 }}>
        <svg viewBox={`0 0 ${svgWidth} ${chartHeight}`} style={{ width: "100%", height: 210, display: "block" }}>
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - ratio * (chartHeight - 24) - 12;
            return (
              <line
                key={ratio}
                x1="12"
                y1={y}
                x2={svgWidth - 12}
                y2={y}
                stroke="#eef2f7"
                strokeWidth="1"
              />
            );
          })}

          {points.map((point, index) => {
            const step = (svgWidth - 36) / Math.max(points.length - 1, 1);
            const x = index * step + 18;
            const barWidth = Math.min(42, step * 0.56);
            const barHeight = (point.value / maxValue) * (chartHeight - 24);
            const barY = chartHeight - barHeight - 12;
            return (
              <g key={point.label}>
                <rect
                  x={x - barWidth / 2}
                  y={barY}
                  width={barWidth}
                  height={Math.max(barHeight, point.value > 0 ? 8 : 2)}
                  rx="12"
                  fill={accent}
                  opacity="0.18"
                />
                <rect
                  x={x - barWidth / 2}
                  y={barY + 4}
                  width={barWidth}
                  height={Math.max(barHeight - 4, point.value > 0 ? 4 : 2)}
                  rx="10"
                  fill={color}
                />
              </g>
            );
          })}

          {targetPath ? (
            <path
              d={targetPath}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
          ) : null}

          <path d={linePath} fill="none" stroke={accent} strokeWidth="3" />
          {points.map((point, index) => {
            const x = (index / Math.max(points.length - 1, 1)) * (svgWidth - 36) + 18;
            const y = chartHeight - ((point.value / maxValue) * (chartHeight - 24) + 12);
            return (
              <g key={`${point.label}-dot`}>
                <circle cx={x} cy={y} r="5.5" fill="#fff" stroke={accent} strokeWidth="3" />
                <text x={x} y={y - 12} textAnchor="middle" fontSize="10" fontWeight="800" fill="#334155">
                  {point.value}
                </text>
              </g>
            );
          })}
        </svg>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(points.length, 1)}, minmax(0, 1fr))`, gap: 10, marginTop: 2 }}>
          {points.map((point) => (
            <div key={`${point.label}-label`} style={{ fontSize: 11, color: "#64748b", textAlign: "center" }}>
              {point.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SuiviPage() {
  const theme = moduleThemes.suivi;
  const [view, setView] = useState<FollowupView>("team");
  const [teamSubview, setTeamSubview] = useState<TeamSubview>("overview");
  const [employees, setEmployees] = useState<FollowupEmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MetreAuditDraft>(() => createEmptyMetreAuditDraft());
  const [balisageByEmployee, setBalisageByEmployee] = useState<Record<string, EmployeeBalisageYearStats>>({});
  const [absenceByEmployee, setAbsenceByEmployee] = useState<Record<string, EmployeeAbsenceYearStats>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [audits, setAudits] = useState<MetreAuditListItem[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [selectedAuditDetail, setSelectedAuditDetail] = useState<MetreAuditDetail | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedFormSections, setExpandedFormSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(METRE_A_METRE_SECTIONS.map((section, index) => [section.key, index === 0])),
  );
  const [expandedAuditSections, setExpandedAuditSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [employeeRows, managerName, recentAudits] = await Promise.all([
          loadFollowupEmployees(),
          loadManagerDisplayName(),
          loadRecentMetreAudits(200),
        ]);
        const [balisageStats, absenceStats] = await Promise.all([
          loadEmployeeBalisageYearStats(employeeRows.map((employee) => employee.id)),
          loadEmployeeAbsenceYearStats(employeeRows.map((employee) => employee.id)),
        ]);
        if (cancelled) return;
        setEmployees(employeeRows);
        setBalisageByEmployee(balisageStats);
        setAbsenceByEmployee(absenceStats);
        setAudits(recentAudits);
        setSelectedAuditId((current) => current ?? null);
        setSelectedEmployeeId((current) => current ?? ALL_EMPLOYEES_OPTION);
        setDraft((current) => ({
          ...current,
          managerName: current.managerName || managerName,
        }));
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Impossible de charger le module suivi.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHistoryLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadDetail = async () => {
      if (!selectedAuditId) {
        setSelectedAuditDetail(null);
        return;
      }

      try {
        const detail = await loadMetreAuditDetail(selectedAuditId);
        if (cancelled) return;
        setSelectedAuditDetail(detail);
        if (detail?.employeeId && detail.employeeId !== ALL_EMPLOYEES_OPTION) {
          setSelectedEmployeeId(detail.employeeId);
        }
        setExpandedAuditSections(
          Object.fromEntries((detail?.sections ?? []).map((section, index) => [section.id, index === 0])),
        );
      } catch {
        if (!cancelled) setSelectedAuditDetail(null);
      }
    };

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedAuditId]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === draft.employeeId) ?? null,
    [draft.employeeId, employees],
  );

  const completedSections = useMemo(
    () =>
      METRE_A_METRE_SECTIONS.filter((section) => {
        const response = draft.sections[section.key];
        const ratingCount = Object.values(response.ratings).filter((value) => typeof value === "number").length;
        const booleanCount = Object.values(response.booleans).filter((value) => value === "OUI" || value === "NON").length;
        return section.type === "rating"
          ? ratingCount === section.questions.length
          : booleanCount === section.questions.length;
      }).length,
    [draft],
  );

  const averageAuditScore = useMemo(
    () => (audits.length ? Number((audits.reduce((sum, audit) => sum + audit.globalScore, 0) / audits.length).toFixed(1)) : 0),
    [audits],
  );

  const eligibleFieldVisitEmployees = useMemo(() => getEligibleEmployees(employees, "fieldVisit"), [employees]);
  const eligibleBalisageEmployees = useMemo(() => getEligibleEmployees(employees, "balisage"), [employees]);
  const eligibleFieldVisitIds = useMemo(
    () => new Set(eligibleFieldVisitEmployees.map((employee) => employee.id)),
    [eligibleFieldVisitEmployees],
  );
  const eligibleBalisageIds = useMemo(
    () => new Set(eligibleBalisageEmployees.map((employee) => employee.id)),
    [eligibleBalisageEmployees],
  );
  const eligibleFieldVisitCount = eligibleFieldVisitEmployees.length;
  const eligibleBalisageCount = eligibleBalisageEmployees.length;
  const fieldVisitAudits = useMemo(
    () => audits.filter((audit) => eligibleFieldVisitIds.has(audit.employeeId)),
    [audits, eligibleFieldVisitIds],
  );

  const annualVisitsTarget = useMemo(() => eligibleFieldVisitCount * 3, [eligibleFieldVisitCount]);
  const quadrimesterVisitsTarget = useMemo(() => Number((annualVisitsTarget / 3).toFixed(1)), [annualVisitsTarget]);
  const monthlyVisitsTarget = useMemo(() => Number((annualVisitsTarget / 12).toFixed(1)), [annualVisitsTarget]);
  const monthlyBalisageTarget = useMemo(
    () => eligibleBalisageCount * balisageObjective,
    [eligibleBalisageCount],
  );

  const employeeSnapshots = useMemo<EmployeeFollowupSnapshot[]>(() => {
    return employees
      .filter((employee) => employee.role === "COLLABORATEUR" || employee.role === "COORDINATEUR")
      .map((employee) => {
        const employeeAudits = audits
          .filter((audit) => audit.employeeId === employee.id)
          .slice()
          .sort((left, right) => new Date(right.auditDate).getTime() - new Date(left.auditDate).getTime());

        const auditCount = employeeAudits.length;
        const averageScore = auditCount
          ? Number((employeeAudits.reduce((sum, audit) => sum + audit.globalScore, 0) / auditCount).toFixed(1))
          : 0;

        return {
          employeeId: employee.id,
          name: employee.name,
          rayons: employee.rayons,
          auditCount,
          averageScore,
          lastScore: employeeAudits[0]?.globalScore ?? null,
          bestScore: auditCount ? Math.max(...employeeAudits.map((audit) => audit.globalScore)) : null,
          needsAttentionCount: employeeAudits.filter((audit) => audit.globalScore < 60).length,
          lastAuditDate: employeeAudits[0]?.auditDate ?? null,
          audits: employeeAudits,
        };
      })
      .sort((left, right) => {
        if (left.auditCount !== right.auditCount) return right.auditCount - left.auditCount;
        if (left.lastAuditDate && right.lastAuditDate) {
          return new Date(right.lastAuditDate).getTime() - new Date(left.lastAuditDate).getTime();
        }
        if (left.lastAuditDate) return -1;
        if (right.lastAuditDate) return 1;
        return left.name.localeCompare(right.name, "fr");
      });
  }, [audits, employees]);

  const selectedEmployeeSnapshot = useMemo(
    () =>
      employeeSnapshots.find((employee) => employee.employeeId === selectedEmployeeId)
      ?? (selectedEmployeeId === ALL_EMPLOYEES_OPTION
        ? {
            employeeId: ALL_EMPLOYEES_OPTION,
            name: "Toute l'équipe",
            rayons: [],
            auditCount: audits.length,
            averageScore: averageAuditScore,
            lastScore: null,
            bestScore: audits.length ? Math.max(...audits.map((audit) => audit.globalScore)) : null,
            needsAttentionCount: audits.filter((audit) => audit.globalScore < 60).length,
            lastAuditDate: audits[0]?.auditDate ?? null,
            audits,
          }
        : null)
      ?? employeeSnapshots[0]
      ?? null,
    [audits, averageAuditScore, employeeSnapshots, selectedEmployeeId],
  );

  const selectedEmployeeAudits = selectedEmployeeSnapshot?.audits ?? [];

  const teamBalisageSeries = useMemo<TeamSeriesPoint[]>(() => {
    const monthMap = new Map<string, number>();

    Object.values(balisageByEmployee)
      .filter((stats) => eligibleBalisageIds.has(stats.employeeId))
      .forEach((stats) => {
      stats.months.forEach((month) => {
        monthMap.set(month.label, (monthMap.get(month.label) ?? 0) + month.total);
      });
      });

    const firstEmployee = Object.values(balisageByEmployee).find((stats) => eligibleBalisageIds.has(stats.employeeId));
    return (firstEmployee?.months ?? []).map((month) => ({
      label: month.label.slice(0, 3),
      value: monthMap.get(month.label) ?? 0,
      target: monthlyBalisageTarget,
    }));
  }, [balisageByEmployee, eligibleBalisageIds, monthlyBalisageTarget]);

  const teamAuditSeries = useMemo<TeamSeriesPoint[]>(() => {
    const formatter = new Intl.DateTimeFormat("fr-FR", { month: "short" });
    const currentYear = new Date().getFullYear();
    const buckets = Array.from({ length: new Date().getMonth() + 1 }, (_, index) => {
      const date = new Date(currentYear, index, 1);
      return {
        label: formatter.format(date).replace(".", ""),
        key: `${currentYear}-${String(index + 1).padStart(2, "0")}`,
        value: 0,
        target: monthlyVisitsTarget,
      };
    });

    fieldVisitAudits.forEach((audit) => {
      const auditDate = new Date(audit.auditDate);
      if (auditDate.getFullYear() !== currentYear) return;
      const key = `${currentYear}-${String(auditDate.getMonth() + 1).padStart(2, "0")}`;
      const bucket = buckets.find((entry) => entry.key === key);
      if (bucket) bucket.value += 1;
    });

    return buckets.map(({ label, value, target }) => ({ label, value, target }));
  }, [fieldVisitAudits, monthlyVisitsTarget]);

  const teamBalisageAveragePerMonth = useMemo(
    () => (teamBalisageSeries.length ? Math.round(teamBalisageSeries.reduce((sum, month) => sum + month.value, 0) / teamBalisageSeries.length) : 0),
    [teamBalisageSeries],
  );
  const teamCurrentBalisage = teamBalisageSeries.at(-1)?.value ?? 0;
  const teamCurrentBalisageLabel = teamBalisageSeries.at(-1)?.label ?? "Mois";
  const teamBalisageGap = Math.max(monthlyBalisageTarget - teamCurrentBalisage, 0);

  const visitProgressToDate = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 1);
    const end = new Date(today.getFullYear(), 11, 31);
    const elapsed = today.getTime() - start.getTime();
    const total = end.getTime() - start.getTime();
    const ratio = total > 0 ? Math.min(Math.max(elapsed / total, 0), 1) : 0;
    const expectedVisits = annualVisitsTarget * ratio;
    const visitsDone = fieldVisitAudits.filter((audit) => new Date(audit.auditDate).getFullYear() === today.getFullYear()).length;
    const visitsBehind = Math.max(0, Math.ceil(expectedVisits - visitsDone));

    return {
      expectedVisits: Number(expectedVisits.toFixed(1)),
      visitsDone,
      visitsBehind,
    };
  }, [annualVisitsTarget, fieldVisitAudits]);

  const selectedEmployeeBalisage = useMemo(() => {
    if (!selectedEmployeeSnapshot) return null;
    if (selectedEmployeeSnapshot.employeeId === ALL_EMPLOYEES_OPTION) {
      return {
        employeeId: ALL_EMPLOYEES_OPTION,
        year: new Date().getFullYear(),
        totalControls: Object.values(balisageByEmployee)
          .filter((stats) => eligibleBalisageIds.has(stats.employeeId))
          .reduce((sum, stats) => sum + stats.totalControls, 0),
        averagePerMonth: teamBalisageAveragePerMonth,
        averageErrorRate: null,
        bestMonthLabel: teamBalisageSeries.reduce((best, month) => (month.value > best.value ? month : best), teamBalisageSeries[0] ?? { label: null, value: 0 }).label ?? null,
        bestMonthTotal: teamBalisageSeries.reduce((best, month) => Math.max(best, month.value), 0),
        currentMonthLabel: teamBalisageSeries.at(-1)?.label ?? null,
        currentMonthTotal: teamBalisageSeries.at(-1)?.value ?? 0,
        progressPercent: monthlyBalisageTarget ? Math.min(Math.round((teamBalisageAveragePerMonth / monthlyBalisageTarget) * 100), 100) : 0,
        months: teamBalisageSeries.map((month) => ({
          monthId: month.label,
          label: month.label,
          total: month.value,
          errorRate: null,
        })),
      };
    }
    return balisageByEmployee[selectedEmployeeSnapshot.employeeId] ?? null;
  }, [balisageByEmployee, eligibleBalisageIds, monthlyBalisageTarget, selectedEmployeeSnapshot, teamBalisageAveragePerMonth, teamBalisageSeries]);

  const selectedEmployeeAbsence = useMemo(() => {
    if (!selectedEmployeeSnapshot) return null;
    if (selectedEmployeeSnapshot.employeeId === ALL_EMPLOYEES_OPTION) {
      return {
        employeeId: ALL_EMPLOYEES_OPTION,
        year: new Date().getFullYear(),
        totalRequests: Object.values(absenceByEmployee).reduce((sum, stats) => sum + stats.totalRequests, 0),
        approvedRequests: Object.values(absenceByEmployee).reduce((sum, stats) => sum + stats.approvedRequests, 0),
        pendingRequests: Object.values(absenceByEmployee).reduce((sum, stats) => sum + stats.pendingRequests, 0),
        approvedDays: Object.values(absenceByEmployee).reduce((sum, stats) => sum + stats.approvedDays, 0),
        lastAbsenceStart: Object.values(absenceByEmployee).map((stats) => stats.lastAbsenceStart).filter(Boolean).sort().at(-1) ?? null,
        lastAbsenceType: null,
      };
    }
    return absenceByEmployee[selectedEmployeeSnapshot.employeeId] ?? null;
  }, [absenceByEmployee, selectedEmployeeSnapshot]);

  const teamAbsenceSummary = useMemo(() => {
    const stats = Object.values(absenceByEmployee);
    return {
      totalRequests: stats.reduce((sum, item) => sum + item.totalRequests, 0),
      approvedRequests: stats.reduce((sum, item) => sum + item.approvedRequests, 0),
      pendingRequests: stats.reduce((sum, item) => sum + item.pendingRequests, 0),
      approvedDays: stats.reduce((sum, item) => sum + item.approvedDays, 0),
    };
  }, [absenceByEmployee]);

  const teamInsights = useMemo(() => {
    const strengths: string[] = [];
    const watchpoints: string[] = [];

    if (averageAuditScore >= 75) strengths.push(`moyenne audits équipe solide à ${averageAuditScore}%`);
    if (teamBalisageAveragePerMonth > 0) strengths.push(`balisage équipe moyen à ${teamBalisageAveragePerMonth} contrôles par mois`);
    if (visitProgressToDate.visitsBehind > 0) watchpoints.push(`${visitProgressToDate.visitsBehind} visites manager en retard sur l'objectif annuel`);
    if (teamAbsenceSummary.pendingRequests > 0) watchpoints.push(`${teamAbsenceSummary.pendingRequests} demande(s) d'absence en attente sur l'équipe`);

    return { strengths, watchpoints };
  }, [averageAuditScore, teamAbsenceSummary.pendingRequests, teamBalisageAveragePerMonth, visitProgressToDate.visitsBehind]);

  const selectedBalisageReferenceObjective =
    selectedEmployeeSnapshot?.employeeId === ALL_EMPLOYEES_OPTION ? monthlyBalisageTarget : balisageObjective;

  const collaboratorInsights = useMemo(() => {
    const strengths: string[] = [];
    const watchpoints: string[] = [];

    if (selectedEmployeeSnapshot?.employeeId === ALL_EMPLOYEES_OPTION) {
      if (averageAuditScore >= 75) strengths.push(`moyenne audits equipe solide a ${averageAuditScore}%`);
      if (visitProgressToDate.visitsBehind > 0) watchpoints.push(`${visitProgressToDate.visitsBehind} visites manager en retard sur l'objectif annuel`);
      if (teamBalisageAveragePerMonth > 0) strengths.push(`balisage equipe moyen a ${teamBalisageAveragePerMonth} controles par mois`);
      return { strengths, watchpoints };
    }

    if (selectedEmployeeSnapshot) {
      if (selectedEmployeeSnapshot.bestScore != null && selectedEmployeeSnapshot.bestScore >= 80) {
        strengths.push(`a deja atteint ${selectedEmployeeSnapshot.bestScore.toFixed(0)}% sur un audit terrain`);
      }
      if (selectedEmployeeSnapshot.averageScore >= 75 && selectedEmployeeSnapshot.auditCount > 0) {
        strengths.push(`moyenne audits stable a ${selectedEmployeeSnapshot.averageScore}%`);
      }
      if (selectedEmployeeSnapshot.needsAttentionCount >= 2) {
        watchpoints.push(`${selectedEmployeeSnapshot.needsAttentionCount} audits sous 60%`);
      }
    }

    if (selectedEmployeeBalisage) {
      if (selectedEmployeeBalisage.bestMonthTotal >= selectedBalisageReferenceObjective) {
        strengths.push(`${selectedEmployeeBalisage.bestMonthLabel} a atteint ${selectedEmployeeBalisage.bestMonthTotal} controles`);
      }
      if (selectedEmployeeBalisage.currentMonthTotal < selectedBalisageReferenceObjective / 2) {
        watchpoints.push(`balisage du mois en cours encore bas a ${selectedEmployeeBalisage.currentMonthTotal} controles`);
      }
    }

    if (selectedEmployeeAbsence) {
      if (selectedEmployeeAbsence.pendingRequests > 0) {
        watchpoints.push(`${selectedEmployeeAbsence.pendingRequests} demande(s) d'absence en attente`);
      }
      if (selectedEmployeeAbsence.approvedDays >= 20) {
        watchpoints.push(`${selectedEmployeeAbsence.approvedDays} jours d'absence approuves depuis janvier`);
      }
    }

    return { strengths, watchpoints };
  }, [averageAuditScore, selectedBalisageReferenceObjective, selectedEmployeeAbsence, selectedEmployeeBalisage, selectedEmployeeSnapshot, teamBalisageAveragePerMonth, visitProgressToDate.visitsBehind]);

  useEffect(() => {
    if (!selectedEmployeeSnapshot) return;
    if (selectedEmployeeId !== selectedEmployeeSnapshot.employeeId) {
      setSelectedEmployeeId(selectedEmployeeSnapshot.employeeId);
    }
  }, [selectedEmployeeId, selectedEmployeeSnapshot]);

  useEffect(() => {
    if (!selectedEmployeeSnapshot) return;
    if (selectedEmployeeSnapshot.employeeId === ALL_EMPLOYEES_OPTION) {
      if (selectedAuditId !== null) setSelectedAuditId(null);
      return;
    }
    const belongsToEmployee = selectedEmployeeSnapshot.audits.some((audit) => audit.id === selectedAuditId);
    if (!belongsToEmployee && selectedAuditId !== null) {
      setSelectedAuditId(null);
    }
  }, [selectedAuditId, selectedEmployeeSnapshot]);

  const setDraftField = (key: keyof MetreAuditDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find((entry) => entry.id === employeeId) ?? null;
    setDraft((current) => ({
      ...current,
      employeeId,
      collaboratorName: employee?.name ?? "",
      rayon: current.rayon || employee?.rayons[0] || "",
    }));
  };

  const setRating = (sectionKey: string, questionKey: string, value: number) => {
    setDraft((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [sectionKey]: {
          ...current.sections[sectionKey],
          ratings: {
            ...current.sections[sectionKey].ratings,
            [questionKey]: value,
          },
        },
      },
    }));
  };

  const setBoolean = (sectionKey: string, questionKey: string, value: BooleanAnswer) => {
    setDraft((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [sectionKey]: {
          ...current.sections[sectionKey],
          booleans: {
            ...current.sections[sectionKey].booleans,
            [questionKey]: value,
          },
        },
      },
    }));
  };

  const setSectionComment = (sectionKey: string, comment: string) => {
    setDraft((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [sectionKey]: {
          ...current.sections[sectionKey],
          comment,
        },
      },
    }));
  };

  const toggleFormSection = (sectionKey: string) => {
    setExpandedFormSections((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }));
  };

  const toggleAuditSection = (sectionId: string) => {
    setExpandedAuditSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!draft.employeeId || !draft.collaboratorName.trim() || !draft.managerName.trim() || !draft.rayon.trim()) {
      setError("Collaborateur, manager et rayon sont obligatoires.");
      return;
    }

    setSaving(true);
    try {
      const result = await saveMetreAudit(draft);
      const recentAudits = await loadRecentMetreAudits(200);
      setAudits(recentAudits);
      setSelectedAuditId(null);
      setSelectedEmployeeId(draft.employeeId);
      setView("team");
      setSuccess(`Audit enregistré avec succès. Score global : ${result.globalScore.toFixed(0)}%.`);
      setDraft((current) => ({
        ...createEmptyMetreAuditDraft(),
        managerName: current.managerName,
      }));
      setExpandedFormSections(Object.fromEntries(METRE_A_METRE_SECTIONS.map((section, index) => [section.key, index === 0])));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Impossible d'enregistrer l'audit.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAudit = async () => {
    if (!selectedAuditDetail || deleting) return;

    const confirmed = window.confirm(
      `Supprimer l'audit de ${selectedAuditDetail.collaboratorName} du ${formatAuditDate(selectedAuditDetail.auditDate)} ?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeleting(true);

    try {
      await deleteMetreAudit(selectedAuditDetail.id);
      const recentAudits = await loadRecentMetreAudits(200);
      setAudits(recentAudits);
      setSelectedAuditId(null);
      setSelectedEmployeeId((current) => {
        if (current === ALL_EMPLOYEES_OPTION) return ALL_EMPLOYEES_OPTION;
        const exists = recentAudits.some((audit) => audit.employeeId === current);
        return exists ? current : ALL_EMPLOYEES_OPTION;
      });
      setSelectedAuditDetail(null);
      setSuccess("Audit supprimé avec succès.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Impossible de supprimer l'audit.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section style={{ display: "grid", gap: 16, marginTop: 20 }}>
      <ModuleHeader
        moduleKey="suivi"
        title="Suivi collaborateur"
        description="Socle local du suivi terrain manager. La saisie Mètre à mètre est conservée, mais la lecture devient plus compacte et plus claire."
        kicker="Terrain & Suivi"
      />

      <KPIRow>
        <KPI moduleKey="suivi" value={`${eligibleFieldVisitCount}`} label="Collaborateurs concernés" />
        <KPI moduleKey="suivi" value={`${audits.length}`} label="Audits enregistrés" />
        <KPI moduleKey="suivi" value={audits.length ? `${averageAuditScore}%` : "-"} label="Note moyenne audits" />
        <KPI moduleKey="suivi" value={teamBalisageAveragePerMonth} label="Balisage moyen / mois equipe" />
      </KPIRow>

      <Card style={{ border: "1px solid #e8ecf1", boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 22px rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.96)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
          <div>
            <Kicker moduleKey="suivi">Organisation</Kicker>
            <h2 style={{ marginTop: 6, fontSize: 20, color: "#0f172a" }}>Version de travail locale</h2>
            <p style={{ marginTop: 6, maxWidth: 720, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
              La page est maintenant séparée entre la saisie terrain et la consultation des audits pour éviter la sensation de long formulaire + long historique sur un seul écran.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <CompactPill active={view === "team"} onClick={() => setView("team")}>Suivi équipe</CompactPill>
            <CompactPill active={false} onClick={() => window.location.assign("/manager")}>Appli manager</CompactPill>
            <CompactPill active={view === "form"} onClick={() => setView("form")}>Saisir un audit</CompactPill>
          </div>
        </div>
      </Card>

      {view === "form" ? (
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(0, 1.4fr) minmax(300px, 0.8fr)", alignItems: "start" }}>
          <Card style={{ border: "1px solid #e8ecf1", boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 22px rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.96)" }}>
            <Kicker moduleKey="suivi">Mètre à mètre</Kicker>
            <h2 style={{ marginTop: 6, fontSize: 18, color: "#0f172a" }}>Saisie terrain</h2>
            <p style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
              Même contenu métier que la fiche d&apos;origine, avec des sections repliables pour un usage plus propre.
            </p>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: 12 }}>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Collaborateur</span>
                <select
                  value={draft.employeeId}
                  onChange={(event) => handleEmployeeChange(event.target.value)}
                  disabled={loading}
                  style={{ minHeight: 38, borderRadius: 10, border: "1px solid #dbe3eb", padding: "0 10px", fontSize: 12, color: "#0f172a" }}
                >
                  <option value="">Sélectionner un collaborateur</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Date audit</span>
                <input
                  type="date"
                  value={draft.auditDate}
                  onChange={(event) => setDraftField("auditDate", event.target.value)}
                  style={{ minHeight: 38, borderRadius: 10, border: "1px solid #dbe3eb", padding: "0 10px", fontSize: 12 }}
                />
              </label>

              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Rayon</span>
                <input
                  value={draft.rayon}
                  onChange={(event) => setDraftField("rayon", event.target.value)}
                  placeholder="Ex: Liquides"
                  style={{ minHeight: 38, borderRadius: 10, border: "1px solid #dbe3eb", padding: "0 10px", fontSize: 12 }}
                />
              </label>

              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Manager</span>
                <input
                  value={draft.managerName}
                  onChange={(event) => setDraftField("managerName", event.target.value)}
                  placeholder="Nom du manager"
                  style={{ minHeight: 38, borderRadius: 10, border: "1px solid #dbe3eb", padding: "0 10px", fontSize: 12 }}
                />
              </label>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              {METRE_A_METRE_SECTIONS.map((section) => {
                const response = draft.sections[section.key];
                const sectionScore = computeSectionScore(section, response);
                const sectionTone = statusTone(sectionScore);
                const expanded = expandedFormSections[section.key];
                const answeredCount = section.type === "rating"
                  ? Object.values(response.ratings).filter((value) => typeof value === "number").length
                  : Object.values(response.booleans).filter((value) => value === "OUI" || value === "NON").length;

                return (
                  <div
                    key={section.key}
                    style={{
                      borderRadius: 14,
                      border: `1px solid ${expanded ? theme.medium : "#e8ecf1"}`,
                      background: "#fff",
                      overflow: "hidden",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFormSection(section.key)}
                      style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        background: expanded ? theme.light : "#fff",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <strong style={{ fontSize: 13, color: "#0f172a" }}>{section.label}</strong>
                          <span style={{ fontSize: 11, color: "#64748b" }}>Coeff. {section.coefficient}%</span>
                          <span style={{ fontSize: 11, color: "#64748b" }}>{answeredCount}/{section.questions.length} réponses</span>
                        </div>
                        {!expanded ? (
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                            {section.type === "rating" ? "Notation terrain" : "Conformité oui / non"}
                          </div>
                        ) : null}
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 999,
                            padding: "4px 10px",
                            background: sectionTone.bg,
                            color: sectionTone.color,
                          }}
                        >
                          {expanded ? "Ouvert" : "Fermé"}
                        </span>
                        <SectionScoreBadge score={sectionScore} />
                      </div>
                    </button>

                    {expanded ? (
                      <div style={{ display: "grid", gap: 12, padding: "0 14px 14px" }}>
                        {section.type === "rating" ? (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
                            {RATING_LEGEND.map((entry) => (
                              <div
                                key={entry.value}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 8,
                                  minHeight: 34,
                                  borderRadius: 999,
                                  border: `1px solid ${entry.border}`,
                                  background: entry.background,
                                  color: entry.color,
                                  padding: "0 10px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                <span>{entry.value}</span>
                                <span>{entry.label}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {section.questions.map((question) => (
                          <div key={question.key} style={{ display: "grid", gap: 8, borderRadius: 12, border: "1px solid #eef2f7", background: "#fbfcfe", padding: "10px 12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{question.label}</div>
                              {question.type === "boolean" && question.expectedAnswer ? (
                                <span style={{ fontSize: 11, color: "#64748b" }}>Attendu : {question.expectedAnswer}</span>
                              ) : null}
                            </div>

                            {question.type === "rating" ? (
                              <StarRatingInput
                                value={response.ratings[question.key]}
                                onChange={(next) => setRating(section.key, question.key, next)}
                              />
                            ) : (
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {(["OUI", "NON"] as const).map((answer) => {
                                  const active = response.booleans[question.key] === answer;
                                  const expected = question.expectedAnswer === answer;
                                  return (
                                    <button
                                      key={answer}
                                      type="button"
                                      onClick={() => setBoolean(section.key, question.key, answer)}
                                      style={{
                                        minWidth: 72,
                                        minHeight: 36,
                                        borderRadius: 10,
                                        border: `1px solid ${active ? (expected ? "#86efac" : "#fca5a5") : "#dbe3eb"}`,
                                        background: active ? (expected ? "#ecfdf5" : "#fef2f2") : "#fff",
                                        color: active ? (expected ? "#166534" : "#991b1b") : "#334155",
                                        fontWeight: 700,
                                        fontSize: 12,
                                        cursor: "pointer",
                                      }}
                                    >
                                      {answer}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}

                        <textarea
                          value={response.comment}
                          onChange={(event) => setSectionComment(section.key, event.target.value)}
                          rows={2}
                          placeholder={`Commentaire ${section.label}`}
                          style={{
                            width: "100%",
                            borderRadius: 10,
                            border: "1px solid #dbe3eb",
                            padding: "10px 12px",
                            fontSize: 12,
                            resize: "vertical",
                            fontFamily: "inherit",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span>Axes de progrès</span>
                <textarea
                  value={draft.progressAxes}
                  onChange={(event) => setDraftField("progressAxes", event.target.value)}
                  rows={4}
                  placeholder="Remarques globales, points à travailler, suivi à prévoir..."
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    border: "1px solid #dbe3eb",
                    padding: "10px 12px",
                    fontSize: 12,
                    resize: "vertical",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </label>
            </div>

            {error ? <div style={{ marginTop: 12, fontSize: 12, color: "#b91c1c" }}>{error}</div> : null}
            {success ? <div style={{ marginTop: 12, fontSize: 12, color: "#166534" }}>{success}</div> : null}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                style={{
                  minHeight: 40,
                  borderRadius: 10,
                  border: `1px solid ${theme.color}`,
                  background: theme.light,
                  color: theme.color,
                  padding: "0 18px",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: saving || loading ? "not-allowed" : "pointer",
                  opacity: saving || loading ? 0.7 : 1,
                }}
              >
                {saving ? "Enregistrement..." : "Enregistrer l'audit"}
              </button>
            </div>
          </Card>

          <Card style={{ border: "1px solid #e8ecf1", boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 22px rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.96)", alignSelf: "start", position: "sticky", top: 88 }}>
            <Kicker moduleKey="suivi">Lecture rapide</Kicker>
            <h2 style={{ marginTop: 6, fontSize: 18, color: "#0f172a" }}>Synthèse instantanée</h2>

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <div style={{ borderRadius: 14, background: theme.gradient, border: `1px solid ${theme.medium}`, padding: "14px 12px" }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>Collaborateur</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
                  {selectedEmployee?.name || "Non sélectionné"}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                  {draft.rayon || selectedEmployee?.rayons[0] || "Rayon à préciser"}
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {METRE_A_METRE_SECTIONS.map((section) => {
                  const score = computeSectionScore(section, draft.sections[section.key]);
                  return (
                    <div
                      key={section.key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                        borderRadius: 12,
                        border: "1px solid #e8ecf1",
                        background: "#fff",
                        padding: "10px 12px",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{section.label}</div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Coeff. {section.coefficient}%</div>
                      </div>
                      <SectionScoreBadge score={score} />
                    </div>
                  );
                })}
              </div>

              <div style={{ borderRadius: 12, border: "1px dashed #d6ccfa", background: "#faf7ff", padding: "12px 14px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6d28d9" }}>Avancement</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 4, lineHeight: 1.6 }}>
                  {completedSections}/{METRE_A_METRE_SECTIONS.length} sections complétées. Le score global se met à jour en direct à mesure de la saisie.
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : view === "team" ? (
        <Card style={{ border: "1px solid #e8ecf1", boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 22px rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.96)" }}>
          <Kicker moduleKey="suivi">Suivi équipe</Kicker>
          <h2 style={{ marginTop: 6, fontSize: 18, color: "#0f172a" }}>Vue collaborateur</h2>
          <p style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
            Toute l&apos;équipe reste visible, même sans audit. On choisit un collaborateur, on voit ses stats, ses audits, puis le détail complet du compte-rendu.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <CompactPill active={teamSubview === "overview"} onClick={() => setTeamSubview("overview")}>
              Suivi équipe
            </CompactPill>
            <CompactPill active={teamSubview === "collaborator"} onClick={() => setTeamSubview("collaborator")}>
              Suivi collaborateur
            </CompactPill>
          </div>
          {error ? <div style={{ marginTop: 10, fontSize: 12, color: "#b91c1c" }}>{error}</div> : null}
          {success ? <div style={{ marginTop: 10, fontSize: 12, color: "#166534" }}>{success}</div> : null}

          {teamSubview === "overview" ? (
          <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <div style={{ display: "grid", gap: 12 }}>
              <TeamBarsChart
                title="Controle balisage equipe"
                subtitle={`Base suivie : ${eligibleBalisageCount} collaborateurs concernes · objectif equipe ${monthlyBalisageTarget} controles / mois`}
                points={teamBalisageSeries}
                color="#c4b5fd"
                accent="#8b5cf6"
                unit="controles"
                targetLabel={`Objectif equipe ${monthlyBalisageTarget}`}
                tone="violet"
              />

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <div style={innerTileStyle}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Collaborateurs concernes</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{eligibleBalisageCount}</div>
                </div>
                <div style={innerTileStyle}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Objectif / collaborateur</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{balisageObjective}</div>
                </div>
                <div style={innerTileStyle}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Objectif equipe / mois</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#6d28d9", marginTop: 4 }}>{monthlyBalisageTarget}</div>
                </div>
                <div
                  style={{
                    ...innerTileStyle,
                    borderColor: teamBalisageGap > 0 ? "#ddd6fe" : "#bbf7d0",
                    background: teamBalisageGap > 0 ? "#faf7ff" : "#f0fdf4",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#64748b" }}>{teamCurrentBalisageLabel} realise</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: teamBalisageGap > 0 ? "#6d28d9" : "#166534", marginTop: 4 }}>
                    {teamCurrentBalisage}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
                    {teamBalisageGap > 0 ? `${teamBalisageGap} controles manquants pour atteindre la cible` : "objectif atteint ou depasse"}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <TeamBarsChart
                title="Visites terrain manager"
                subtitle={`Objectif terrain : voir ${eligibleFieldVisitCount} collaborateurs concernes au moins 3 fois dans l'annee`}
                points={teamAuditSeries}
                color="#fecaca"
                accent="#ef4444"
                unit="visites"
                targetLabel={`Objectif ${monthlyVisitsTarget}/mois`}
                tone="red"
              />

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <div style={innerTileStyle}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Collaborateurs concernes</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{eligibleFieldVisitCount}</div>
                </div>
                <div style={innerTileStyle}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Objectif annuel</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{annualVisitsTarget}</div>
                </div>
                <div style={innerTileStyle}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Objectif / quadrimestre</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{quadrimesterVisitsTarget}</div>
                </div>
                <div style={innerTileStyle}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Objectif lisse / mois</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#ef4444", marginTop: 4 }}>{monthlyVisitsTarget}</div>
                </div>
                <div style={{ ...innerTileStyle, gridColumn: "1 / -1", borderColor: visitProgressToDate.visitsBehind > 0 ? "#fecaca" : "#bbf7d0", background: visitProgressToDate.visitsBehind > 0 ? "#fff5f5" : "#f0fdf4" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 11, color: visitProgressToDate.visitsBehind > 0 ? "#991b1b" : "#166534" }}>Avance / retard</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: visitProgressToDate.visitsBehind > 0 ? "#b91c1c" : "#166534", marginTop: 4 }}>
                        {visitProgressToDate.visitsBehind > 0 ? `${visitProgressToDate.visitsBehind} visite(s) en retard` : "Rythme tenu"}
                      </div>
                    </div>
                    <div style={{ minWidth: 160, fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>
                      <div>Fait : <strong style={{ color: "#0f172a" }}>{visitProgressToDate.visitsDone}</strong></div>
                      <div>Attendu a date : <strong style={{ color: "#0f172a" }}>{visitProgressToDate.expectedVisits}</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(320px, 1fr) minmax(240px, 0.8fr) minmax(240px, 0.8fr)" }}>
            <div style={innerTileStyle}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Absences depuis janvier</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                Vision consolidée de toute l&apos;équipe
              </div>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 12 }}>
                <div style={{ borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Demandes</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{teamAbsenceSummary.totalRequests}</div>
                </div>
                <div style={{ borderRadius: 12, background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Jours approuvés</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#1d4ed8", marginTop: 4 }}>{teamAbsenceSummary.approvedDays}</div>
                </div>
                <div style={{ borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Approuvées</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#166534", marginTop: 4 }}>{teamAbsenceSummary.approvedRequests}</div>
                </div>
                <div style={{ borderRadius: 12, background: "#fff7ed", border: "1px solid #fdba74", padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>En attente</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#c2410c", marginTop: 4 }}>{teamAbsenceSummary.pendingRequests}</div>
                </div>
              </div>
            </div>

            <div style={{ borderRadius: 16, border: "1px solid #bbf7d0", background: "#f0fdf4", padding: "14px 16px", boxShadow: innerTileStyle.boxShadow }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#166534" }}>Points forts</div>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {teamInsights.strengths.length ? teamInsights.strengths.map((item) => (
                  <div key={item} style={{ fontSize: 12, color: "#166534", lineHeight: 1.6 }}>
                    • {item}
                  </div>
                )) : (
                  <div style={{ fontSize: 12, color: "#166534", lineHeight: 1.6 }}>
                    Aucun point fort majeur ne remonte encore.
                  </div>
                )}
              </div>
            </div>

            <div style={{ borderRadius: 16, border: "1px solid #fecaca", background: "#fef2f2", padding: "14px 16px", boxShadow: innerTileStyle.boxShadow }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#b91c1c" }}>Points de vigilance</div>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {teamInsights.watchpoints.length ? teamInsights.watchpoints.map((item) => (
                  <div key={item} style={{ fontSize: 12, color: "#991b1b", lineHeight: 1.6 }}>
                    • {item}
                  </div>
                )) : (
                  <div style={{ fontSize: 12, color: "#991b1b", lineHeight: 1.6 }}>
                    Aucun signal d&apos;alerte majeur ne remonte pour l&apos;instant.
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
          ) : (
          <div style={{ display: "grid", gap: 14, marginTop: 14, alignItems: "start" }}>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(260px, 0.82fr) minmax(0, 1.18fr)", alignSelf: "start" }}>
              <div style={{ ...innerTileStyle, background: "#fbfcfe", padding: "12px 14px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Collaborateur</div>
                <select
                  value={selectedEmployeeSnapshot?.employeeId ?? ""}
                  onChange={(event) => {
                    const employeeId = event.target.value;
                    setSelectedEmployeeId(employeeId || null);
                    if (employeeId === ALL_EMPLOYEES_OPTION) {
                      setSelectedAuditId(null);
                      return;
                    }
                    setSelectedAuditId(null);
                  }}
                  disabled={historyLoading || loading}
                  style={{
                    width: "100%",
                    minHeight: 40,
                    marginTop: 10,
                    borderRadius: 10,
                    border: "1px solid #dbe3eb",
                    padding: "0 12px",
                    fontSize: 12,
                    color: "#0f172a",
                    background: "#fff",
                  }}
                >
                  <option value={ALL_EMPLOYEES_OPTION}>Toute l&apos;équipe</option>
                  {employeeSnapshots.map((employee) => (
                    <option key={employee.employeeId} value={employee.employeeId}>
                      {employee.name}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
                  {selectedEmployeeSnapshot?.rayons.join(", ") || "Rayon non renseigné"}
                </div>
              </div>

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1.1fr 1fr" }}>
                <div style={innerTileStyle}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Absences depuis janvier</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                    Lecture directe de la table absences pour la sélection en cours
                  </div>

                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 12 }}>
                    <div style={{ borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Demandes</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{selectedEmployeeAbsence?.totalRequests ?? 0}</div>
                    </div>
                    <div style={{ borderRadius: 12, background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Jours approuvés</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#1d4ed8", marginTop: 4 }}>{selectedEmployeeAbsence?.approvedDays ?? 0}</div>
                    </div>
                    <div style={{ borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Approuvées</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#166534", marginTop: 4 }}>{selectedEmployeeAbsence?.approvedRequests ?? 0}</div>
                    </div>
                    <div style={{ borderRadius: 12, background: "#fff7ed", border: "1px solid #fdba74", padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, color: "#64748b" }}>En attente</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#c2410c", marginTop: 4 }}>{selectedEmployeeAbsence?.pendingRequests ?? 0}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ borderRadius: 16, border: "1px solid #bbf7d0", background: "#f0fdf4", padding: "14px 16px", boxShadow: innerTileStyle.boxShadow }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#166534" }}>Points forts</div>
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      {collaboratorInsights.strengths.length ? collaboratorInsights.strengths.slice(0, 2).map((item) => (
                        <div key={item} style={{ fontSize: 12, color: "#166534", lineHeight: 1.6 }}>
                          • {item}
                        </div>
                      )) : (
                        <div style={{ fontSize: 12, color: "#166534", lineHeight: 1.6 }}>
                          Aucun point fort majeur ne remonte encore.
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ borderRadius: 16, border: "1px solid #fecaca", background: "#fef2f2", padding: "14px 16px", boxShadow: innerTileStyle.boxShadow }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#b91c1c" }}>Points de vigilance</div>
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      {collaboratorInsights.watchpoints.length ? collaboratorInsights.watchpoints.slice(0, 2).map((item) => (
                        <div key={item} style={{ fontSize: 12, color: "#991b1b", lineHeight: 1.6 }}>
                          • {item}
                        </div>
                      )) : (
                        <div style={{ fontSize: 12, color: "#991b1b", lineHeight: 1.6 }}>
                          Aucun signal d&apos;alerte majeur ne remonte pour l&apos;instant.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ ...innerTileStyle, gridColumn: "1 / -1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#8b5cf6", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Vue collaborateur
                      </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                      {selectedEmployeeSnapshot?.name || "Aucun collaborateur"}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                      {selectedEmployeeSnapshot?.rayons.join(", ") || "Rayon à préciser"}
                    </div>
                  </div>

                  {selectedEmployeeSnapshot?.lastScore != null ? (
                    <SectionScoreBadge score={selectedEmployeeSnapshot.lastScore} />
                  ) : null}
                </div>

                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", marginTop: 14 }}>
                  <div style={{ borderRadius: 12, background: "#faf7ff", border: "1px solid #e9ddff", padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Audits</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{selectedEmployeeSnapshot?.auditCount ?? 0}</div>
                  </div>
                  <div style={{ borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Moyenne</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                      {selectedEmployeeSnapshot?.auditCount ? `${selectedEmployeeSnapshot.averageScore}%` : "-"}
                    </div>
                  </div>
                  <div style={{ borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Meilleur score</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#166534", marginTop: 4 }}>
                      {selectedEmployeeSnapshot?.bestScore != null ? `${selectedEmployeeSnapshot.bestScore.toFixed(0)}%` : "-"}
                    </div>
                  </div>
                  <div style={{ borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Scores &lt; 60%</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#b91c1c", marginTop: 4 }}>
                      {selectedEmployeeSnapshot?.needsAttentionCount ?? 0}
                  </div>
                </div>
              </div>

              <div style={{ ...innerTileStyle, gridColumn: "1 / -1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Balisage depuis janvier</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                      Lecture directe depuis les controles mensuels en base
                    </div>
                  </div>
                  {selectedEmployeeBalisage ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        borderRadius: 999,
                        padding: "4px 10px",
                        background: "#ecfeff",
                        color: "#0b7285",
                        border: "1px solid #a5f3fc",
                      }}
                    >
                      {selectedEmployeeBalisage.progressPercent}% objectif
                    </span>
                  ) : null}
                </div>

                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", marginTop: 14 }}>
                  <div style={{ borderRadius: 12, background: "#ecfeff", border: "1px solid #a5f3fc", padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Total depuis janvier</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                      {selectedEmployeeBalisage?.totalControls ?? 0}
                    </div>
                  </div>
                  <div style={{ borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Moyenne / mois</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                      {selectedEmployeeBalisage ? selectedEmployeeBalisage.averagePerMonth : 0}
                    </div>
                  </div>
                  <div style={{ borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Meilleur mois</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#166534", marginTop: 4 }}>
                      {selectedEmployeeBalisage?.bestMonthLabel ?? "-"}
                    </div>
                    <div style={{ fontSize: 11, color: "#166534", marginTop: 4 }}>
                      {selectedEmployeeBalisage?.bestMonthTotal ?? 0} controles
                    </div>
                  </div>
                  <div style={{ borderRadius: 12, background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Mois en cours</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#1d4ed8", marginTop: 4 }}>
                      {selectedEmployeeBalisage?.currentMonthLabel ?? "-"}
                    </div>
                    <div style={{ fontSize: 11, color: "#1d4ed8", marginTop: 4 }}>
                      {selectedEmployeeBalisage?.currentMonthTotal ?? 0} controles
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                  {(selectedEmployeeBalisage?.months ?? []).map((month) => (
                    <div
                      key={month.monthId}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto auto",
                        gap: 10,
                        alignItems: "center",
                        borderRadius: 12,
                        border: "1px solid #e8ecf1",
                        background: "#fbfcfe",
                        padding: "10px 12px",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{month.label}</div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                          {month.errorRate == null ? "Taux d'erreur non saisi" : `Taux d'erreur ${month.errorRate}%`}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>{month.total}</div>
                      <div
                        style={{
                          width: 96,
                          height: 8,
                          borderRadius: 999,
                          background: "#e2e8f0",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(Math.round((month.total / Math.max(selectedBalisageReferenceObjective, 1)) * 100), 100)}%`,
                            height: "100%",
                            borderRadius: 999,
                            background: month.total >= selectedBalisageReferenceObjective ? "#16a34a" : month.total >= selectedBalisageReferenceObjective / 2 ? "#d97706" : "#94a3b8",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

              <div style={{ ...innerTileStyle, gridColumn: "1 / -1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>
                      {selectedEmployeeSnapshot?.employeeId === ALL_EMPLOYEES_OPTION ? "Audits réalisés" : "Historique des audits"}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                      {selectedEmployeeSnapshot?.employeeId === ALL_EMPLOYEES_OPTION
                        ? `${audits.length} audit(s) enregistré(s) pour l'équipe`
                        : "Clique sur une fiche pour ouvrir le détail complet tout en bas"}
                    </div>
                  </div>
                  {selectedEmployeeSnapshot?.lastAuditDate ? (
                    <span style={{ fontSize: 11, color: "#64748b" }}>Dernier audit : {compactDate(selectedEmployeeSnapshot.lastAuditDate)}</span>
                  ) : null}
                </div>

                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                  {selectedEmployeeAudits.length ? (
                    selectedEmployeeAudits.map((audit) => {
                      const active = audit.id === selectedAuditId;
                      return (
                        <button
                          key={audit.id}
                          type="button"
                          onClick={() => setSelectedAuditId((current) => (current === audit.id ? null : audit.id))}
                          style={{
                            textAlign: "left",
                            borderRadius: 14,
                            border: `1px solid ${active ? theme.color : "#dbe3eb"}`,
                            background: active ? "#faf7ff" : "#fff",
                            padding: "12px 14px",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ fontSize: 13, color: "#0f172a" }}>
                                {audit.collaboratorName} · {formatAuditDate(audit.auditDate)}
                              </strong>
                              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                                Rayon {audit.rayon} · Manager {audit.managerName || "Non renseigné"}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <SectionScoreBadge score={audit.globalScore} />
                              <span style={{ fontSize: 11, color: active ? theme.color : "#64748b", fontWeight: 700 }}>
                                {active ? "Réduire" : "Ouvrir"}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div style={{ borderRadius: 14, border: "1px dashed #dbe3eb", background: "#fbfcfe", padding: "14px 16px", fontSize: 12, color: "#64748b" }}>
                      Aucun audit enregistré pour ce collaborateur pour l&apos;instant.
                    </div>
                  )}
                </div>
              </div>

            </div>

            <div style={{ border: "1px solid #dbe3eb", borderRadius: 16, background: "#fff", padding: "14px 16px" }}>
              {selectedAuditDetail ? (
                <div style={{ display: "grid", gap: 14 }}>
                  {(() => {
                    const auditTone = globalAuditTone(selectedAuditDetail.globalScore);
                    return (
                      <div
                        style={{
                          borderRadius: 18,
                          border: `1px solid ${auditTone.border}`,
                          background: auditTone.background,
                          padding: "16px 18px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: auditTone.accent }}>
                              Fiche de visite
                            </div>
                            <h3 style={{ margin: "6px 0 0", fontSize: 22, color: "#0f172a" }}>{selectedAuditDetail.collaboratorName}</h3>
                            <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
                              Date : {formatAuditDate(selectedAuditDetail.auditDate)} | Rayon : {selectedAuditDetail.rayon}
                            </div>
                            <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                              Manager : {selectedAuditDetail.managerName || "Non renseigné"}
                            </div>
                          </div>

                          <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: auditTone.accent }}>
                              SCORE : {selectedAuditDetail.globalScore.toFixed(0)}%
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                color: auditTone.accent,
                                borderRadius: 999,
                                border: `1px solid ${auditTone.border}`,
                                background: "#ffffffb8",
                                padding: "4px 10px",
                              }}
                            >
                              {auditTone.label}
                            </div>
                            <button
                              type="button"
                              onClick={handleDeleteAudit}
                              disabled={deleting}
                              style={{
                                minHeight: 34,
                                borderRadius: 999,
                                border: "1px solid #fca5a5",
                                background: "#fff5f5",
                                color: "#b91c1c",
                                padding: "0 12px",
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: deleting ? "not-allowed" : "pointer",
                                opacity: deleting ? 0.7 : 1,
                              }}
                            >
                              {deleting ? "Suppression..." : "Supprimer l'audit"}
                            </button>
                          </div>
                        </div>

                        <div style={{ marginTop: 14 }}>
                          <div style={{ height: 12, borderRadius: 999, background: "#ffffffa8", overflow: "hidden", border: "1px solid #ffffffb8" }}>
                            <div
                              style={{
                                width: `${selectedAuditDetail.globalScore}%`,
                                height: "100%",
                                borderRadius: 999,
                                background: auditTone.progress,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {selectedAuditDetail.sections.map((section) => (
                      <div
                        key={section.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          minHeight: 34,
                          borderRadius: 999,
                          border: "1px solid #e8ecf1",
                          background: "#fbfcfe",
                          padding: "0 10px",
                          fontSize: 11,
                        }}
                      >
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{section.label}</span>
                        <SectionScoreBadge score={section.score} />
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    {selectedAuditDetail.sections.map((section) => {
                      const expanded = expandedAuditSections[section.id];
                      const sectionTone = statusTone(section.score);
                      return (
                        <div
                          key={section.id}
                          style={{
                            borderRadius: 14,
                            border: `1px solid ${sectionTone.border}`,
                            background: "#ffffff",
                            overflow: "hidden",
                            boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => toggleAuditSection(section.id)}
                            style={{
                              width: "100%",
                              border: "none",
                              background: "#fff",
                              cursor: "pointer",
                              textAlign: "left",
                              padding: "12px 14px",
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              alignItems: "center",
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                <strong style={{ fontSize: 13, color: "#0f172a" }}>{section.label}</strong>
                                <span style={{ fontSize: 11, color: "#64748b" }}>Coeff. {section.coefficient}%</span>
                                <span style={{ fontSize: 11, color: "#64748b" }}>{section.items.length} points</span>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 11, color: "#64748b" }}>{expanded ? "Réduire" : "Voir le détail"}</span>
                              <SectionScoreBadge score={section.score} />
                            </div>
                          </button>

                          {expanded ? (
                            <div style={{ display: "grid", gap: 8, padding: "0 14px 14px" }}>
                              {section.items.map((item) => {
                                const itemScore = statusTone(item.scoreValue);
                                return (
                                  <div
                                    key={item.id}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "minmax(0, 1fr) auto",
                                      gap: 10,
                                      alignItems: "center",
                                      borderRadius: 12,
                                      background: "#fff",
                                      border: "1px solid #e8ecf1",
                                      padding: "10px 12px",
                                    }}
                                  >
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{item.label}</div>
                                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                                        {item.type === "rating"
                                          ? `Notation ${item.ratingValue ?? 0}/5`
                                          : `Réponse ${item.booleanAnswer ?? "-"}${item.expectedAnswer ? ` · Attendu ${item.expectedAnswer}` : ""}`}
                                      </div>
                                    </div>

                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        borderRadius: 999,
                                        padding: "4px 10px",
                                        background: itemScore.bg,
                                        color: itemScore.color,
                                        border: `1px solid ${itemScore.border}`,
                                      }}
                                    >
                                      {item.type === "rating" ? `${item.ratingValue ?? 0}/5` : `${item.scoreValue.toFixed(0)}%`}
                                    </span>
                                  </div>
                                );
                              })}

                              {section.comment ? (
                                <div
                                  style={{
                                    borderRadius: 12,
                                    border: "1px solid #fde68a",
                                    background: "#fffbeb",
                                    padding: "12px 14px",
                                  }}
                                >
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>Observation terrain</div>
                                  <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.65, marginTop: 6 }}>{section.comment}</div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {selectedAuditDetail.progressAxes ? (
                    <div style={{ borderRadius: 12, border: `1px solid ${theme.medium}`, background: theme.gradient, padding: "12px 14px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Axes de progrès</div>
                      <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6, marginTop: 6 }}>
                        {selectedAuditDetail.progressAxes}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div style={{ borderRadius: 16, border: "1px dashed #dbe3eb", background: "#fbfcfe", padding: "18px 20px", fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
                  Aucune fiche visite ouverte pour l&apos;instant.
                  <br />
                  Choisis un collaborateur puis ouvre seulement la fiche que tu veux consulter.
                </div>
              )}
            </div>
          </div>
          )}
        </Card>
      ) : (
        <Card style={{ border: "1px solid #e8ecf1", boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 22px rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.96)" }}>
          <Kicker moduleKey="suivi">Mobile manager</Kicker>
          <h2 style={{ marginTop: 6, fontSize: 18, color: "#0f172a" }}>Préparation terrain mobile</h2>
          <p style={{ marginTop: 6, fontSize: 12, color: "#64748b", maxWidth: 860, lineHeight: 1.6 }}>
            Cette vue pose déjà les briques de la future application manager : parcours rapide, saisie section par section, synthèse immédiate, et retour automatique dans le suivi collaborateur.
          </p>

          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)", marginTop: 16, alignItems: "start" }}>
            <div
              style={{
                borderRadius: 28,
                border: "1px solid #d8ccff",
                background: "linear-gradient(180deg, #ffffff 0%, #faf7ff 100%)",
                boxShadow: "0 12px 28px rgba(91,33,182,0.10)",
                padding: "14px 14px 18px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8b5cf6" }}>
                    Manager 2026
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>Mètre à mètre</div>
                </div>
                <div style={{ fontSize: 11, color: "#64748b", borderRadius: 999, border: "1px solid #e9ddff", background: "#fff", padding: "5px 10px" }}>
                  Étape 2/6
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ borderRadius: 18, border: "1px solid #e9ddff", background: "#fff", padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Collaborateur</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                    {selectedEmployeeSnapshot?.name || "Collaborateur à choisir"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    {selectedEmployeeSnapshot?.rayons[0] || draft.rayon || "Rayon à préciser"}
                  </div>
                </div>

                <div style={{ borderRadius: 18, border: "1px solid #e9ddff", background: "#fff", padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Présentation rayon</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Notation tactile en un geste</div>
                    </div>
                    <SectionScoreBadge score={computeSectionScore(METRE_A_METRE_SECTIONS[0], draft.sections.presentation_rayon)} />
                  </div>

                  <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                    {METRE_A_METRE_SECTIONS[0].questions.slice(0, 3).map((question) => (
                      <div key={question.key} style={{ borderRadius: 12, border: "1px solid #f1eaff", background: "#faf7ff", padding: "10px 12px" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{question.label}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          {RATING_LEGEND.map((entry) => (
                            <span
                              key={entry.value}
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 999,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: entry.background,
                                border: `1px solid ${entry.border}`,
                                color: entry.color,
                                fontSize: 11,
                                fontWeight: 800,
                              }}
                            >
                              {entry.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" style={{ flex: 1, minHeight: 42, borderRadius: 14, border: "1px solid #ddd6fe", background: "#fff", color: "#6d28d9", fontWeight: 800, fontSize: 12 }}>
                    Brouillon
                  </button>
                  <button type="button" style={{ flex: 1.2, minHeight: 42, borderRadius: 14, border: "1px solid #8b5cf6", background: "#8b5cf6", color: "#fff", fontWeight: 800, fontSize: 12 }}>
                    Valider l&apos;audit
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <div style={{ borderRadius: 16, border: "1px solid #e8ecf1", background: "#fff", padding: "14px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Ce qui est déjà prêt</div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
                    Saisie métier complète, calcul des scores, enregistrement Supabase, lecture détaillée, suppression d&apos;un audit test, et base du suivi par collaborateur.
                  </div>
                </div>
                <div style={{ borderRadius: 16, border: "1px solid #e8ecf1", background: "#fff", padding: "14px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Ce que cette vue prépare</div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
                    Une app manager centrée sur l&apos;action terrain : choisir un collaborateur, saisir rapidement, puis retrouver la synthèse dans le suivi équipe sans ressaisie.
                  </div>
                </div>
              </div>

              <div style={{ borderRadius: 18, border: "1px solid #ddd6fe", background: "linear-gradient(135deg, #faf7ff 0%, #ffffff 100%)", padding: "16px 18px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#6d28d9", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Parcours mobile recommandé
                </div>
                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  {[
                    "Choix du collaborateur et du rayon",
                    "Saisie section par section avec gros boutons tactiles",
                    "Validation rapide avec score visible tout de suite",
                    "Remontée automatique dans le suivi collaborateur côté manager",
                  ].map((step, index) => (
                    <div key={step} style={{ display: "flex", gap: 12, alignItems: "center", borderRadius: 14, border: "1px solid #e9ddff", background: "#fff", padding: "10px 12px" }}>
                      <div style={{ width: 28, height: 28, borderRadius: 999, background: "#8b5cf6", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
                        {index + 1}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>{step}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}
