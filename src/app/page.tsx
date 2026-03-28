"use client";

import { useEffect, useMemo, useState } from "react";
import { Card }        from "@/components/ui/card";
import { Kicker }      from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { ProgressBar } from "@/components/ui/progress-bar";
import { NavCard, NavCardGrid } from "@/components/ui/nav-card";
import AgendaCard from "@/components/dashboard/agenda-card";
import { moduleThemes } from "@/lib/theme";
import { absenceRequests } from "@/lib/absences-data";
import { loadAbsenceRequests, getAbsencesUpdatedEventName, syncAbsencesFromSupabase } from "@/lib/absences-store";
import { balisageData, balisageMonths, balisageObjective, type BalisageEmployeeStat } from "@/lib/balisage-data";
import { loadBalisageData, getBalisageUpdatedEventName, syncBalisageFromSupabase } from "@/lib/balisage-store";
import {
  planningEmployees,
  defaultPlanningTriData,
  loadPlanningOverrides,
  loadPlanningTriData,
  getPlanningStatus,
  getPlanningTriPairForDate,
  getPlanningUpdatedEventName,
  syncPlanningFromSupabase,
  type PlanningOverrides,
  type PlanningTriData,
} from "@/lib/planning-store";
import { getRhUpdatedEventName, syncRhFromSupabase } from "@/lib/rh-store";
import { plateauOperationsByMonth } from "@/lib/plateau-data";

type AlertTone = "yellow" | "red" | "blue";
type RankStatus = "ok" | "warn" | "alert";

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

const medals = ["🥇", "🥈", "🥉"];
const WEEK_LABELS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM"];
const MONTH_TO_BALISAGE: Record<number, string> = {
  0: "JANV_2026",
  1: "FEVR_2026",
  2: "MARS_2026",
  3: "AVRIL_2026",
  4: "MAI_2026",
  5: "JUIN_2026",
  6: "JUIL_2026",
  7: "AOUT_2026",
  8: "SEPT_2026",
  9: "OCT_2026",
  10: "NOV_2026",
  11: "DEC_2026",
};

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

