"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  formatPlanningDate,
  getPlanningMonthKey,
  getPlanningTriPairForDate,
  loadPlanningOverrides,
  loadPlanningTriData,
  planningEmployees,
  syncPlanningFromSupabase,
  type PlanningOverrides,
  type PlanningTriData,
} from "@/lib/planning-store";
import { getPlanningHoraireForDate, getPlanningShiftBuckets } from "@/lib/planning-presence";
type ManagerOverviewState = {
  pendingAbsences: number;
};

function screenCardStyle(color: string): React.CSSProperties {
  return {
    borderRadius: 28,
    padding: "18px 18px 20px",
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

function chipButtonStyle(accent: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    minHeight: 42,
    padding: "0 14px",
    borderRadius: 999,
    background: accent,
    color: "#fff",
    fontSize: 12,
    fontWeight: 800,
    boxShadow: "0 10px 20px rgba(15,23,42,0.08)",
  };
}

export default function ManagerHomePage() {
  const [state, setState] = useState<ManagerOverviewState>({ pendingAbsences: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overrides, setOverrides] = useState<PlanningOverrides>({});
  const [triData, setTriData] = useState<PlanningTriData>({});

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
      planningEmployees
        .filter((employee) => employee.actif)
        .sort((left, right) => left.n.localeCompare(right.n, "fr")),
    [],
  );

  const summary = useMemo(() => {
    const triPair = getPlanningTriPairForDate(today, triData);
    const rows = eligibleEmployees.map((employee) => {
      const horaire = getPlanningHoraireForDate(employee, today, overrides);
      const shifts = getPlanningShiftBuckets(horaire);
      const key = `${employee.n}_${formatPlanningDate(today)}`;
      const status = overrides[key]?.s ?? (horaire ? "PRESENT" : "X");
      return {
        name: employee.n,
        status,
        hasMorning: shifts.morning,
        hasAfternoon: shifts.afternoon,
      };
    });

    return {
      triPair,
      morning: rows.filter((row) => row.status === "PRESENT" && row.hasMorning).map((row) => row.name),
      afternoon: rows.filter((row) => row.status === "PRESENT" && row.hasAfternoon).map((row) => row.name),
      absents: rows.filter((row) => row.status !== "PRESENT").map((row) => row.name),
    };
  }, [eligibleEmployees, overrides, today, triData]);

  const lineTiles = [
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
        <div style={{ position: "relative", display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9f1239" }}>
              Application manager
            </div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.07em", maxWidth: 360, lineHeight: 1.02 }}>
            Le jour d&apos;abord.
          </div>
          <div style={{ maxWidth: 360, fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
            Planning du jour, absences à traiter, accès direct aux modules terrain et équipe.
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/manager/planning" style={chipButtonStyle("linear-gradient(135deg, #2563eb, #38bdf8)")}>
              Ouvrir le planning
            </Link>
            <Link href="/manager/terrain" style={chipButtonStyle("linear-gradient(135deg, #be123c, #ef4444)")}>
              Terrain
            </Link>
            <Link href="/manager/absences" style={chipButtonStyle("linear-gradient(135deg, #0f766e, #14b8a6)")}>
              Absences
            </Link>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12 }}>
        <div style={metricTileStyle({ bg: "linear-gradient(180deg, #fffefd 0%, #f8f5ef 100%)", shadow: "0 14px 34px rgba(17,24,39,0.06)" })}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9ca3af" }}>
            Ligne du jour
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {lineTiles.map((tile) => (
              <div
                key={tile.title}
                style={{
                  borderRadius: 20,
                  padding: "14px 14px 15px",
                  background: "linear-gradient(180deg, #ffffff 0%, #fffaf5 100%)",
                  border: "1px solid rgba(228,220,214,0.95)",
                  boxShadow: "0 10px 24px rgba(17,24,39,0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{tile.title}</div>
                  <div
                    style={{
                      minWidth: 28,
                      height: 28,
                      borderRadius: 999,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: tile.title === "Matin" ? "#dbeafe" : tile.title === "Après-midi" ? "#ffedd5" : "#fef2f2",
                      color: tile.title === "Matin" ? "#1d4ed8" : tile.title === "Après-midi" ? "#c2410c" : "#b91c1c",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {tile.title === "Matin" ? "M" : tile.title === "Après-midi" ? "AM" : "A"}
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
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
            <div style={{ marginTop: 10, fontSize: 22, fontWeight: 800, letterSpacing: "-0.05em", color: "#111827", lineHeight: 1.3 }}>
              {summary.triPair ? `${summary.triPair[0]} + ${summary.triPair[1]}` : "Non défini"}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>Binôme du jour</div>
          </div>

          <div style={metricTileStyle({ bg: "#fff8f7", border: "rgba(252,165,165,0.9)" })}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#ef4444" }}>
              Absences en attente
            </div>
            <div style={{ marginTop: 10, fontSize: 30, fontWeight: 800, letterSpacing: "-0.06em", color: "#b91c1c" }}>
              {state.pendingAbsences}
            </div>
            <div style={{ marginTop: 8 }}>
              <Link href="/manager/absences" style={{ fontSize: 12, fontWeight: 800, color: "#b91c1c", textDecoration: "none" }}>
                Ouvrir les validations
              </Link>
            </div>
          </div>
        </div>
      </div>

      {loading ? <div style={{ paddingInline: 4, fontSize: 12, color: "#6b7280" }}>Chargement de l&apos;accueil manager...</div> : null}
      {error ? <div style={{ paddingInline: 4, fontSize: 12, color: "#b91c1c" }}>{error}</div> : null}
    </section>
  );
}
