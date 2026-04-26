"use client";

import type { CSSProperties } from "react";
import { Card } from "@/components/ui/card";
import { ALL_MODULES, type ModulePermissions } from "@/lib/modules-config";

export type OfficeProfile = {
  id: string;
  full_name: string;
  role: string;
  module_permissions: ModulePermissions;
  has_office_access: boolean;
};

export type MonitoringStats = {
  nbCollabs: number;
  nbManagers: number;
  nbCustom: number;
  nbEmployees: number;
  importsToday: number;
  totalImports: number;
  nbPlanning: number;
  nbSuivis: number;
  nbBalisage: number;
  nbPlansMasse: number;
  nbUnivers: number;
  nbRayons: number;
  dernierImport: string | null;
};

export type ModuleHealthItem = {
  name: string;
  score: number;
  status: "ok" | "warn" | "err";
  alert?: string;
};

export type RecentSessionItem = {
  id: string;
  full_name: string;
  role: string;
  app_type: "bureau" | "collab" | "terrain";
  module_name: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number;
  duration_label: string;
};

export type HourBar = {
  hour: number;
  sessions: number;
};

export type AppTypeSummary = {
  appType: "bureau" | "collab" | "terrain";
  sessions: number;
  avgDuration: number;
};

export const EMPTY_STATS: MonitoringStats = {
  nbCollabs: 0,
  nbManagers: 0,
  nbCustom: 0,
  nbEmployees: 0,
  importsToday: 0,
  totalImports: 0,
  nbPlanning: 0,
  nbSuivis: 0,
  nbBalisage: 0,
  nbPlansMasse: 0,
  nbUnivers: 0,
  nbRayons: 0,
  dernierImport: null,
};

export function buildModuleHealth(rows: unknown[]): ModuleHealthItem[] {
  const parsed = rows
    .map((row) => {
      const item = row as Record<string, unknown>;
      const name = String(item.module_name ?? item.name ?? "");
      const rawStatus = String(item.status ?? "ok");
      if (!name) return null;
      return {
        name,
        score: Number(item.score ?? item.health_score ?? 0),
        status: rawStatus === "err" || rawStatus === "error" ? "err" : rawStatus === "warn" ? "warn" : "ok",
        alert: item.alert ? String(item.alert) : undefined,
      } satisfies ModuleHealthItem;
    })
    .filter(Boolean) as ModuleHealthItem[];

  if (parsed.length) return parsed;
  return [
    { name: "Planning", score: 92, status: "ok" },
    { name: "Ruptures", score: 61, status: "warn", alert: "employee_id null depuis 20/04" },
    { name: "Balisage", score: 88, status: "ok" },
    { name: "RH / Suivis", score: 79, status: "ok" },
    { name: "Plans rayon", score: 95, status: "ok" },
    { name: "Plan de masse", score: 85, status: "ok" },
    { name: "Infos / Annonces", score: 100, status: "ok" },
  ];
}

function parseDurationMinutes(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = String(value ?? "").trim();
  if (!normalized) return 0;
  const match = normalized.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function buildRecentSessions(rows: unknown[]): RecentSessionItem[] {
  return rows.map((row, index) => {
    const item = row as Record<string, unknown>;
    const durationMinutes = parseDurationMinutes(item.duration_minutes ?? item.duration ?? 0);
    return {
      id: String(item.id ?? index),
      full_name: String(item.full_name ?? "Utilisateur inconnu"),
      role: String(item.role ?? "—"),
      app_type: (item.app_type === "terrain" || item.app_type === "collab" ? item.app_type : "bureau") as RecentSessionItem["app_type"],
      module_name: String(item.module_name ?? "Module"),
      started_at: item.session_start ? String(item.session_start) : item.started_at ? String(item.started_at) : null,
      ended_at: item.session_end ? String(item.session_end) : item.ended_at ? String(item.ended_at) : null,
      duration_minutes: durationMinutes,
      duration_label: typeof item.duration === "string" && String(item.duration).trim()
        ? String(item.duration).trim()
        : durationMinutes > 0
          ? `${durationMinutes} min`
          : "En cours",
    };
  });
}

export function buildImportWeek(rows: Array<{ imported_at: string; periode: string | null }>, todayStart: Date) {
  const monday = new Date(todayStart);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  const importsByDay = new Map<string, Set<string>>();
  rows.forEach((row) => {
    const key = new Date(row.imported_at).toISOString().slice(0, 10);
    const bucket = importsByDay.get(key) ?? new Set<string>();
    bucket.add(String(row.periode ?? "unknown"));
    importsByDay.set(key, bucket);
  });
  return Array.from({ length: 7 }).map((_, index) => {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);
    const key = current.toISOString().slice(0, 10);
    const imports = importsByDay.get(key);
    const status =
      current > todayStart
        ? "future"
        : !imports?.size
          ? "none"
          : imports.size >= 2
            ? "complete"
            : "partial";
    return { dayKey: key, label: current.toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 3), status } as const;
  });
}

