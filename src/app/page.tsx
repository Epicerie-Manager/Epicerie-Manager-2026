"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card }        from "@/components/ui/card";
import { Kicker }      from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { ProgressBar } from "@/components/ui/progress-bar";
import { NavCard, NavCardGrid } from "@/components/ui/nav-card";
import ManagerNotesCard from "@/components/dashboard/manager-notes-card";
import type { ModuleAccessKey } from "@/lib/modules-config";
import { moduleThemes } from "@/lib/theme";
import { isAdminUser } from "@/lib/admin-access";
import { getVisibleModules, isLimitedOfficeAccessRole } from "@/lib/modules-config";
import { absenceTypes } from "@/lib/absences-data";
import { loadAbsenceRequests, getAbsencesUpdatedEventName, syncAbsencesFromSupabase } from "@/lib/absences-store";
import { hasBrowserWindow } from "@/lib/browser-cache";
import { balisageMonths, balisageObjective, type BalisageEmployeeStat } from "@/lib/balisage-data";
import { getBalisageDynamicStatus, getCurrentBalisageMonthId } from "@/lib/balisage-metrics";
import { attachRhActivityToBalisageStats, getActiveBalisageStats, getInactiveBalisageStats } from "@/lib/balisage-rh";
import { formatPresenceThresholdSummary, getPresenceThresholdLevel } from "@/lib/presence-thresholds";
import {
  getPresenceThresholdsUpdatedEventName,
  loadPresenceThresholds,
  syncPresenceThresholdsFromSupabase,
} from "@/lib/presence-thresholds-store";
import { loadBalisageData, getBalisageUpdatedEventName, syncBalisageFromSupabase } from "@/lib/balisage-store";
import {
  planningEmployees,
  getPlanningMonthKey,
  loadPlanningOverrides,
  loadPlanningTriData,
  formatPlanningDate,
  getPlanningStatus,
  getPlanningTriPairForDate,
  getPlanningUpdatedEventName,
  syncPlanningFromSupabase,
  type PlanningOverrides,
  type PlanningTriData,
} from "@/lib/planning-store";
import { getPlanningPresenceCountsForDate, isPlanningEmployeeCountedForPresence } from "@/lib/planning-presence";
import { getRhUpdatedEventName, loadRhEmployees, syncRhFromSupabase } from "@/lib/rh-store";
import { loadLatestRupturesCountForToday } from "@/lib/ruptures-store";
import { getPlateauWeekFocusData } from "@/lib/plateau-data";
import { createClient } from "@/lib/supabase";
import { getOfficeProfileFirstName, loadCurrentOfficeProfile } from "@/lib/office-profile";

type AlertTone = "yellow" | "red" | "blue";
type RankStatus = "ok" | "warn" | "alert";
type PresenceWidgetSnapshot = {
  dateIso: string;
  morning: number;
  afternoon: number;
  students: number;
  absentNames: string[];
  triPair: string[];
};

// ── Helpers ──────────────────────────────────────
const alertColors = {
  yellow: { bg: "#fffbeb", border: "#fef3c7", dot: "#d97706", text: "#92400e", tag: "#fef3c7" },
  red:    { bg: "#fef2f2", border: "#fee2e2", dot: "#dc2626", text: "#991b1b", tag: "#fee2e2" },
  blue:   { bg: "#eff6ff", border: "#dbeafe", dot: "#2563eb", text: "#1e40af", tag: "#dbeafe" },
};

const statusStyles = {
  ok:    { bg: "#ecfdf5", color: "#065f46", dot: "#16a34a" },
  warn:  { bg: "#fffbeb", color: "#92400e", dot: "#d97706" },
  alert: { bg: "#fef2f2", color: "#991b1b", dot: "#dc2626" },
};
const PLANNING_DASHBOARD_CACHE_KEY = "epicerie-dashboard-presence-v1";
const PLANNING_DASHBOARD_SYNC_TTL_MS = 30_000;
let lastPlanningDashboardSyncAt = 0;

const medals = ["🥇", "🥈", "🥉"];
const WEEK_LABELS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM"];

function loadPresenceWidgetSnapshot(): PresenceWidgetSnapshot | null {
  if (!hasBrowserWindow()) return null;
  try {
    const raw = window.localStorage.getItem(PLANNING_DASHBOARD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PresenceWidgetSnapshot | null;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      dateIso: String(parsed.dateIso ?? ""),
      morning: Number(parsed.morning ?? 0),
      afternoon: Number(parsed.afternoon ?? 0),
      students: Number(parsed.students ?? 0),
      absentNames: Array.isArray(parsed.absentNames) ? parsed.absentNames.map((item) => String(item)) : [],
      triPair: Array.isArray(parsed.triPair) ? parsed.triPair.map((item) => String(item)) : [],
    };
  } catch {
    return null;
  }
}

