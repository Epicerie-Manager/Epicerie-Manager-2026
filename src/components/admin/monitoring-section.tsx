"use client";

import { useEffect, useState } from "react";
import { ActivityChart } from "@/components/admin/activity-chart";
import { AccessCards } from "@/components/admin/access-cards";
import { BackupStatusList } from "@/components/admin/backup-status-list";
import { KpiCard } from "@/components/admin/kpi-card";
import { ModuleHealthList } from "@/components/admin/module-health-list";
import { RupturesCalendar } from "@/components/admin/ruptures-calendar";
import { SessionList } from "@/components/admin/session-list";
import {
  buildActivityHours,
  buildAppTypeSummary,
  buildImportWeek,
  buildModuleHealth,
  buildRecentSessions,
  formatHour,
  formatNumber,
} from "@/components/admin/monitoring-section-kit";
type OfficeProfile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  module_permissions: Record<string, "read" | "write">;
  has_office_access: boolean;
};

type Props = {
  officeProfiles: OfficeProfile[];
  onRefreshedAtChange?: (value: string | null) => void;
};

type AdminStatsSnapshot = {
  nbCollabs: number;
  nbCustom: number;
  nbPlanning: number;
  nbImportsToday: number;
  nbBalisage: number;
  nbPlansMasse: number;
  nbSuivis: number;
  nbUnivers: number;
  nbRayons: number;
  dernierImport: string | null;
};

const REFRESH_INTERVAL = 5 * 60 * 1000;