export function buildActivityHours(rows: Array<{ app_type: string; duration_minutes: number | null; session_start: string | null }>) {
  const counts = new Map<number, number>();
  rows.forEach((row) => {
    if (!row.session_start) return;
    const hour = new Date(row.session_start).getHours();
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  });
  return Array.from({ length: 10 }).map((_, index) => ({ hour: index + 6, sessions: counts.get(index + 6) ?? 0 }));
}

export function buildAppTypeSummary(rows: Array<{ app_type: "bureau" | "collab" | "terrain"; duration_minutes: number | null }>) {
  return (["bureau", "collab", "terrain"] as const).map((appType) => {
    const subset = rows.filter((row) => row.app_type === appType);
    const durations = subset.map((row) => Number(row.duration_minutes ?? 0)).filter((value) => value > 0);
    return {
      appType,
      sessions: subset.length,
      avgDuration: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0,
    };
  });
}

export function KpiCard({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return <div style={kpiCardStyle}><div style={kpiLabelStyle}>{label}</div><div style={kpiValueStyle}>{value}</div><div style={kpiMetaStyle}>{subtitle}</div></div>;
}

export function SectionTitle({ title }: { title: string }) {
  return <h3 style={{ margin: "0 0 14px", fontSize: 16, color: "#0f172a" }}>{title}</h3>;
}

export function ModuleHealthRow({ item, loading }: { item: ModuleHealthItem; loading: boolean }) {
  const tone = HEALTH_TONES[item.status];
  return <div style={{ display: "grid", gap: 4 }}><div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) 60px auto auto", gap: 10, alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: loading ? "#e5e7eb" : tone.dot }} /><div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{item.name}</div><div style={{ height: 8, borderRadius: 999, background: "#eef2f7", overflow: "hidden" }}><div style={{ width: `${loading ? 55 : item.score}%`, height: "100%", background: tone.fill, borderRadius: 999 }} /></div><div style={{ fontSize: 11, fontWeight: 700, color: tone.text }}>{loading ? "…" : `${item.score}%`}</div><div style={{ ...healthBadgeStyle, background: tone.badgeBg, color: tone.text }}>{tone.label}</div></div>{!loading && item.alert ? <div style={{ fontSize: 11, color: "#a32d2d", paddingLeft: 18 }}>{item.alert}</div> : null}</div>;
}

export function RecentSessionRow({ session }: { session: RecentSessionItem }) {
  const tone = APP_TONES[session.app_type];
  const initials = session.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  return <div style={{ display: "grid", gridTemplateColumns: "26px minmax(0,1fr) auto", gap: 10, alignItems: "center" }}><div style={{ ...avatarStyle, background: tone.bg, color: tone.text }}>{initials || "??"}</div><div style={{ minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.full_name}</div><div style={{ fontSize: 11, color: "#64748b" }}>{session.role} · {session.module_name} · {session.started_at ? formatHour(session.started_at) : "—"} · {session.duration_minutes} min</div></div><div style={{ ...pillStyle, background: tone.bg, color: tone.text }}>{getAppTypeLabel(session.app_type)}</div></div>;
}

export function EmptySessionsState() {
  return <div style={emptyStateStyle}><div style={{ fontSize: 24 }}>🕒</div><div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Aucune session enregistrée</div><div>Les connexions apparaîtront ici automatiquement dès que le logging est activé.</div></div>;
}

export function BackupRow({ item, loading }: { item: { label: string; status: "ok" | "warn" | "err"; meta: string }; loading: boolean }) {
  const tone = HEALTH_TONES[item.status];
  return <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 8, alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: loading ? "#e5e7eb" : tone.dot }} /><div style={{ fontSize: 12, color: "#0f172a" }}>{item.label}</div><div style={{ fontSize: 11, color: "#64748b" }}>{loading ? "…" : item.meta}</div></div>;
}