function savePresenceWidgetSnapshot(snapshot: PresenceWidgetSnapshot) {
  if (!hasBrowserWindow()) return;
  try {
    window.localStorage.setItem(PLANNING_DASHBOARD_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Best-effort cache only.
  }
}

// ── Icônes SVG inline (strokeWidth 1.8) ──────────
const svgProps = {
  viewBox: "0 0 24 24",
  width: 14, height: 14,
  fill: "none", stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round"  as const,
  strokeLinejoin: "round" as const,
};

const IconUsers      = () => <svg {...svgProps}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
const IconCalendar   = () => <svg {...svgProps}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconShoppingBag= () => <svg {...svgProps}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
const IconMap        = () => <svg {...svgProps}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
const IconCheck      = () => <svg {...svgProps}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconFile       = () => <svg {...svgProps}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IconInfo       = () => <svg {...svgProps}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconAlert      = () => <svg {...svgProps}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>;
const IconTrend      = () => <svg {...svgProps}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IconGrid       = () => <svg {...svgProps}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;

// ── Composants locaux ─────────────────────────────

function Divider() {
  return (
    <div style={{
      height: "1px",
      margin: "14px 0",
      background: "linear-gradient(90deg, transparent, #dbe3eb, transparent)",
    }} />
  );
}

function StatusBox({ children, tone }: { children: React.ReactNode; tone: "yellow" | "neutral" }) {
  const styles = {
    yellow:  { bg: "#fffbeb", border: "#fef3c7", color: "#92400e" },
    neutral: { bg: "#f8fafc", border: "#dbe3eb",  color: "#1e293b" },
  }[tone];
  return (
    <div style={{
      padding: "10px 14px",
      borderRadius: "10px",
      marginBottom: "8px",
      fontSize: "13px",
      fontWeight: 500,
      border: `1px solid ${styles.border}`,
      background: styles.bg,
      color: styles.color,
      lineHeight: 1.45,
    }}>
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const dash  = moduleThemes.dashboard;
  const plan  = moduleThemes.planning;
  const bal   = moduleThemes.balisage;
  const [now, setNow] = useState(() => new Date());
  const [absences, setAbsences] = useState(() => loadAbsenceRequests());
  const [planningOverrides, setPlanningOverrides] = useState<PlanningOverrides>(() => loadPlanningOverrides());
  const [planningTriData, setPlanningTriData] = useState<PlanningTriData>(() => loadPlanningTriData(getPlanningMonthKey(new Date())));
  const [balisageDataState, setBalisageDataState] = useState<Record<string, BalisageEmployeeStat[]>>(() => loadBalisageData());
  const [rhEmployees, setRhEmployees] = useState(() => loadRhEmployees());
  const [presenceThresholds, setPresenceThresholds] = useState(() => loadPresenceThresholds());
  const [rupturesTodayCount, setRupturesTodayCount] = useState(0);
  const [presenceWidgetSnapshot, setPresenceWidgetSnapshot] = useState<PresenceWidgetSnapshot | null>(() => loadPresenceWidgetSnapshot());
  const [planningSyncReady, setPlanningSyncReady] = useState(() => planningEmployees.length > 0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dashboardRole, setDashboardRole] = useState("");
  const [dashboardAllowedModules, setDashboardAllowedModules] = useState<ModuleAccessKey[]>([]);
  const [dashboardDisplayName, setDashboardDisplayName] = useState("");
  const [accessProfileResolved, setAccessProfileResolved] = useState(false);
  const [dashboardMonthCursor, setDashboardMonthCursor] = useState(() => {
    const current = new Date();
    return new Date(current.getFullYear(), current.getMonth(), 1);
  });
  const [monthlyIssuePanel, setMonthlyIssuePanel] = useState<"alerts" | "critical" | "pending" | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setDashboardRole("");
        setDashboardDisplayName("");
        setAccessProfileResolved(true);
        return;
      }

      const profile = await loadCurrentOfficeProfile(supabase);
      setDashboardRole(String(profile?.role ?? ""));
      setDashboardAllowedModules(profile?.allowed_modules ?? []);
      setDashboardDisplayName(getOfficeProfileFirstName(String(profile?.full_name ?? user.email ?? "")));
      setIsAdmin(isAdminUser(user.email ?? null, String(profile?.role ?? "")));
      setAccessProfileResolved(true);
    };

    void checkAdmin();
  }, []);

  const hasLimitedDashboard = isLimitedOfficeAccessRole({ role: dashboardRole, allowed_modules: dashboardAllowedModules });
  const visibleModules = getVisibleModules({ role: dashboardRole, allowed_modules: dashboardAllowedModules });

  useEffect(() => {
    if (!accessProfileResolved) return;

    if (hasLimitedDashboard) {
      void loadLatestRupturesCountForToday()
        .then((count) => setRupturesTodayCount(count))
        .catch(() => setRupturesTodayCount(0));
      return;
    }

    const refreshAll = (referenceDate = new Date()) => {
      const planningMonthKey = getPlanningMonthKey(referenceDate);
      setNow(referenceDate);
      setAbsences(loadAbsenceRequests());
      setPlanningOverrides(loadPlanningOverrides());
      setPlanningTriData(loadPlanningTriData(planningMonthKey));
      setBalisageDataState(loadBalisageData());
      setRhEmployees(loadRhEmployees());
      setPresenceThresholds(loadPresenceThresholds());
      void loadLatestRupturesCountForToday().then((count) => setRupturesTodayCount(count)).catch(() => setRupturesTodayCount(0));
    };

    const currentDate = new Date();
    refreshAll(currentDate);
    const cachedSnapshot = loadPresenceWidgetSnapshot();
    const hasFreshPresenceSnapshot = cachedSnapshot?.dateIso === formatPlanningDate(currentDate);
    const hasImmediatePlanningData = planningEmployees.length > 0 || hasFreshPresenceSnapshot;
    const shouldSyncPlanning = (Date.now() - lastPlanningDashboardSyncAt) > PLANNING_DASHBOARD_SYNC_TTL_MS;
    setPlanningSyncReady(hasImmediatePlanningData);
    if (shouldSyncPlanning && !hasImmediatePlanningData) {
      setPlanningSyncReady(false);
    }
    void Promise.allSettled([
      shouldSyncPlanning
        ? syncPlanningFromSupabase(getPlanningMonthKey(currentDate)).then((result) => {
            lastPlanningDashboardSyncAt = Date.now();
            return result;
          })
        : Promise.resolve(false),
      syncBalisageFromSupabase(),
      syncAbsencesFromSupabase(),
      syncRhFromSupabase(),
      syncPresenceThresholdsFromSupabase(),
    ]).then(() => {
      refreshAll(new Date());
      setPlanningSyncReady(true);
    });
    const minuteTimer = window.setInterval(() => refreshAll(new Date()), 60000);
    const listeners = [
      getAbsencesUpdatedEventName(),
      getPlanningUpdatedEventName(),
      getBalisageUpdatedEventName(),
      getRhUpdatedEventName(),
      getPresenceThresholdsUpdatedEventName(),
    ];
    const handleRefreshAll = () => refreshAll(new Date());
    listeners.forEach((eventName) => window.addEventListener(eventName, handleRefreshAll));

    return () => {
      window.clearInterval(minuteTimer);
      listeners.forEach((eventName) => window.removeEventListener(eventName, handleRefreshAll));
    };
  }, [accessProfileResolved, hasLimitedDashboard]);

  const today = now;
  const todayIso = today.toISOString().slice(0, 10);
  const startOfToday = useMemo(() => {
    const base = new Date(today);
    base.setHours(0, 0, 0, 0);
    return base;
  }, [today]);

  const todayPresenceCounts = useMemo(
    () => getPlanningPresenceCountsForDate(today, planningOverrides),
    [planningOverrides, today],
  );
  const presenceByType = useMemo(() => {
    return planningEmployees.reduce(
      (acc, employee) => {
        if (!isPlanningEmployeeCountedForPresence(employee)) return acc;

        const status = getPlanningStatus(employee, today, planningOverrides);
        if (status === "PRESENT" && employee.t === "E") {
          acc.students += 1;
        }
        if (employee.actif && !["PRESENT", "X"].includes(status) && employee.t !== "E") {
          acc.absentNames.push(employee.n);
        }
        return acc;
      },
      {
        morning: todayPresenceCounts.morningCount,
        afternoon: todayPresenceCounts.afternoonCount,
        students: 0,
        absentNames: [] as string[],
      },
    );
  }, [planningOverrides, today, todayPresenceCounts]);
  const triPair = useMemo(
    () => getPlanningTriPairForDate(today, planningTriData) ?? [],
    [planningTriData, today],
  );
  const hasLivePlanningData = planningEmployees.length > 0;
  const hasFreshPresenceSnapshot = presenceWidgetSnapshot?.dateIso === formatPlanningDate(today);
  const displayedPresence = !planningSyncReady && hasFreshPresenceSnapshot && presenceWidgetSnapshot
    ? {
        morning: presenceWidgetSnapshot.morning,
        afternoon: presenceWidgetSnapshot.afternoon,
        students: presenceWidgetSnapshot.students,
        absentNames: presenceWidgetSnapshot.absentNames,
      }
    : presenceByType;
  const displayedTriPair = !planningSyncReady && hasFreshPresenceSnapshot && presenceWidgetSnapshot
    ? presenceWidgetSnapshot.triPair
    : triPair;
  const presenceWidgetBusy = !planningSyncReady && !hasFreshPresenceSnapshot;

  useEffect(() => {
    if (!hasLivePlanningData) return;
    const nextSnapshot: PresenceWidgetSnapshot = {
      dateIso: formatPlanningDate(today),
      morning: presenceByType.morning,
      afternoon: presenceByType.afternoon,
      students: presenceByType.students,
      absentNames: [...presenceByType.absentNames],
      triPair: [...triPair],
    };
    savePresenceWidgetSnapshot(nextSnapshot);
    setPresenceWidgetSnapshot((current) => {
      if (
        current &&
        current.dateIso === nextSnapshot.dateIso &&
        current.morning === nextSnapshot.morning &&
        current.afternoon === nextSnapshot.afternoon &&
        current.students === nextSnapshot.students &&
        current.absentNames.join("|") === nextSnapshot.absentNames.join("|") &&
        current.triPair.join("|") === nextSnapshot.triPair.join("|")
      ) {
        return current;
      }
      return nextSnapshot;
    });
  }, [hasLivePlanningData, presenceByType, today, triPair]);

  const weekCards = useMemo(() => {
    const base = new Date(today);
    const mondayOffset = (base.getDay() + 6) % 7;
    base.setDate(base.getDate() - mondayOffset);

    return WEEK_LABELS.map((label, index) => {
      const date = new Date(base);
      date.setDate(base.getDate() + index);
      const dayIso = date.toISOString().slice(0, 10);
      const isFuture = date > today;
      const dateLabel = date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      });
      const dayCounts = getPlanningPresenceCountsForDate(date, planningOverrides);
      const isPastDay = date < startOfToday;
      const level = isFuture
        ? "ok"
        : getPresenceThresholdLevel(
            {
              morning: dayCounts.morningCount,
              afternoon: dayCounts.afternoonCount,
            },
            presenceThresholds,
          );
      const alert = !isFuture && level !== "ok";
      return {
        dayIso,
        label,
        dateLabel,
        morningCount: dayCounts.morningCount,
        afternoonCount: dayCounts.afternoonCount,
        sub:
          date.toDateString() === today.toDateString()
            ? "Aujourd'hui"
            : level === "critical"
              ? "Critique"
              : level === "warning"
                ? "Alerte"
                : "OK",
        alert: !isPastDay && alert,
        level,
        active: dayIso === todayIso,
      };
    });
  }, [planningOverrides, presenceThresholds, startOfToday, today, todayIso]);

  const monthlyPlanningDays = useMemo(() => {
    const year = dashboardMonthCursor.getFullYear();
    const month = dashboardMonthCursor.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: totalDays }, (_, index) => {
      const date = new Date(year, month, index + 1);
      const dayIso = formatPlanningDate(date);
      const isSunday = date.getDay() === 0;
      const counts = getPlanningPresenceCountsForDate(date, planningOverrides);
      const level = isSunday
        ? "ok"
        : getPresenceThresholdLevel(
            {
              morning: counts.morningCount,
              afternoon: counts.afternoonCount,
            },
            presenceThresholds,
          );

      return {
        dayIso,
        date,
        morningCount: counts.morningCount,
        afternoonCount: counts.afternoonCount,
        level,
      };
    });
  }, [dashboardMonthCursor, planningOverrides, presenceThresholds]);

  const isCurrentDashboardMonth =
    dashboardMonthCursor.getFullYear() === today.getFullYear() &&
    dashboardMonthCursor.getMonth() === today.getMonth();
  const dashboardMonthLabel = dashboardMonthCursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const monthlyMonitoredDays = monthlyPlanningDays.filter((day) => day.date.getDay() !== 0);
  const monthlyRelevantDays = monthlyMonitoredDays.filter((day) => !isCurrentDashboardMonth || day.date >= startOfToday);
  const monthlyRiskDays = monthlyRelevantDays.filter((day) => day.level !== "ok");
  const monthlyAlertDays = monthlyRelevantDays.filter((day) => day.level === "warning");
  const monthlyCriticalDays = monthlyRelevantDays.filter((day) => day.level === "critical");
  const mostTenseDay = [...monthlyRelevantDays].sort((a, b) =>
    a.morningCount - b.morningCount ||
    a.afternoonCount - b.afternoonCount ||
    a.dayIso.localeCompare(b.dayIso),
  )[0] ?? null;
  const monthlyCriticalDaySet = new Set(monthlyCriticalDays.map((day) => day.dayIso));
  const pendingRiskRequests = absences
    .filter((request) => request.status === "en_attente")
    .map((request) => {
      const overlappingRiskDays = monthlyRiskDays.filter((day) =>
        request.startDate <= day.dayIso && request.endDate >= day.dayIso,
      );
      if (!overlappingRiskDays.length) return null;
      const highestLevel = overlappingRiskDays.some((day) => monthlyCriticalDaySet.has(day.dayIso))
        ? "critical"
        : "warning";
      return {
        request,
        overlappingRiskDays,
        highestLevel,
      };
    })
    .filter((item): item is {
      request: typeof absences[number];
      overlappingRiskDays: typeof monthlyRiskDays;
      highestLevel: "critical" | "warning";
    } => Boolean(item))
    .sort((a, b) =>
      (a.highestLevel === "critical" ? -1 : 1) - (b.highestLevel === "critical" ? -1 : 1) ||
      b.overlappingRiskDays.length - a.overlappingRiskDays.length ||
      a.request.startDate.localeCompare(b.request.startDate),
    );
  const pendingRiskDayCount = new Set(
    pendingRiskRequests.flatMap((item) => item.overlappingRiskDays.map((day) => day.dayIso)),
  ).size;
  const pendingCriticalRiskCount = pendingRiskRequests.filter((item) => item.highestLevel === "critical").length;
  const monthlyIssueDays = monthlyIssuePanel === "critical" ? monthlyCriticalDays : monthlyAlertDays;
  const shiftDashboardMonth = (offset: number) => {
    setDashboardMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };
  const resetDashboardMonth = () => {
    setDashboardMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const monthId = getCurrentBalisageMonthId(today);
  const monthLabel = balisageMonths.find((month) => month.id === monthId)?.label ?? "Mois courant";
  const balisageStats = balisageDataState[monthId] ?? [];
  const balisageStatsWithActivity = attachRhActivityToBalisageStats(balisageStats, rhEmployees);
  const activeBalisageStats = getActiveBalisageStats(balisageStatsWithActivity);
  const inactiveBalisageStats = getInactiveBalisageStats(balisageStatsWithActivity);
  const balisageTotalControls = activeBalisageStats.reduce((sum, row) => sum + row.total, 0);
  const balisageDashboardTeamCount = Math.max(activeBalisageStats.length, 1);
  const balisageDashboardTarget = balisageDashboardTeamCount * balisageObjective;
  const balisageGlobalPercent = Math.min(
    Math.round((balisageTotalControls / balisageDashboardTarget) * 100),
    100,
  );
  const balisageAlertsCount = activeBalisageStats.filter((employee) => getBalisageDynamicStatus(employee.total, monthId, today) === "Alerte").length;

  const balisageRank = [...activeBalisageStats]
    .sort((a, b) => b.total - a.total)
    .slice(0, 4)
    .map((employee) => {
      const dynamicStatus = getBalisageDynamicStatus(employee.total, monthId, today);
      const rankStatus: RankStatus = dynamicStatus === "OK" ? "ok" : dynamicStatus === "En retard" ? "warn" : "alert";
      return {
        name: employee.name,
        total: employee.total,
        pct: Math.min(Math.round((employee.total / balisageObjective) * 100), 100),
        status: rankStatus,
      };
    });

  const pendingAbsences = absences.filter((request) => request.status === "en_attente").length;
  const plateauFocus = getPlateauWeekFocusData();
  const plateauOperations = plateauFocus.operations.map((operation) => {
    const colorMap: Record<string, { color: string; badge: string; bg: string }> = {
      A: { color: "#b91c2e", badge: "A", bg: "#fcebeb" },
      B: { color: "#167a48", badge: "B", bg: "#eaf3de" },
      C: { color: "#1d5fa0", badge: "C/D", bg: "#e6f1fb" },
    };
    const meta = colorMap[operation.pl] ?? { color: "#c05a0c", badge: operation.pl, bg: "#fef6ee" };
    const isNew = operation.sFrom === plateauFocus.focusWeek;
    const isEnd = operation.sTo === plateauFocus.focusWeek;
    return {
      id: operation.id,
      name: operation.nom,
      detail: operation.zone || (operation.pl === "A" ? "Entrée magasin + allée centrale" : operation.pl === "B" ? "Côté écolier + côté LSE" : "Zones thématiques"),
      color: meta.color,
      badge: meta.badge,
      bg: meta.bg,
      marker: isNew ? "Début" : isEnd ? "Fin" : null,
    };
  });

  const weeklyAlertDays = weekCards.filter((item) => item.alert);

  const alerts = [
    ...(weekCards.some((item) => item.alert)
      ? [{
          id: "plan-low",
          text: "Présence sous seuil sur la semaine en cours",
          detail: weeklyAlertDays
            .map((item) => `${item.label.toLowerCase()} ${item.dateLabel}`)
            .join(" · "),
          module: "Planning",
          tone: "yellow" as AlertTone,
          href: `/planning?view=semaine&date=${weeklyAlertDays[0]?.dayIso ?? todayIso}`,
        }]
      : []),
    ...(pendingAbsences > 0
      ? [{
          id: "abs-pending",
          text: `${pendingAbsences} demande(s) d'absence en attente`,
          detail: "Ouvrir la liste manager des demandes",
          module: "Absences",
          tone: "yellow" as AlertTone,
          href: "/absences",
        }]
      : []),
    ...(balisageAlertsCount > 0
      ? [{
          id: "bal-alert",
          text: `${balisageAlertsCount} profil(s) balisage en alerte`,
          detail: "Consulter le suivi balisage",
          module: "Balisage",
          tone: "red" as AlertTone,
          href: "/stats",
        }]
      : []),
    ...(plateauOperations.length > 0
      ? [{
          id: "plat-active",
          text: "Opérations plateau actives sur la semaine en cours",
          detail: `${plateauOperations.length} opération(s) active(s)`,
          module: "Plateau",
          tone: "blue" as AlertTone,
          href: "/plan-plateau",
        }]
      : []),
  ];

  if (!accessProfileResolved) {
    return (
      <div style={{ padding: "22px 0" }}>
        <Card>
          <Kicker moduleKey="dashboard" label="Accueil" icon={<IconGrid />} />
          <h1 style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.04em", color: "#0f172a" }}>
            Chargement de l&apos;espace
          </h1>
          <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
            Vérification du profil et des accès en cours.
          </p>
        </Card>
      </div>
    );
  }

  if (hasLimitedDashboard) {
    const welcomeName = dashboardDisplayName || "Christelle";
    const moduleIcons: Record<string, React.ReactNode> = {
      planning: <IconCalendar />,
      ruptures: <IconAlert />,
      absences: <IconFile />,
      infos: <IconInfo />,
      rh: <IconUsers />,
      balisage: <IconCheck />,
      plateau: <IconMap />,
      plan_tg: <IconShoppingBag />,
      exports: <IconFile />,
    };

    return (
      <div style={{ padding: "22px 0", display: "grid", gap: "14px" }}>
        <Card
          style={{
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(135deg, #fff6f6 0%, #ffffff 55%, #fff1f2 100%)",
            border: "1px solid #ffd5d8",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "-80px",
              right: "-40px",
              width: "220px",
              height: "220px",
              borderRadius: "999px",
              background: "radial-gradient(circle, rgba(212,5,17,0.12) 0%, rgba(212,5,17,0) 72%)",
            }}
          />
          <Kicker moduleKey="dashboard" label="Accueil" icon={<IconUsers />} />
          <h1 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.04em", color: "#0f172a", marginTop: "6px" }}>
            Bienvenue {welcomeName}
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "8px", maxWidth: "560px", lineHeight: 1.6 }}>
            Votre espace est pour l&apos;instant centré sur le suivi des ruptures. La page d&apos;accueil reste disponible, avec un accès direct vers le module utile à votre activité.
          </p>
        </Card>

        <Card>
          <Kicker moduleKey="dashboard" label="Navigation" icon={<IconGrid />} />
          <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Accès modules</h2>
          <p style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", marginBottom: "10px" }}>Accès bureau limité aux modules autorisés</p>

          <NavCardGrid style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {visibleModules.map((moduleItem) => (
              <NavCard
                key={moduleItem.key}
                moduleKey={moduleItem.moduleId}
                title={moduleItem.label}
                description={
                  moduleItem.key === "ruptures" && rupturesTodayCount
                    ? `${rupturesTodayCount} rupture(s) équipe aujourd'hui`
                    : moduleItem.description
                }
                icon={moduleIcons[moduleItem.key]}
                href={moduleItem.href}
              />
            ))}
          </NavCardGrid>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* ── HERO ─────────────────────────────────── */}
      <div style={{
        margin: "20px 0 16px",
        background: dash.gradient,
        border: `1px solid ${dash.medium}`,
        borderRadius: "18px",
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.05)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Reflet */}
        <div aria-hidden style={{
          position: "absolute", inset: "0 0 auto 0", height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)",
          pointerEvents: "none",
        }} />
        <div>
          <span style={{
            display: "inline-block",
            fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em",
            textTransform: "uppercase", color: dash.color,
            background: dash.medium, padding: "2px 8px", borderRadius: "10px",
            marginBottom: "6px",
          }}>
            Épicerie Manager 2026
          </span>
          <h1 style={{
            fontSize: "22px", fontWeight: 700, letterSpacing: "-0.04em",
            color: "#0f172a", lineHeight: 1.15,
          }}>
            Dashboard manager
          </h1>
          <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
            Lecture rapide et claire pour le pilotage quotidien.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {[ 
            { label: presenceWidgetBusy ? "Synchro planning..." : `${displayedPresence.morning} présents matin`, color: "#065f46", bg: "#ecfdf5", border: "#bbf7d0" },
            { label: `${alerts.length} alertes`, color: dash.color, bg: dash.light, border: dash.medium },
          ].map((p) => (
            <span key={p.label} style={{
              fontSize: "12px", fontWeight: 600,
              padding: "6px 13px", borderRadius: "999px",
              background: p.bg, border: `1px solid ${p.border}`,
              color: p.color,
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}>
              {p.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── GRID 3 COL ───────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "0.9fr 1.2fr 0.9fr",
        gap: "14px",
      }}>

        {/* ─── COLONNE GAUCHE ──────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Présences */}
          <Card>
            <Kicker moduleKey="dashboard" label="Équipe" icon={<IconUsers />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Présences du jour</h2>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", marginBottom: "14px" }}>Vision immédiate des effectifs et des points à vérifier.</p>

            <KPIRow>
              <KPI value={presenceWidgetBusy ? "..." : displayedPresence.morning} label="Matin"      moduleKey="planning" icon={<IconUsers />} />
              <KPI value={presenceWidgetBusy ? "..." : displayedPresence.afternoon}  label="Après-midi" moduleKey="planning" icon={<IconUsers />} />
              <KPI value={presenceWidgetBusy ? "..." : displayedPresence.students}  label="Étudiants"  moduleKey="balisage" icon={<IconUsers />} size="md" />
            </KPIRow>

            <StatusBox tone="yellow">
              <strong>Absents : </strong>{presenceWidgetBusy ? "Synchronisation en cours" : displayedPresence.absentNames.length ? displayedPresence.absentNames.join(", ") : "Aucun"}
            </StatusBox>
            <StatusBox tone="neutral">
              <strong>Tri caddie : </strong>{presenceWidgetBusy ? "Synchronisation en cours" : displayedTriPair.length ? displayedTriPair.join(", ") : "Non défini"}
            </StatusBox>
          </Card>

          {/* Accès modules */}
          <Card>
            <Kicker moduleKey="dashboard" label="Navigation" icon={<IconGrid />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Accès modules</h2>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", marginBottom: "10px" }}>Raccourcis directs</p>

            <NavCardGrid>
              <NavCard moduleKey="planning" title="Planning"  description="Horaires et présences" icon={<IconCalendar />}    href="/planning" />
              <NavCard moduleKey="exports"  title="Exports"   description="Impressions & supports" icon={<IconFile />}        href="/exports" />
              <NavCard moduleKey="plantg"   title="Plan TG"   description="Mécaniques rayon"       icon={<IconShoppingBag />} href="/plan-tg"  />
              <NavCard moduleKey="plateau"  title="Plateaux"  description="Implantations terrain"  icon={<IconMap />}         href="/plan-plateau" />
              <NavCard moduleKey="balisage" title="Balisage"  description="Contrôle étiquetage"    icon={<IconCheck />}       href="/stats" />
              <NavCard moduleKey="ruptures" title="Ruptures" description={rupturesTodayCount ? `${rupturesTodayCount} rupture(s) équipe aujourd'hui` : "Suivi des ruptures du jour"} icon={<IconAlert />} href="/ruptures" />
              <NavCard moduleKey="absences" title="Absences"  description="Demandes et validation"  icon={<IconFile />}        href="/absences" />
              <NavCard moduleKey="rh"       title="RH"        description="Fiches employés"         icon={<IconUsers />}       href="/rh" />
              <NavCard moduleKey="suivi"    title="Suivi"     description="Suivi collaborateur"     icon={<IconTrend />}       href="/suivi" />
              <NavCard moduleKey="infos"    title="Infos"     description="Base documentaire"       icon={<IconInfo />}        href="/infos"    />
              <NavCard moduleKey="aide"     title="Aide"      description="Tutoriels & démos"       icon={<IconGrid />}        href="/aide" />
              {isAdmin ? <NavCard moduleKey="admin" title="Admin" description="Messages et maintenance" icon={<IconAlert />} href="/admin" /> : null}
            </NavCardGrid>
          </Card>

          {/* Opérations */}
          <Card>
            <Kicker moduleKey="plateau" label="Plateaux" icon={<IconMap />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Plateau</h2>
            <div style={{ marginTop: "6px", marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#c05a0c", letterSpacing: "0.04em" }}>
                FOCUS SEMAINE {plateauFocus.focusWeek}
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                Mardi {plateauFocus.weekLabel}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
                {plateauOperations.length} opération{plateauOperations.length > 1 ? "s" : ""} active{plateauOperations.length > 1 ? "s" : ""} cette semaine
              </div>
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
              {plateauFocus.byPlateau.A.length > 0 ? <span style={{ padding: "4px 10px", borderRadius: "8px", background: "#fcebeb", color: "#a32d2d", fontSize: "11px", fontWeight: 700 }}>{plateauFocus.byPlateau.A.length} Plateau A</span> : null}
              {plateauFocus.byPlateau.B.length > 0 ? <span style={{ padding: "4px 10px", borderRadius: "8px", background: "#eaf3de", color: "#27500a", fontSize: "11px", fontWeight: 700 }}>{plateauFocus.byPlateau.B.length} Plateau B</span> : null}
              {plateauFocus.byPlateau.C.length > 0 ? <span style={{ padding: "4px 10px", borderRadius: "8px", background: "#e6f1fb", color: "#0c447c", fontSize: "11px", fontWeight: 700 }}>{plateauFocus.byPlateau.C.length} Plateau C/D</span> : null}
            </div>

            {plateauOperations.map((op) => (
              <div key={op.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 0", borderBottom: "1px solid #dbe3eb",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "3px", height: "36px", borderRadius: "2px", flexShrink: 0,
                    background: `linear-gradient(180deg, ${op.color}, ${op.color}99)`,
                  }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>{op.name}</div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{op.detail}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                  {op.marker ? (
                    <span style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      color: "#fff",
                      background: op.marker === "Début" ? "#16a34a" : "#d97706",
                      padding: "2px 7px",
                      borderRadius: "5px",
                    }}>
                      {op.marker}
                    </span>
                  ) : null}
                  <span style={{
                    fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em",
                    textTransform: "uppercase", padding: "3px 8px", borderRadius: "6px",
                    background: op.bg, color: op.color,
                  }}>
                    {op.badge}
                  </span>
                </div>
              </div>
            ))}
            {plateauOperations.length === 0 ? (
              <div style={{ fontSize: "12px", color: "#64748b", padding: "8px 0" }}>
                Aucune opération cette semaine.
              </div>
            ) : null}
            {/* Enlever la bordure du dernier élément */}
            <style>{`div[data-ops-last] { border-bottom: none !important; }`}</style>
          </Card>

        </div>

        {/* ─── COLONNE CENTRE ──────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Alertes */}
          <Card>
            <Kicker moduleKey="dashboard" label="Priorités" icon={<IconAlert />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Alertes à lire en premier</h2>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", marginBottom: "14px" }}>Points qui nécessitent votre attention</p>

            {alerts.map((a) => {
              const c = alertColors[a.tone];
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => router.push(a.href)}
                  style={{
                  display: "flex", alignItems: "flex-start", gap: "10px",
                  padding: "12px 14px", borderRadius: "10px", marginBottom: "8px",
                  background: c.bg, border: `1px solid ${c.border}`,
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                }}>
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: c.dot, flexShrink: 0, marginTop: "5px",
                    boxShadow: `0 0 0 3px ${c.dot}33`,
                  }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: c.text, lineHeight: 1.4 }}>{a.text}</div>
                    {"detail" in a && a.detail ? (
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", lineHeight: 1.35 }}>
                        {a.detail}
                      </div>
                    ) : null}
                    <span style={{
                      display: "inline-block", marginTop: "4px",
                      fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em",
                      textTransform: "uppercase", padding: "2px 7px", borderRadius: "6px",
                      background: c.tag, color: c.text,
                    }}>
                      {a.module}
                    </span>
                  </div>
                </button>
              );
            })}
          </Card>

          {/* Semaine */}
          <Card>
            <Kicker moduleKey="planning" label="Semaine" icon={<IconCalendar />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Effectifs par jour</h2>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", marginBottom: "12px" }}>Cliquer sur un jour pour éditer</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px" }}>
              {weekCards.map((d) => (
                <button key={d.dayIso} type="button" onClick={() => router.push(`/planning?view=jour&date=${d.dayIso}`)} style={{
                  borderRadius: "12px", padding: "10px 6px", textAlign: "center",
                  border: d.active
                    ? `1px solid ${plan.color}`
                    : "1px solid #dbe3eb",
                  background: d.active
                    ? `linear-gradient(135deg, ${plan.medium}, ${plan.light})`
                    : "white",
                  boxShadow: d.active ? `0 2px 8px ${plan.color}26` : "none",
                  cursor: "pointer",
                  width: "100%",
                }}>
                  <div style={{
                    fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: d.active ? plan.color : "#94a3b8",
                  }}>
                    {d.label} {d.dateLabel}
                  </div>
                  <div style={{
                    display: "grid", gap: "5px",
                    marginTop: "10px", textAlign: "left",
                  }}>
                    {[
                      { label: "Matin", value: d.morningCount, color: d.active ? plan.color : "#0f172a" },
                      { label: "Après-midi", value: d.afternoonCount, color: d.active ? "#2563eb" : "#1e40af" },
                    ].map((slot) => (
                      <div key={slot.label} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: "8px",
                      }}>
                        <span style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          color: "#64748b",
                        }}>
                          {slot.label}
                        </span>
                        <strong style={{
                          fontSize: "18px",
                          fontWeight: 700,
                          letterSpacing: "-0.04em",
                          color: slot.color,
                          lineHeight: 1,
                        }}>
                          {slot.value}
                        </strong>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    fontSize: "9px", marginTop: "3px",
                    color: (d as { alert?: boolean }).alert ? "#dc2626" : "#64748b",
                    fontWeight: (d as { alert?: boolean }).alert ? 700 : 400,
                  }}>
                    {d.sub}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* KPI mensuel */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "flex-start" }}>
              <div>
                <Kicker moduleKey="planning" label="Indicateurs" icon={<IconTrend />} />
                <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Vue mensuelle</h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid #dbe3eb", borderRadius: "10px", padding: "4px", background: "#fff" }}>
                  <button
                    type="button"
                    onClick={() => shiftDashboardMonth(-1)}
                    aria-label="Mois précédent"
                    style={{
                      minWidth: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      color: "#475569",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {"<"}
                  </button>
                  <div style={{ minWidth: "138px", textAlign: "center", fontSize: "13px", fontWeight: 700, color: "#334155", padding: "0 2px" }}>
                    {dashboardMonthLabel}
                  </div>
                  <button
                    type="button"
                    onClick={() => shiftDashboardMonth(1)}
                    aria-label="Mois suivant"
                    style={{
                      minWidth: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      color: "#475569",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {">"}
                  </button>
                </div>
                {!isCurrentDashboardMonth ? (
                  <button
                    type="button"
                    onClick={resetDashboardMonth}
                    style={{
                      minHeight: "30px",
                      borderRadius: "999px",
                      border: "1px solid #dbe3eb",
                      background: "#fff",
                      color: "#475569",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "0 10px",
                    }}
                  >
                    Mois courant
                  </button>
                ) : null}
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", marginBottom: "12px" }}>
              {dashboardMonthLabel} · {formatPresenceThresholdSummary(presenceThresholds)}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
              {[
                {
                  key: "alerts",
                  value: monthlyAlertDays.length,
                  label: "Jours alerte",
                  detail: monthlyAlertDays.length ? "Hors jours critiques" : "Aucun jour alerte",
                  tone: monthlyAlertDays.length ? "#c2410c" : "#0f766e",
                  bg: monthlyAlertDays.length ? "linear-gradient(135deg,#fff7ed,#ffedd5)" : "linear-gradient(135deg,#f0fdfa,#ecfeff)",
                  border: monthlyAlertDays.length ? "#fdba74" : "#99f6e4",
                  onClick: () => setMonthlyIssuePanel("alerts" as const),
                  disabled: monthlyAlertDays.length === 0,
                },
                {
                  key: "critical",
                  value: monthlyCriticalDays.length,
                  label: "Jours critiques",
                  detail: monthlyCriticalDays.length ? "Cliquer pour voir les dates" : "Aucune date critique",
                  tone: monthlyCriticalDays.length ? "#b91c1c" : "#0f766e",
                  bg: monthlyCriticalDays.length ? "linear-gradient(135deg,#fef2f2,#fee2e2)" : "linear-gradient(135deg,#f0fdfa,#ecfeff)",
                  border: monthlyCriticalDays.length ? "#fca5a5" : "#99f6e4",
                  onClick: () => setMonthlyIssuePanel("critical" as const),
                  disabled: monthlyCriticalDays.length === 0,
                },
                {
                  key: "pending-risk",
                  value: pendingRiskRequests.length,
                  label: "Demandes à risque",
                  detail: pendingRiskRequests.length
                    ? `${pendingRiskDayCount} jour(s) fragile(s) touché(s)${pendingCriticalRiskCount ? ` · ${pendingCriticalRiskCount} critique(s)` : ""}`
                    : "Aucune demande en attente sur période fragile",
                  tone: pendingRiskRequests.length
                    ? pendingCriticalRiskCount
                      ? "#b91c1c"
                      : "#c2410c"
                    : "#0f766e",
                  bg: pendingRiskRequests.length
                    ? pendingCriticalRiskCount
                      ? "linear-gradient(135deg,#fff1f2,#ffe4e6)"
                      : "linear-gradient(135deg,#fff7ed,#ffedd5)"
                    : "linear-gradient(135deg,#f0fdfa,#ecfeff)",
                  border: pendingRiskRequests.length
                    ? pendingCriticalRiskCount
                      ? "#fda4af"
                      : "#fdba74"
                    : "#99f6e4",
                  onClick: () => setMonthlyIssuePanel("pending" as const),
                  disabled: pendingRiskRequests.length === 0,
                },
              ].map((metric) => (
                <button
                  key={metric.key}
                  type="button"
                  onClick={metric.onClick}
                  disabled={metric.disabled}
                  style={{
                    borderRadius: "14px",
                    padding: "12px 14px",
                    textAlign: "left",
                    background: metric.bg,
                    border: `1px solid ${metric.border}`,
                    cursor: metric.disabled ? "default" : "pointer",
                    opacity: metric.disabled ? 0.78 : 1,
                  }}
                >
                  <div style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.04em", color: metric.tone, lineHeight: 1 }}>
                    {metric.value}
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: metric.tone, marginTop: "6px" }}>
                    {metric.label}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", lineHeight: 1.35 }}>
                    {metric.detail}
                  </div>
                </button>
              ))}
              <div style={{
                borderRadius: "14px",
                padding: "12px 14px",
                background: "linear-gradient(135deg,#eff6ff,#f8fbff)",
                border: "1px solid #bfdbfe",
              }}>
                <div style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.04em", color: "#1d4ed8", lineHeight: 1 }}>
                  {mostTenseDay ? mostTenseDay.morningCount : "-"}
                </div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#1d4ed8", marginTop: "6px" }}>
                  Plus faible matin
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", lineHeight: 1.35 }}>
                  {mostTenseDay
                    ? `${mostTenseDay.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · ${mostTenseDay.morningCount} matin / ${mostTenseDay.afternoonCount} après-midi`
                    : "Aucune donnée mensuelle"}
                </div>
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "10px" }}>
              Les dimanches sont exclus du calcul des alertes mensuelles.
            </div>
          </Card>

        </div>

        {/* ─── COLONNE DROITE ──────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          <ManagerNotesCard />

          {/* Balisage */}
          <Card>
            <Kicker moduleKey="balisage" label="Suivi" icon={<IconCheck />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Contrôle balisage</h2>

            {/* Gros chiffre */}
            <div style={{ textAlign: "center", padding: "14px 0 6px" }}>
              <div style={{
                fontSize: "44px", fontWeight: 700, letterSpacing: "-0.05em",
                color: bal.color, lineHeight: 1,
              }}>
                {balisageTotalControls} <span style={{ fontSize: "22px", color: "#64748b", fontWeight: 400 }}>/&nbsp;{balisageDashboardTarget}</span>
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
                {balisageGlobalPercent}% atteint · {monthLabel} · objectif équipe {balisageDashboardTeamCount} × {balisageObjective}
              </div>
            </div>

            <ProgressBar
              value={balisageGlobalPercent}
              moduleKey="balisage"
              label="Avancement global"
              subLeft={
                inactiveBalisageStats.length
                  ? `${activeBalisageStats.length} actifs · ${inactiveBalisageStats.length} inactif(s)`
                  : `${activeBalisageStats.length} actifs suivis`
              }
              subRight={`${balisageAlertsCount} alertes actives`}
            />

            <Divider />

            {/* Classement */}
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#64748b", marginBottom: "8px" }}>
              Classement
            </div>
            {balisageRank.map((emp, i) => {
              const s = statusStyles[emp.status];
              return (
                <div key={emp.name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0" }}>
                  <div style={{ width: "20px", fontSize: "13px", textAlign: "center", flexShrink: 0 }}>
                    {medals[i] ?? i + 1}
                  </div>
                  <div style={{ flex: 1, fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>
                    {emp.name}
                  </div>
                  <div style={{ width: "60px", height: "5px", background: bal.medium, borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${emp.pct}%`, background: `linear-gradient(90deg, ${bal.color}, #0ea5c4)`, borderRadius: "999px" }} />
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: bal.color, width: "28px", textAlign: "right", flexShrink: 0 }}>
                    {emp.total}
                  </div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "7px",
                    background: s.bg, color: s.color,
                  }}>
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                    {{ ok: "OK", warn: "Retard", alert: "Alerte" }[emp.status]}
                  </span>
                </div>
              );
            })}
            {balisageRank.length === 0 ? (
              <div style={{ fontSize: "12px", color: "#64748b", paddingTop: "6px" }}>
                Aucune donnée balisage disponible.
              </div>
            ) : null}
          </Card>

        </div>
      </div>

      {monthlyIssuePanel ? (
        <div
          role="presentation"
          onClick={() => setMonthlyIssuePanel(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.35)",
            backdropFilter: "blur(3px)",
            display: "grid",
            placeItems: "center",
            zIndex: 140,
            padding: "20px",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(640px, 96vw)",
              maxHeight: "80vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "16px",
              border: "1px solid #dbe3eb",
              padding: "16px",
              boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
            }}
          >
            <Kicker
              moduleKey="planning"
              label={
                monthlyIssuePanel === "critical"
                  ? "Dates critiques"
                  : monthlyIssuePanel === "pending"
                    ? "Demandes à risque"
                    : "Dates en alerte"
              }
              icon={<IconAlert />}
            />
            <h2 style={{ marginTop: "6px", fontSize: "20px", color: "#0f172a" }}>
              {monthlyIssuePanel === "critical"
                ? "Jours critiques du mois"
                : monthlyIssuePanel === "pending"
                  ? "Demandes en attente sur périodes fragiles"
                  : "Jours alerte du mois"}
            </h2>
            <p style={{ marginTop: "4px", fontSize: "12px", color: "#64748b", lineHeight: 1.45 }}>
              {dashboardMonthLabel} · {formatPresenceThresholdSummary(presenceThresholds)}
            </p>

            <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
              {monthlyIssuePanel === "pending"
                ? pendingRiskRequests.length ? pendingRiskRequests.map((item) => {
                  const typeLabel = absenceTypes.find((type) => type.id === item.request.type)?.label ?? item.request.type;
                  const isCritical = item.highestLevel === "critical";
                  return (
                    <div
                      key={`${item.request.id}-${item.request.employee}-${item.request.startDate}`}
                      style={{
                        borderRadius: "12px",
                        border: `1px solid ${isCritical ? "#fca5a5" : "#fdba74"}`,
                        background: isCritical ? "#fef2f2" : "#fff7ed",
                        padding: "12px 14px",
                        display: "grid",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                            {item.request.employee} · {typeLabel}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                            {new Date(`${item.request.startDate}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            {" "}au{" "}
                            {new Date(`${item.request.endDate}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                          </div>
                        </div>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          borderRadius: "999px",
                          padding: "5px 10px",
                          background: isCritical ? "#fee2e2" : "#ffedd5",
                          color: isCritical ? "#b91c1c" : "#c2410c",
                        }}>
                          <span style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "999px",
                            background: isCritical ? "#dc2626" : "#f59e0b",
                          }} />
                          {isCritical ? "Risque critique" : "Risque alerte"}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#475569", lineHeight: 1.45 }}>
                        {item.overlappingRiskDays.length} jour(s) fragile(s) touché(s) :
                        {" "}
                        {item.overlappingRiskDays
                          .map((day) => `${day.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} (${day.morningCount} matin / ${day.afternoonCount} après-midi)`)
                          .join(", ")}
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{
                    borderRadius: "12px",
                    border: "1px solid #dbe3eb",
                    background: "#f8fafc",
                    padding: "14px",
                    fontSize: "12px",
                    color: "#64748b",
                  }}>
                    Aucune demande en attente ne tombe sur une période fragile ce mois-ci.
                  </div>
                )
                : monthlyIssueDays.length ? monthlyIssueDays.map((day) => {
                const isCritical = day.level === "critical";
                return (
                  <div
                    key={day.dayIso}
                    style={{
                      borderRadius: "12px",
                      border: `1px solid ${isCritical ? "#fca5a5" : "#fdba74"}`,
                      background: isCritical ? "#fef2f2" : "#fff7ed",
                      padding: "12px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                        {day.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                        {day.morningCount} matin · {day.afternoonCount} après-midi
                      </div>
                    </div>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      borderRadius: "999px",
                      padding: "5px 10px",
                      background: isCritical ? "#fee2e2" : "#ffedd5",
                      color: isCritical ? "#b91c1c" : "#c2410c",
                    }}>
                      <span style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "999px",
                        background: isCritical ? "#dc2626" : "#f59e0b",
                      }} />
                      {isCritical ? "Critique" : "Alerte"}
                    </span>
                  </div>
                );
              }) : (
                <div style={{
                  borderRadius: "12px",
                  border: "1px solid #dbe3eb",
                  background: "#f8fafc",
                  padding: "14px",
                  fontSize: "12px",
                  color: "#64748b",
                }}>
                  Aucune date à signaler pour ce niveau sur le mois courant.
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
              <button
                type="button"
                onClick={() => setMonthlyIssuePanel(null)}
                style={{
                  border: "1px solid #dbe3eb",
                  borderRadius: "999px",
                  background: "#fff",
                  color: "#1e293b",
                  fontSize: "12px",
                  padding: "7px 12px",
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