export function MonitoringSection({ officeProfiles, onRefreshedAtChange }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<{
    stats: AdminStatsSnapshot;
    moduleHealth: ReturnType<typeof buildModuleHealth>;
    recentSessions: ReturnType<typeof buildRecentSessions>;
    importWeek: ReturnType<typeof buildImportWeek>;
    activityHours: ReturnType<typeof buildActivityHours>;
    appTypeSummary: ReturnType<typeof buildAppTypeSummary>;
    backupItems: Array<{ label: string; status: "ok" | "warn" | "err"; meta: string }>;
    refreshedAt: string | null;
    rupturesAlert: string | null;
  } | null>(null);

  useEffect(() => {
    void loadAll();
    const handleExternalRefresh = () => void loadAll();
    const intervalId = window.setInterval(() => void loadAll(false), REFRESH_INTERVAL);
    window.addEventListener("admin-refresh", handleExternalRefresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("admin-refresh", handleExternalRefresh);
    };
  }, []);

  async function loadAll(showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/monitoring", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        stats?: AdminStatsSnapshot;
        moduleHealthRows?: unknown[];
        recentSessionRows?: unknown[];
        importRows?: Array<{ imported_at: string; periode: string | null }>;
        activityRows?: Array<{ app_type: "bureau" | "collab" | "terrain"; duration_minutes: number | null; session_start: string | null }>;
        refreshedAt?: string | null;
        rupturesAlert?: string | null;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de charger le monitoring admin.");
      }

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const refreshedAt = payload.refreshedAt ?? new Date().toISOString();
      const stats: AdminStatsSnapshot = payload.stats ?? {
        nbCollabs: 0,
        nbCustom: 0,
        nbPlanning: 0,
        nbImportsToday: 0,
        nbBalisage: 0,
        nbPlansMasse: 0,
        nbSuivis: 0,
        nbUnivers: 0,
        nbRayons: 0,
        dernierImport: null,
      };
      const moduleHealthRows = payload.moduleHealthRows ?? [];
      const recentSessionRows = payload.recentSessionRows ?? [];
      const importRows = payload.importRows ?? [];
      const activityRows = payload.activityRows ?? [];

      setData({
        stats,
        moduleHealth: buildModuleHealth(moduleHealthRows),
        recentSessions: buildRecentSessions(recentSessionRows),
        importWeek: buildImportWeek(importRows, todayStart),
        activityHours: buildActivityHours(activityRows),
        appTypeSummary: buildAppTypeSummary(activityRows),
        backupItems: [
          { label: "Backup auto Supabase", status: "ok", meta: "Quotidien · OK" },
          { label: "Export CSV hebdo", status: "warn", meta: "Dim. 20/04" },
          { label: "Planning", status: "ok", meta: `${formatNumber(stats.nbPlanning)} entrees` },
          { label: "Ruptures", status: stats.nbImportsToday ? "ok" : "warn", meta: `${formatNumber(stats.nbImportsToday)} aujourd'hui` },
          { label: "Balisage", status: "ok", meta: `${formatNumber(stats.nbBalisage)} entrees` },
          { label: "RH / Suivis", status: "ok", meta: `${formatNumber(stats.nbSuivis)} suivis` },
          { label: "Storage (facings)", status: "ok", meta: "Bucket actif" },
        ],
        refreshedAt,
        rupturesAlert: payload.rupturesAlert ?? null,
      });
      onRefreshedAtChange?.(refreshedAt);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger le monitoring admin.");
      onRefreshedAtChange?.(null);
    } finally {
      setLoading(false);
    }
  }

  const stats = data?.stats ?? {
    nbCollabs: 0,
    nbCustom: 0,
    nbPlanning: 0,
    nbImportsToday: 0,
    nbBalisage: 0,
    nbPlansMasse: 0,
    nbSuivis: 0,
    nbUnivers: 0,
    nbRayons: 0,
    dernierImport: null,
  };

  return (
    <section id="monitoring" className="admin-panel admin-panel--elevated" style={{ padding: 24 }}>
      <div className="admin-panel__header">
        <div style={{ display: "grid", gap: 8 }}>
          <div className="admin-kicker">monitoring</div>
          <div>
            <h1 className="admin-section-title">Cockpit admin</h1>
            <p className="admin-section-copy">
              Vue ultra-large des donnees actives, de la sante des modules et des flux critiques du bureau.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
          <div className="admin-meta">actualise a {data?.refreshedAt ? formatHour(data.refreshedAt) : "—"}</div>
          <button type="button" className="admin-button-subtle admin-mono" onClick={() => void loadAll()}>
            ↻ actualiser
          </button>
        </div>
      </div>

      {error ? <div className="admin-note--danger">{error}</div> : null}

      <div className="admin-grid-auto">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => <div key={index} className="admin-skeleton" style={{ minHeight: 120 }} />)
        ) : (
          <>
            <KpiCard icon="👥" iconBg="var(--admin-bg-green)" iconBorder="var(--admin-border-green)" value={formatNumber(stats.nbCollabs)} label="Collaborateurs actifs" sublabel={`acces custom · ${formatNumber(stats.nbCustom)}`} trend="↑ equipe complete" valueColor="var(--admin-green)" trendColor="var(--admin-green)" />
            <KpiCard icon="📊" iconBg="var(--admin-bg-blue)" iconBorder="var(--admin-border-blue)" value={formatNumber(stats.nbPlanning)} label="Entrees planning" sublabel="donnees actives en base" trend="↑ synchronise" />
            <KpiCard icon="📦" iconBg="var(--admin-bg-amber)" iconBorder="var(--admin-border-amber)" value={formatNumber(stats.nbImportsToday)} label="Imports ruptures" sublabel={stats.dernierImport ? `aujourd'hui · ${formatHour(stats.dernierImport)} dernier` : "aucun import aujourd'hui"} trend="⚠ voir details" valueColor={stats.nbImportsToday ? "var(--admin-amber)" : "var(--admin-text-primary)"} trendColor="var(--admin-amber)" />
            <KpiCard icon="✓" iconBg="var(--admin-bg-green)" iconBorder="var(--admin-border-green)" value={formatNumber(stats.nbBalisage)} label="Entrees balisage" sublabel="suivi mensuel actif" trend="↑ OK" />
            <KpiCard icon="🗂" iconBg="var(--admin-bg-blue)" iconBorder="var(--admin-border-blue)" value={formatNumber(stats.nbPlansMasse)} label="Plans de masse" sublabel={`${formatNumber(stats.nbUnivers)} univers · ${formatNumber(stats.nbRayons)} rayons`} trend="↑ actif" />
            <KpiCard icon="📋" iconBg="var(--admin-bg-purple)" iconBorder="var(--admin-purple)" value={formatNumber(stats.nbSuivis)} label="Audits terrain" sublabel="metre a metre actifs" trend="↑ en cours" valueColor="var(--admin-purple)" trendColor="var(--admin-purple)" />
          </>
        )}
      </div>

      <div className="admin-grid-2" style={{ marginTop: 16 }}>
        <ModuleHealthList items={data?.moduleHealth ?? buildModuleHealth([])} />
        <SessionList items={(data?.recentSessions ?? []).slice(0, 5)} compact />
      </div>

      <div className="admin-grid-3" style={{ marginTop: 16 }}>
        <BackupStatusList items={data?.backupItems ?? []} />
        <RupturesCalendar days={data?.importWeek ?? buildImportWeek([], new Date())} alert={data?.rupturesAlert} />
        <ActivityChart
          hours={data?.activityHours ?? buildActivityHours([])}
          summary={data?.appTypeSummary ?? buildAppTypeSummary([])}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <AccessCards profiles={officeProfiles.filter((profile) => profile.has_office_access)} />
      </div>
    </section>
  );
}