export function HourBarView({ item, loading }: { item: HourBar; loading: boolean }) {
  const max = 6;
  const isCurrent = new Date().getHours() === item.hour;
  const height = loading ? 18 : Math.max(4, Math.round((item.sessions / max) * 60));
  return <div style={{ display: "grid", justifyItems: "center", gap: 6 }}><div style={{ width: 18, height: 60, display: "flex", alignItems: "end" }}><div style={{ width: "100%", height, borderRadius: 999, background: isCurrent ? "#185FA5" : "#B5D4F4" }} /></div><div style={{ fontSize: 10, color: "#64748b" }}>{item.hour}h</div></div>;
}

export function OfficeAccessCard({ profile }: { profile: OfficeProfile }) {
  const initials = profile.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  const isManager = profile.role === "manager" || profile.role === "admin";
  const summary = isManager ? "Manager complet" : Object.entries(profile.module_permissions).slice(0, 2).map(([moduleKey]) => ALL_MODULES.find((moduleItem) => moduleItem.key === moduleKey)?.label ?? moduleKey).join(" · ") || "Accès personnalisé";
  return <div style={officeCardStyle}><div style={{ ...avatarStyle, background: isManager ? "#E6F1FB" : "#EAF3DE", color: isManager ? "#0C447C" : "#3B6D11" }}>{initials || "??"}</div><div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>{profile.full_name.split(" ")[0] ?? profile.full_name}</div><div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.35 }}>{summary}</div></div>;
}

export function LegendDot({ color, label }: { color: string; label: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: color }} /><span>{label}</span></span>;
}

export function getAppTypeLabel(value: "bureau" | "collab" | "terrain") { return value === "collab" ? "Collab" : value === "terrain" ? "Terrain" : "Bureau"; }
export function formatHour(value: string) { return new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h"); }
export function formatShortDate(value: Date) { return value.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }); }
export function formatNumber(value: number) { return value.toLocaleString("fr-FR"); }
export function getLastSunday(today: Date) { const next = new Date(today); next.setDate(today.getDate() - ((today.getDay() + 6) % 7 + 1)); return next; }

export const HEALTH_TONES = { ok: { dot: "#3B6D11", fill: "#9dcb7e", badgeBg: "#eaf3de", text: "#3B6D11", label: "OK" }, warn: { dot: "#BA7517", fill: "#f0c887", badgeBg: "#faeeda", text: "#854F0B", label: "Alerte" }, err: { dot: "#A32D2D", fill: "#ef9a9a", badgeBg: "#fde8e8", text: "#A32D2D", label: "Erreur" } } as const;
export const DEFAULT_HEALTH_PLACEHOLDERS = buildModuleHealth([]);
export const DEFAULT_BACKUP_PLACEHOLDERS = Array.from({ length: 7 }).map((_, index) => ({ label: `Chargement ${index + 1}`, status: "ok" as const, meta: "…" }));
export const DEFAULT_IMPORT_WEEK = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"].map((label) => ({ dayKey: label, label, status: "none" as const }));
export const DEFAULT_ACTIVITY_HOURS = Array.from({ length: 10 }).map((_, index) => ({ hour: index + 6, sessions: 0 }));
export const DEFAULT_APP_SUMMARY: AppTypeSummary[] = [{ appType: "bureau", sessions: 0, avgDuration: 0 }, { appType: "collab", sessions: 0, avgDuration: 0 }, { appType: "terrain", sessions: 0, avgDuration: 0 }];