function getBalisageDynamicStatus(total: number, monthId: string, today = new Date()) {
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
const IconPen        = () => <svg {...svgProps}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
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
  const dash  = moduleThemes.dashboard;
  const plan  = moduleThemes.planning;
  const bal   = moduleThemes.balisage;
  const [now, setNow] = useState(() => new Date("2026-03-22T12:00:00+01:00"));
  const [absences, setAbsences] = useState(absenceRequests);
  const [planningOverrides, setPlanningOverrides] = useState<PlanningOverrides>({});
  const [planningTriData, setPlanningTriData] = useState<PlanningTriData>(defaultPlanningTriData);
  const [balisageDataState, setBalisageDataState] = useState<Record<string, BalisageEmployeeStat[]>>(balisageData);

  useEffect(() => {
    const refreshAll = () => {
      setNow(new Date());
      setAbsences(loadAbsenceRequests());
      setPlanningOverrides(loadPlanningOverrides());
      setPlanningTriData(loadPlanningTriData());
      setBalisageDataState(loadBalisageData());
    };

    refreshAll();
    void Promise.all([
      syncPlanningFromSupabase(),
      syncBalisageFromSupabase(),
      syncAbsencesFromSupabase(),
      syncRhFromSupabase(),
    ]).then(() => {
      refreshAll();
    });
    const minuteTimer = window.setInterval(() => setNow(new Date()), 60000);
    const listeners = [
      getAbsencesUpdatedEventName(),
      getPlanningUpdatedEventName(),
      getBalisageUpdatedEventName(),
      getRhUpdatedEventName(),
    ];
    listeners.forEach((eventName) => window.addEventListener(eventName, refreshAll));

    return () => {
      window.clearInterval(minuteTimer);
      listeners.forEach((eventName) => window.removeEventListener(eventName, refreshAll));
    };
  }, []);

  const today = now;
  const todayIso = today.toISOString().slice(0, 10);

  const presenceByType = useMemo(() => {
    return planningEmployees.reduce(
      (acc, employee) => {
        const status = getPlanningStatus(employee, today, planningOverrides);
        if (status === "PRESENT") {
          if (employee.t === "M") acc.morning += 1;
          if (employee.t === "S") acc.afternoon += 1;
          if (employee.t === "E") acc.students += 1;
        }
        if (employee.actif && !["PRESENT", "X"].includes(status) && employee.t !== "E") {
          acc.absentNames.push(employee.n);
        }
        return acc;
      },
      { morning: 0, afternoon: 0, students: 0, absentNames: [] as string[] },
    );
  }, [planningOverrides, today]);

  const triPair = getPlanningTriPairForDate(today, planningTriData) ?? [];

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
      const morningCount = planningEmployees.filter((employee) => employee.t === "M").reduce((sum, employee) => {
        const status = getPlanningStatus(employee, date, planningOverrides);
        return status === "PRESENT" ? sum + 1 : sum;
      }, 0);
      const alert = !isFuture && morningCount < 9;
      return {
        dayIso,
        label,
        dateLabel,
        value: morningCount,
        sub: date.toDateString() === today.toDateString() ? "Aujourd'hui" : alert ? "⚠ bas" : "OK",
        alert,
        active: dayIso === todayIso,
      };
    });
  }, [planningOverrides, today, todayIso]);
  const avgMorning = weekCards.length
    ? (weekCards.reduce((sum, day) => sum + day.value, 0) / weekCards.length).toFixed(1)
    : "0.0";
  const weekAlertCount = weekCards.filter((day) => day.alert).length;
  const activeMorningEmployees = planningEmployees.filter((employee) => employee.t === "M" && employee.actif).length;

  const monthId = MONTH_TO_BALISAGE[today.getMonth()] ?? "MARS_2026";
  const monthLabel = balisageMonths.find((month) => month.id === monthId)?.label ?? "Mois courant";
  const balisageStats = balisageDataState[monthId] ?? [];
  const balisageTotalControls = balisageStats.reduce((sum, row) => sum + row.total, 0);
  const balisageEmployeeCount = Math.max(balisageStats.length, 1);
  const balisageGlobalPercent = Math.min(
    Math.round((balisageTotalControls / (balisageEmployeeCount * balisageObjective)) * 100),
    100,
  );
  const balisageAverage = Math.round(balisageTotalControls / balisageEmployeeCount);
  const balisageAlertsCount = balisageStats.filter((employee) => getBalisageDynamicStatus(employee.total, monthId, today) === "Alerte").length;

  const balisageRank = [...balisageStats]
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

  const pendingAbsences = absences.filter((request) => request.status === "EN_ATTENTE").length;
  const operationsMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const operationsByZone = plateauOperationsByMonth[operationsMonthKey] ?? {};
  const operations = Object.entries(operationsByZone)
    .flatMap(([zone, rows]) => rows.map((row) => ({ zone, ...row })))
    .slice(0, 4)
    .map((row, index) => {
      const colorMap: Record<string, string> = {
        "Plateau A": "#b91c2e",
        "Plateau B": "#167a48",
        "Plateau C/D": "#1d5fa0",
      };
      const color = colorMap[row.zone] ?? "#c05a0c";
      return {
        id: `${row.zone}-${index}`,
        name: row.operation,
        detail: `${row.slot}${row.zone ? ` · ${row.zone}` : ""}`,
        color,
        badge: row.zone.replace("Plateau ", "Plat. "),
      };
    });

  const alerts = [
    ...(weekCards.some((item) => item.alert)
      ? [{ id: "plan-low", text: "Effectif matin bas sur la semaine en cours", module: "Planning", tone: "yellow" as AlertTone }]
      : []),
    ...(pendingAbsences > 0
      ? [{ id: "abs-pending", text: `${pendingAbsences} demande(s) d'absence en attente`, module: "Absences", tone: "yellow" as AlertTone }]
      : []),
    ...(balisageAlertsCount > 0
      ? [{ id: "bal-alert", text: `${balisageAlertsCount} profil(s) balisage en alerte`, module: "Balisage", tone: "red" as AlertTone }]
      : []),
    ...(operations.length > 0
      ? [{ id: "plat-active", text: "Opérations plateau en cours ce mois", module: "Plateau", tone: "blue" as AlertTone }]
      : []),
  ];

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
            { label: `${presenceByType.morning} présents matin`, color: "#065f46", bg: "#ecfdf5", border: "#bbf7d0" },
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
              <KPI value={presenceByType.morning} label="Matin"      moduleKey="planning" icon={<IconUsers />} />
              <KPI value={presenceByType.afternoon}  label="Après-midi" moduleKey="planning" icon={<IconUsers />} />
              <KPI value={presenceByType.students}  label="Étudiants"  moduleKey="balisage" icon={<IconUsers />} size="md" />
            </KPIRow>

            <StatusBox tone="yellow">
              <strong>Absents : </strong>{presenceByType.absentNames.length ? presenceByType.absentNames.join(", ") : "Aucun"}
            </StatusBox>
            <StatusBox tone="neutral">
              <strong>Tri caddie : </strong>{triPair.length ? triPair.join(", ") : "Non défini"}
            </StatusBox>
          </Card>

          {/* Accès modules */}
          <Card>
            <Kicker moduleKey="dashboard" label="Navigation" icon={<IconGrid />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Accès modules</h2>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", marginBottom: "10px" }}>Raccourcis directs</p>

            <NavCardGrid>
              <NavCard moduleKey="planning" title="Planning"  description="Horaires et présences" icon={<IconCalendar />}    href="/planning" />
              <NavCard moduleKey="plantg"   title="Plan TG"   description="Mécaniques rayon"       icon={<IconShoppingBag />} href="/plan-tg"  />
              <NavCard moduleKey="plateau"  title="Plateaux"  description="Implantations terrain"  icon={<IconMap />}         href="/plan-plateau" />
              <NavCard moduleKey="balisage" title="Balisage"  description="Contrôle étiquetage"    icon={<IconCheck />}       href="/stats" />
              <NavCard moduleKey="absences" title="Absences"  description="Demandes et validation"  icon={<IconFile />}        href="/absences" />
              <NavCard moduleKey="infos"    title="Infos"     description="Base documentaire"       icon={<IconInfo />}        href="/infos"    />
            </NavCardGrid>
          </Card>

          {/* Opérations */}
          <Card>
            <Kicker moduleKey="plateau" label="Plateaux" icon={<IconMap />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Chantiers terrain</h2>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", marginBottom: "10px" }}>{monthLabel}</p>

            {operations.map((op) => (
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
                <span style={{
                  fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em",
                  textTransform: "uppercase", padding: "3px 8px", borderRadius: "6px",
                  background: `${op.color}18`, color: op.color,
                }}>
                  {op.badge}
                </span>
              </div>
            ))}
            {operations.length === 0 ? (
              <div style={{ fontSize: "12px", color: "#64748b", padding: "8px 0" }}>
                Aucune opération terrain sur ce mois.
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
                <div key={a.id} style={{
                  display: "flex", alignItems: "flex-start", gap: "10px",
                  padding: "12px 14px", borderRadius: "10px", marginBottom: "8px",
                  background: c.bg, border: `1px solid ${c.border}`,
                  cursor: "pointer",
                }}>
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: c.dot, flexShrink: 0, marginTop: "5px",
                    boxShadow: `0 0 0 3px ${c.dot}33`,
                  }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: c.text, lineHeight: 1.4 }}>{a.text}</div>
                    <span style={{
                      display: "inline-block", marginTop: "4px",
                      fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em",
                      textTransform: "uppercase", padding: "2px 7px", borderRadius: "6px",
                      background: c.tag, color: c.text,
                    }}>
                      {a.module}
                    </span>
                  </div>
                </div>
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
                <div key={d.dayIso} style={{
                  borderRadius: "12px", padding: "10px 6px", textAlign: "center",
                  border: d.active
                    ? `1px solid ${plan.color}`
                    : "1px solid #dbe3eb",
                  background: d.active
                    ? `linear-gradient(135deg, ${plan.medium}, ${plan.light})`
                    : "white",
                  boxShadow: d.active ? `0 2px 8px ${plan.color}26` : "none",
                  cursor: "pointer",
                }}>
                  <div style={{
                    fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: d.active ? plan.color : "#94a3b8",
                  }}>
                    {d.label} {d.dateLabel}
                  </div>
                  <div style={{
                    fontSize: "22px", fontWeight: 700, letterSpacing: "-0.04em",
                    color: d.active ? plan.color : "#0f172a", marginTop: "2px", lineHeight: 1,
                  }}>
                    {d.value}
                  </div>
                  <div style={{
                    fontSize: "9px", marginTop: "3px",
                    color: (d as { alert?: boolean }).alert ? "#dc2626" : "#64748b",
                    fontWeight: (d as { alert?: boolean }).alert ? 700 : 400,
                  }}>
                    {d.sub}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* KPI mensuel */}
          <Card>
            <Kicker moduleKey="planning" label="Indicateurs" icon={<IconTrend />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Vue mensuelle</h2>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", marginBottom: "12px" }}>Données en cours</p>
            <KPIRow style={{ marginBottom: 0 }}>
              <KPI value={avgMorning} label="Moy. matin/j"  moduleKey="planning"  icon={<IconTrend />} size="md" />
              <KPI value={weekAlertCount} label="Jours alerte"  moduleKey="plateau"   icon={<IconAlert />} size="md" />
              <KPI value={activeMorningEmployees} label="Effectif actif" moduleKey="plantg"   icon={<IconUsers />} size="md" />
            </KPIRow>
          </Card>

        </div>

        {/* ─── COLONNE DROITE ──────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Note du jour */}
          <Card>
            <Kicker moduleKey="dashboard" label="Consigne" icon={<IconPen />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Note du jour</h2>
            <div style={{
              marginTop: "10px",
              padding: "12px 14px", borderRadius: "12px",
              background: dash.light, border: `1px solid ${dash.medium}`,
              display: "flex", gap: "8px", alignItems: "flex-start",
            }}>
              <span style={{ color: dash.color, flexShrink: 0, marginTop: "1px" }}>
                <IconAlert />
              </span>
              <div style={{ fontSize: "13px", color: "#7f1320", fontWeight: 500, lineHeight: 1.5 }}>
                Implantation chocolat Pâques — à diffuser à l&apos;ouverture à toute l&apos;équipe.
              </div>
            </div>
          </Card>

          <AgendaCard calendarUrl="https://calendar.google.com" />

          {/* Balisage */}
          <Card>
            <Kicker moduleKey="balisage" label="Suivi" icon={<IconCheck />} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>Balisage</h2>

            {/* Gros chiffre */}
            <div style={{ textAlign: "center", padding: "14px 0 6px" }}>
              <div style={{
                fontSize: "44px", fontWeight: 700, letterSpacing: "-0.05em",
                color: bal.color, lineHeight: 1,
              }}>
                {balisageAverage} <span style={{ fontSize: "22px", color: "#64748b", fontWeight: 400 }}>/&nbsp;{balisageObjective}</span>
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
                {balisageGlobalPercent}% atteint · {monthLabel}
              </div>
            </div>

            <ProgressBar
              value={balisageGlobalPercent}
              moduleKey="balisage"
              label="Avancement global"
              subLeft={`${balisageStats.length} employés suivis`}
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
    </div>
  );
}

