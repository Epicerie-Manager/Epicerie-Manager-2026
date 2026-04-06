"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  getPlanningMonthKey,
  getPlanningStatus,
  getPlanningTriPairForDate,
  loadPlanningOverrides,
  loadPlanningTriData,
  type PlanningEmployee,
  planningEmployees,
  syncPlanningFromSupabase,
  type PlanningOverrides,
  type PlanningTriData,
} from "@/lib/planning-store";
import {
  getPlanningHoraireForDate,
  getPlanningShiftBuckets,
  isPlanningEmployeeCountedForPresence,
} from "@/lib/planning-presence";

const MORNING_COORDINATOR_NAMES = new Set(["ABDOU"]);
const AFTERNOON_COORDINATOR_NAMES = new Set(["MASSIMO"]);
type ManagerOverviewState = {
  pendingAbsences: number;
};

function screenCardStyle(color: string): React.CSSProperties {
  return {
    borderRadius: 28,
    padding: "16px 18px 16px",
    background: "rgba(255,255,255,0.84)",
    border: "1px solid rgba(255,255,255,0.78)",
    boxShadow: "0 16px 40px rgba(91,33,63,0.08)",
    position: "relative",
    overflow: "hidden",
    color,
  };
}

function metricTileStyle(tone?: { bg?: string; border?: string; shadow?: string }): React.CSSProperties {
  return {
    borderRadius: 22,
    padding: "14px 14px 12px",
    background: tone?.bg ?? "#fffdfb",
    border: `1px solid ${tone?.border ?? "rgba(230,220,212,0.9)"}`,
    boxShadow: tone?.shadow ?? "0 10px 28px rgba(17,24,39,0.06)",
  };
}

