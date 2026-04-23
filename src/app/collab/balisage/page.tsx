"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CollabBottomNav, CollabPage, SectionCard } from "@/components/collab/layout";
import { collabCardStyle, collabSerifTitleStyle, collabTheme } from "@/components/collab/theme";
import { balisageMonths, balisageObjective } from "@/lib/balisage-data";
import {
  getBalisageDynamicStatus,
  getBalisageMonthLabel,
  getBalisageProgress,
  getBalisageStatusBadgeLabel,
  getBalisageStatusPalette,
  getCurrentBalisageMonthIndex,
  getPreviousBalisageMonthId,
  parseBalisageMonthId,
} from "@/lib/balisage-metrics";
import { getCollabProfile, type CollabProfile } from "@/lib/collab-auth";
import { isRhEmployeeExcludedByNameFromBalisage, isRhEmployeeExcludedFromBalisage } from "@/lib/rh-status";
import { createClient } from "@/lib/supabase";

type BalisageTab = "Mon suivi" | "Vue équipe";

type EmployeeRow = {
  id: string;
  name: string;
  type: string | null;
  observation: string | null;
  actif: boolean | null;
};

type BalisageRow = {
  employee_id: string | null;
  total_controles: number | null;
  mois: string | null;
};

function getDisplayMonthLabel(monthId: string) {
  const { year } = parseBalisageMonthId(monthId);
  return `${getBalisageMonthLabel(monthId)} ${year}`;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function isTrackedEmployee(employee: EmployeeRow) {
  const upperType = String(employee.type ?? "").trim().toUpperCase();
  const upperName = String(employee.name ?? "").trim().toUpperCase();
  return (
    Boolean(employee.actif) &&
    upperType !== "E" &&
    !upperType.includes("ETUD") &&
    !isRhEmployeeExcludedFromBalisage(employee.observation ?? undefined, employee.type ?? undefined) &&
    !isRhEmployeeExcludedByNameFromBalisage(upperName)
  );
}

function buildRowKey(monthId: string, employeeId: string) {
  return `${monthId}::${employeeId}`;
}

function getEmployeeTotal(totalsByMonthAndEmployee: Map<string, number>, monthId: string, employeeId: string) {
  return totalsByMonthAndEmployee.get(buildRowKey(monthId, employeeId)) ?? 0;
}

function ProgressTrack({ value, fill }: { value: number; fill: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: 18,
        borderRadius: 999,
        background: "#e8e4de",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(value, 100))}%`,
          height: "100%",
          borderRadius: 999,
          background: fill,
          transition: "width 0.2s ease",
        }}
      />
    </div>
  );
}

function MetricCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div
      style={{
        ...collabCardStyle({
          padding: "14px 10px 12px",
          borderColor: "#efe7dd",
          boxShadow: "none",
          textAlign: "center",
        }),
      }}
    >
      <div style={{ ...collabSerifTitleStyle({ fontSize: 18, color, lineHeight: 1 }) }}>{value}</div>
      <div style={{ marginTop: 6, fontSize: 12, color: collabTheme.muted }}>{label}</div>
    </div>
  );
}

function BalisageLegend() {
  const items = [
    { label: "> 75%", color: "#22c55e" },
    { label: "25-74%", color: "#f59e0b" },
    { label: "< 25%", color: "#ef4444" },
  ];

  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", fontSize: 11 }}>
      {items.map((item) => (
        <span key={item.label} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: collabTheme.muted }}>
          <span aria-hidden="true" style={{ color: item.color, fontSize: 14, lineHeight: 1 }}>
            ●
          </span>
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  );
}

export default function CollabBalisagePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CollabProfile | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [balisageRows, setBalisageRows] = useState<BalisageRow[]>([]);
  const [activeTab, setActiveTab] = useState<BalisageTab>("Mon suivi");
  const [activeMonthIndex, setActiveMonthIndex] = useState(() => getCurrentBalisageMonthIndex());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const currentProfile = await getCollabProfile();
      if (!currentProfile || currentProfile.role !== "collaborateur") {
        router.replace("/collab/login");
        return;
      }
      if (currentProfile.first_login) {
        router.replace("/collab/change-pin");
        return;
      }
      if (!currentProfile.employee_id) {
        if (!cancelled) {
          setError("Profil collaborateur incomplet.");
          setLoading(false);
        }
        return;
      }

      const supabase = createClient();
      const [employeesResult, balisageResult] = await Promise.all([
        supabase.from("employees").select("id,name,type,observation,actif").eq("actif", true).order("name"),
        supabase.from("balisage_mensuel").select("employee_id,total_controles,mois").limit(20000),
      ]);

      if (cancelled) return;
      if (employeesResult.error || balisageResult.error) {
        setError("Le suivi balisage n'a pas pu être chargé.");
        setLoading(false);
        return;
      }

      setProfile(currentProfile);
      setEmployees((employeesResult.data ?? []) as EmployeeRow[]);
      setBalisageRows((balisageResult.data ?? []) as BalisageRow[]);
      setError("");
      setLoading(false);
    };

    void bootstrap().catch(() => {
      if (!cancelled) {
        setError("Le suivi balisage n'a pas pu être chargé.");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const today = useMemo(() => new Date(), []);
  const activeMonth = balisageMonths[activeMonthIndex] ?? balisageMonths[0];
  const displayMonth = getDisplayMonthLabel(activeMonth.id);
  const profileEmployeeId = profile?.employee_id ?? null;

  const activeEmployees = useMemo(
    () => employees.filter(isTrackedEmployee).toSorted((left, right) => left.name.localeCompare(right.name, "fr")),
    [employees],
  );

  const totalsByMonthAndEmployee = useMemo(() => {
    const map = new Map<string, number>();
    balisageRows.forEach((row) => {
      const monthId = String(row.mois ?? "");
      const employeeId = String(row.employee_id ?? "");
      if (!monthId || !employeeId) return;
      map.set(buildRowKey(monthId, employeeId), Number(row.total_controles ?? 0));
    });
    return map;
  }, [balisageRows]);

  const myEmployee = useMemo(
    () => activeEmployees.find((employee) => employee.id === profileEmployeeId) ?? null,
    [activeEmployees, profileEmployeeId],
  );

  const myTotal = profileEmployeeId ? getEmployeeTotal(totalsByMonthAndEmployee, activeMonth.id, profileEmployeeId) : 0;
  const myStatus = getBalisageDynamicStatus(myTotal, activeMonth.id, today);
  const myPalette = getBalisageStatusPalette(myStatus);
  const myBadgeLabel = getBalisageStatusBadgeLabel(myTotal, activeMonth.id, today);
  const myProgress = getBalisageProgress(myTotal);

  const historyItems = useMemo(() => {
    const items: Array<{ id: string; label: string; total: number; progress: number; fill: string }> = [];
    let cursor = activeMonth.id;
    for (let index = 0; index < 3; index += 1) {
      const previousMonthId = getPreviousBalisageMonthId(cursor);
      if (!previousMonthId || !profileEmployeeId) break;
      const total = getEmployeeTotal(totalsByMonthAndEmployee, previousMonthId, profileEmployeeId);
      const palette = getBalisageStatusPalette(getBalisageDynamicStatus(total, previousMonthId, today));
      items.push({
        id: previousMonthId,
        label: getBalisageMonthLabel(previousMonthId).slice(0, 4),
        total,
        progress: getBalisageProgress(total),
        fill: palette.fill,
      });
      cursor = previousMonthId;
    }
    return items;
  }, [activeMonth.id, profileEmployeeId, today, totalsByMonthAndEmployee]);

  const teamRows = useMemo(
    () =>
      activeEmployees.map((employee) => {
        const total = getEmployeeTotal(totalsByMonthAndEmployee, activeMonth.id, employee.id);
        const status = getBalisageDynamicStatus(total, activeMonth.id, today);
        return {
          id: employee.id,
          name: employee.name,
          total,
          progress: getBalisageProgress(total),
          palette: getBalisageStatusPalette(status),
        };
      }),
    [activeEmployees, activeMonth.id, today, totalsByMonthAndEmployee],
  );

  const teamTotal = teamRows.reduce((sum, employee) => sum + employee.total, 0);
  const teamProgress = Math.min(
    Math.round((teamTotal / (Math.max(teamRows.length, 1) * balisageObjective)) * 100),
    100,
  );

  const headerSubtitle = activeTab === "Mon suivi" ? `Mon suivi personnel · ${displayMonth}` : `Vue équipe · ${displayMonth}`;

  if (loading) {
    return (
      <CollabPage>
        <SectionCard>Chargement du contrôle balisage...</SectionCard>
      </CollabPage>
    );
  }

  return (
    <CollabPage>
      <div
        style={{
          ...collabCardStyle({
            padding: 0,
            overflow: "hidden",
            background: collabTheme.accent,
            borderColor: collabTheme.accent,
            marginBottom: 16,
          }),
        }}
      >
        <div style={{ padding: "14px 16px 10px", color: "#fffdf9" }}>
          <Link href="/collab/home" style={{ color: "#fff6ef", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
            ← Accueil
          </Link>
          <div style={{ ...collabSerifTitleStyle({ color: "#ffffff", fontSize: 18, marginTop: 6 }) }}>Contrôle balisage</div>
          <div style={{ marginTop: 3, fontSize: 13, color: "rgba(255,246,240,0.92)" }}>{headerSubtitle}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#fffdf9" }}>
          {(["Mon suivi", "Vue équipe"] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => startTransition(() => setActiveTab(tab))}
                style={{
                  minHeight: 42,
                  border: "none",
                  borderBottom: active ? `2px solid ${collabTheme.accent}` : "2px solid transparent",
                  background: "transparent",
                  color: active ? collabTheme.accent : "#9d9184",
                  fontSize: 15,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <SectionCard style={{ color: "#991b1b", background: "#fff7f7" }}>{error}</SectionCard>
      ) : null}

      {activeTab === "Mon suivi" ? (
        <div style={{ display: "grid", gap: 14 }}>
          <SectionCard style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 999,
                    background: collabTheme.accent,
                    color: "#ffffff",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 20,
                    fontWeight: 800,
                  }}
                >
                  {getInitials(myEmployee?.name ?? profile?.employees?.name ?? "??")}
                </div>
                <div>
                  <div style={{ ...collabSerifTitleStyle({ fontSize: 18, lineHeight: 1.1 }) }}>{myEmployee?.name ?? profile?.employees?.name ?? "Collaborateur"}</div>
                  <div style={{ marginTop: 3, fontSize: 13, color: collabTheme.muted }}>
                    Collaborateur · {myEmployee?.type ?? profile?.employees?.type ?? "Équipe"}
                  </div>
                </div>
              </div>
              <span
                style={{
                  borderRadius: 999,
                  background: myPalette.badgeBg,
                  color: myPalette.text,
                  padding: "7px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {myBadgeLabel}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 16 }}>
              <MetricCard value={String(myTotal)} label="Réalisés" color={myPalette.text} />
              <MetricCard value={String(balisageObjective)} label="Objectif" color={collabTheme.text} />
              <MetricCard value={`${myProgress}%`} label="Avancement" color={myPalette.text} />
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                <span style={{ color: collabTheme.muted }}>Progression</span>
                <strong style={{ color: myPalette.text }}>{myTotal} / {balisageObjective}</strong>
              </div>
              <ProgressTrack value={myProgress} fill={myPalette.fill} />
            </div>
          </SectionCard>

          <SectionCard style={{ padding: 14 }}>
            <div style={{ color: collabTheme.accent, fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Historique mensuel
            </div>
            <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
              {historyItems.map((item) => (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "40px 1fr 48px", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 14, color: collabTheme.muted }}>{item.label}</span>
                  <ProgressTrack value={item.progress} fill={item.fill} />
                  <strong style={{ fontSize: 14, color: collabTheme.text, textAlign: "right" }}>{item.total}</strong>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, textAlign: "center", fontSize: 13, color: collabTheme.muted }}>
              Objectif mensuel : <strong style={{ color: collabTheme.text }}>{balisageObjective} contrôles</strong>
            </div>
          </SectionCard>

          <BalisageLegend />
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <SectionCard style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => startTransition(() => setActiveMonthIndex((current) => Math.max(0, current - 1)))}
                disabled={activeMonthIndex <= 0}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: "1px solid #ece3d8",
                  background: "#fffaf4",
                  color: collabTheme.muted,
                  cursor: activeMonthIndex <= 0 ? "not-allowed" : "pointer",
                  opacity: activeMonthIndex <= 0 ? 0.5 : 1,
                }}
              >
                ‹
              </button>
              <div style={{ ...collabSerifTitleStyle({ fontSize: 16 }) }}>{displayMonth}</div>
              <button
                type="button"
                onClick={() => startTransition(() => setActiveMonthIndex((current) => Math.min(balisageMonths.length - 1, current + 1)))}
                disabled={activeMonthIndex >= balisageMonths.length - 1}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: "1px solid #ece3d8",
                  background: "#fffaf4",
                  color: collabTheme.muted,
                  cursor: activeMonthIndex >= balisageMonths.length - 1 ? "not-allowed" : "pointer",
                  opacity: activeMonthIndex >= balisageMonths.length - 1 ? 0.5 : 1,
                }}
              >
                ›
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              <MetricCard value={String(teamTotal)} label="Total équipe" color="#0891B2" />
              <MetricCard value={`${teamProgress}%`} label="Avancement global" color={teamProgress >= 75 ? "#15803d" : teamProgress >= 25 ? "#854d0e" : "#991b1b"} />
            </div>
          </SectionCard>

          <SectionCard style={{ padding: 14 }}>
            <div style={{ color: collabTheme.accent, fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Détail par collaborateur
            </div>
            <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
              {teamRows.map((employee) => (
                <div key={employee.id} style={{ display: "grid", gridTemplateColumns: "96px 1fr 40px", gap: 10, alignItems: "center" }}>
                  <span style={{ ...collabSerifTitleStyle({ fontSize: 14, lineHeight: 1.1 }) }}>{employee.name}</span>
                  <ProgressTrack value={employee.progress} fill={employee.palette.fill} />
                  <strong style={{ fontSize: 14, color: employee.palette.text, textAlign: "right" }}>{employee.total}</strong>
                </div>
              ))}
            </div>
          </SectionCard>

          <BalisageLegend />
        </div>
      )}

      <CollabBottomNav />
    </CollabPage>
  );
}