export const shellCardStyle: CSSProperties = { border: "1px solid #eef2f7", boxShadow: "0 2px 8px rgba(15,23,42,0.04), 0 20px 48px rgba(15,23,42,0.08)", background: "rgba(255,255,255,0.96)", position: "relative", overflow: "hidden", borderRadius: 28 };
export const headerRowStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, flexWrap: "wrap", marginBottom: 18 };
export const introStyle: CSSProperties = { margin: "6px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.5 };
export const refreshBoxStyle: CSSProperties = { display: "grid", justifyItems: "end", gap: 8 };
export const refreshButtonStyle: CSSProperties = { minHeight: 34, borderRadius: 10, border: "1px solid #dbe3eb", background: "#fff", color: "#334155", fontSize: 12, fontWeight: 700, padding: "0 12px", cursor: "pointer" };
export const errorBoxStyle: CSSProperties = { borderRadius: 14, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 16 };
export const retryButtonStyle: CSSProperties = { minHeight: 30, borderRadius: 8, border: "1px solid #fca5a5", background: "#fff", color: "#991b1b", fontSize: 12, fontWeight: 700, padding: "0 10px", cursor: "pointer" };
export const kpiGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 };
export const kpiCardStyle: CSSProperties = { borderRadius: 8, background: "var(--color-background-secondary, #f8fafc)", padding: "12px 14px" };
export const kpiSkeletonStyle: CSSProperties = { ...kpiCardStyle, minHeight: 84, background: "linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)" };
export const kpiLabelStyle: CSSProperties = { fontSize: 11, color: "#94a3b8", fontWeight: 700 };
export const kpiValueStyle: CSSProperties = { marginTop: 6, fontSize: 22, fontWeight: 500, color: "#0f172a" };
export const kpiMetaStyle: CSSProperties = { marginTop: 4, fontSize: 11, color: "#94a3b8" };
export const twoColStyle: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };
export const threeColStyle: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 };
export const sessionSkeletonStyle: CSSProperties = { height: 42, borderRadius: 12, background: "#f1f5f9" };
export const emptyStateStyle: CSSProperties = { minHeight: 172, display: "grid", placeItems: "center", textAlign: "center", gap: 6, color: "#64748b", fontSize: 12, lineHeight: 1.5 };
export const footnoteStyle: CSSProperties = { marginTop: 12, fontSize: 11, color: "#64748b", lineHeight: 1.5 };
export const calendarGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 };
export const legendStyle: CSSProperties = { marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10, fontSize: 11, color: "#64748b" };
export const alertBoxStyle: CSSProperties = { marginTop: 12, borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 11, padding: "10px 12px", lineHeight: 1.5 };
export const barsWrapStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(10, minmax(0,1fr))", gap: 4, alignItems: "end", marginBottom: 14 };
export const summaryTableStyle: CSSProperties = { display: "grid", gridTemplateColumns: "1.2fr .8fr .8fr", gap: 8, alignItems: "center" };
export const summaryHeadStyle: CSSProperties = { fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" };
export const summaryCellStyle: CSSProperties = { fontSize: 12, color: "#334155" };
export const officeGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 };

const healthBadgeStyle: CSSProperties = { minHeight: 22, borderRadius: 999, padding: "0 8px", display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 800 };
const APP_TONES = { bureau: { bg: "#E6F1FB", text: "#0C447C" }, collab: { bg: "#EAF3DE", text: "#3B6D11" }, terrain: { bg: "#FAEEDA", text: "#854F0B" } } as const;
const avatarStyle: CSSProperties = { width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 };
const pillStyle: CSSProperties = { minHeight: 24, borderRadius: 999, padding: "0 8px", display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 800 };
const officeCardStyle: CSSProperties = { border: "0.5px solid #dbe3eb", borderRadius: 8, padding: 8, display: "grid", gap: 6, alignContent: "start" };

export function calendarCellStyle(status: "future" | "none" | "partial" | "complete", loading: boolean): CSSProperties {
  return { minHeight: 42, borderRadius: 12, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "#475569", border: "1px solid #e2e8f0", background: loading ? "#f1f5f9" : status === "complete" ? "#dcefd1" : status === "partial" ? "#f6d6a8" : status === "future" ? "#fff" : "#eef2f7" };
}