export default function ManagerHomePage() {
  const [state, setState] = useState<ManagerOverviewState>({ pendingAbsences: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overrides, setOverrides] = useState<PlanningOverrides>({});
  const [triData, setTriData] = useState<PlanningTriData>({});
  const [employees, setEmployees] = useState<PlanningEmployee[]>([]);

  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      try {
        setLoading(true);
        setError("");

        const supabase = createClient();
        const monthKey = getPlanningMonthKey(today);

        const [{ count: pendingAbsences, error: absenceError }] = await Promise.all([
          supabase.from("absences").select("id", { count: "exact", head: true }).eq("statut", "en_attente"),
          syncPlanningFromSupabase(monthKey),
        ]);

        if (absenceError) throw absenceError;
        if (cancelled) return;

        setState({ pendingAbsences: pendingAbsences ?? 0 });
        setEmployees([...planningEmployees]);
        setOverrides(loadPlanningOverrides());
        setTriData(loadPlanningTriData(monthKey));
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Impossible de charger l'application manager.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadOverview();
    return () => {
      cancelled = true;
    };
  }, [today]);

  const eligibleEmployees = useMemo(
    () =>
      employees
        .filter((employee) => employee.actif)
        .sort((left, right) => left.n.localeCompare(right.n, "fr")),
    [employees],
  );

  const summary = useMemo(() => {
    const triPair = getPlanningTriPairForDate(today, triData);
    const rows = eligibleEmployees.map((employee) => {
      const horaire = getPlanningHoraireForDate(employee, today, overrides);
      const shifts = getPlanningShiftBuckets(horaire);
      const status = getPlanningStatus(employee, today, overrides);
      return {
        name: employee.n,
        status,
        hasMorning: shifts.morning,
        hasAfternoon: shifts.afternoon,
      };
    });

    return {
      triPair,
      coordinators: rows
        .filter(
          (row) =>
            row.status === "PRESENT" &&
            ((row.hasMorning && MORNING_COORDINATOR_NAMES.has(row.name)) ||
              (row.hasAfternoon && AFTERNOON_COORDINATOR_NAMES.has(row.name))),
        )
        .map((row) => row.name),
      morning: rows
        .filter(
          (row) =>
            row.status === "PRESENT" &&
            row.hasMorning &&
            !MORNING_COORDINATOR_NAMES.has(row.name),
        )
        .map((row) => row.name),
      afternoon: rows
        .filter((row) => row.status === "PRESENT" && row.hasAfternoon)
        .map((row) =>
          AFTERNOON_COORDINATOR_NAMES.has(row.name) ? `${row.name} · Cordo` : row.name,
        ),
      absents: rows.filter((row) => row.status !== "PRESENT").map((row) => row.name),
      presentCount: rows.filter(
        (row) => row.status === "PRESENT" && isPlanningEmployeeCountedForPresence({ n: row.name }),
      ).length,
    };
  }, [eligibleEmployees, overrides, today, triData]);

  const lineTiles = [
    { title: "Cordo", names: summary.coordinators },
    { title: "Matin", names: summary.morning },
    { title: "Après-midi", names: summary.afternoon },
    { title: "Absents", names: summary.absents },
  ];

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div style={screenCardStyle("#111827")}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: -50,
            top: -70,
            width: 190,
            height: 190,
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(190,24,93,0.18) 0%, rgba(190,24,93,0) 70%)",
          }}
        />
        <div style={{ position: "relative", display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9f1239" }}>
              Application manager
            </div>
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.06em",
              lineHeight: 1.02,
              whiteSpace: "nowrap",
            }}
          >
            Toute l&apos;équipe en un coup d&apos;œil.
          </div>
          <div style={{ maxWidth: 360, fontSize: 12, color: "#6b7280", lineHeight: 1.45 }}>
            Présences, tri cadie et validations à traiter, réunis sur une seule vue claire.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12 }}>
        <div style={metricTileStyle({ bg: "linear-gradient(180deg, #fffefd 0%, #f8f5ef 100%)", shadow: "0 14px 34px rgba(17,24,39,0.06)" })}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9ca3af" }}>
            Ligne du jour
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
            {summary.presentCount} présent(s) hors Abdou
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {lineTiles.map((tile) => (
              <div
                key={tile.title}
                style={{
                  borderRadius: 20,
                  padding: "12px 12px 13px",
                  background: "linear-gradient(180deg, #ffffff 0%, #fffaf5 100%)",
                  border: "1px solid rgba(228,220,214,0.95)",
                  boxShadow: "0 10px 24px rgba(17,24,39,0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{tile.title}</div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <div
                      style={{
                        minWidth: 24,
                        height: 24,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(255,255,255,0.92)",
                        border: "1px solid rgba(203,213,225,0.9)",
                        color: "#334155",
                        fontSize: 11,
                        fontWeight: 800,
                        boxShadow: "0 4px 10px rgba(15,23,42,0.06)",
                      }}
                    >
                      {tile.names.length}
                    </div>
                    <div
                      style={{
                        minWidth: 28,
                        height: 28,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          tile.title === "Cordo"
                            ? "#fee2e2"
                            : tile.title === "Matin"
                              ? "#dbeafe"
                              : tile.title === "Après-midi"
                                ? "#ffedd5"
                                : "#fef2f2",
                        color:
                          tile.title === "Cordo"
                            ? "#b91c1c"
                            : tile.title === "Matin"
                              ? "#1d4ed8"
                              : tile.title === "Après-midi"
                                ? "#c2410c"
                                : "#b91c1c",
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {tile.title === "Cordo" ? "C" : tile.title === "Matin" ? "M" : tile.title === "Après-midi" ? "AM" : "A"}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 7,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#334155",
                    lineHeight: 1.52,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {tile.names.length ? tile.names.join(", ") : "Personne"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={metricTileStyle({ bg: "#f8fffb", border: "rgba(167,243,208,0.9)" })}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#10b981" }}>
              Tri cadie
            </div>
            <div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, letterSpacing: "-0.05em", color: "#111827", lineHeight: 1.25 }}>
              {summary.triPair ? `${summary.triPair[0]} + ${summary.triPair[1]}` : "Non défini"}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>Binôme du jour</div>
          </div>

          <div style={metricTileStyle({ bg: "#fff8f7", border: "rgba(252,165,165,0.9)" })}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#ef4444" }}>
              Absences en attente
            </div>
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800, letterSpacing: "-0.06em", color: "#b91c1c" }}>
              {state.pendingAbsences}
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#b91c1c" }}>Ouvrir les validations</div>
            </div>
          </div>
        </div>
      </div>

      {loading ? <div style={{ paddingInline: 4, fontSize: 12, color: "#6b7280" }}>Chargement de l&apos;accueil manager...</div> : null}
      {error ? <div style={{ paddingInline: 4, fontSize: 12, color: "#b91c1c" }}>{error}</div> : null}
    </section>
  );
}
