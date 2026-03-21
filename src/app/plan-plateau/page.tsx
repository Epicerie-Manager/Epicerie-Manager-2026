"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { ModuleHeader } from "@/components/layout/module-header";
import { moduleThemes } from "@/lib/theme";
import { plateauMonths, plateauOperationsByMonth, plateauWeeks } from "@/lib/plateau-data";

export default function PlanPlateauPage() {
  const [activeMonthId, setActiveMonthId] = useState(plateauMonths[0]?.id ?? "");
  const activeWeeks = useMemo(
    () => plateauWeeks.filter((week) => week.monthId === activeMonthId),
    [activeMonthId],
  );
  const [activeWeekId, setActiveWeekId] = useState(activeWeeks[0]?.id ?? "");

  const theme = moduleThemes.plateau;
  const activeMonth = plateauMonths.find((month) => month.id === activeMonthId) ?? plateauMonths[0];
  const activeWeek = activeWeeks.find((week) => week.id === activeWeekId) ?? activeWeeks[0];
  const archivedMonths = plateauMonths.filter((month) => month.status === "Archive").length;
  const monthlyOperations = plateauOperationsByMonth[activeMonth.id] ?? {};
  const totalZones = activeWeek?.zones.length ?? 0;

  const selectedZoneNames = new Set((activeWeek?.zones ?? []).map((zone) => zone.name));
  const focusOperations = Object.entries(monthlyOperations)
    .filter(([zone]) => selectedZoneNames.has(zone))
    .flatMap(([zone, operations]) =>
      operations.map((operation) => ({
        zone,
        ...operation,
      })),
    );

  const chipStyle = (active: boolean): React.CSSProperties => ({
    borderRadius: "999px",
    border: `1px solid ${active ? theme.color : "#dbe3eb"}`,
    background: active ? theme.medium : "#fff",
    color: active ? theme.color : "#64748b",
    fontWeight: active ? 700 : 500,
    fontSize: "12px",
    padding: "7px 12px",
  });

  return (
    <section style={{ display: "grid", gap: "14px", marginTop: "20px" }}>
      <ModuleHeader
        moduleKey="plateau"
        title="Plan Plateau"
        description="Lecture manager active des implantations terrain avec navigation mois/semaine, focus zone et recap operations."
      />

      <Card>
        <div style={{ display: "grid", gap: "10px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {plateauMonths.map((month) => (
              <button
                key={month.id}
                type="button"
                style={chipStyle(month.id === activeMonth.id)}
                onClick={() => {
                  setActiveMonthId(month.id);
                  const firstWeek = plateauWeeks.find((week) => week.monthId === month.id);
                  setActiveWeekId(firstWeek?.id ?? "");
                }}
              >
                {month.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {activeWeeks.map((week) => (
              <button
                key={week.id}
                type="button"
                style={chipStyle(week.id === activeWeek?.id)}
                onClick={() => setActiveWeekId(week.id)}
              >
                {week.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <KPIRow>
        <KPI moduleKey="plateau" value={activeMonth.label} label="Mois actif" size="sm" />
        <KPI moduleKey="plateau" value={activeWeeks.length} label="Semaines chargees" />
        <KPI moduleKey="plateau" value={totalZones} label="Zones suivies" />
        <KPI moduleKey="plateau" value={archivedMonths} label="Archives" />
      </KPIRow>

      {activeWeek ? (
        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "1fr 1fr" }}>
          <Card>
            <Kicker moduleKey="plateau" label="Semaine focus" />
            <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>{activeWeek.label}</h2>
            <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b" }}><span>Periode</span><strong style={{ color: "#0f172a" }}>{activeWeek.dateRange}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b" }}><span>Theme</span><strong style={{ color: "#0f172a" }}>{activeWeek.theme}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b" }}><span>Priorite</span><strong style={{ color: "#0f172a" }}>{activeWeek.priority}</strong></div>
            </div>
          </Card>

          <Card>
            <Kicker moduleKey="plateau" label="Operations" />
            <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Recap rapide</h2>
            <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
              {focusOperations.slice(0, 8).map((operation) => (
                <div
                  key={`${operation.zone}-${operation.slot}-${operation.operation}`}
                  style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "8px 10px", background: "#fff" }}
                >
                  <strong style={{ display: "block", fontSize: "12px", color: "#0f172a" }}>{operation.zone}</strong>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {operation.slot} - {operation.operation}
                  </span>
                </div>
              ))}
              {focusOperations.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: "13px" }}>Aucune operation sur cette selection.</p>
              ) : null}
            </div>
          </Card>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {(activeWeek?.zones ?? []).map((zone) => (
          <Card key={zone.name}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
              <div>
                <Kicker moduleKey="plateau" label="Zone terrain" />
                <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>{zone.name}</h2>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "4px 8px", borderRadius: "999px", background: theme.light, color: theme.color }}>
                {zone.owner}
              </span>
            </div>
            <div style={{ marginTop: "10px", border: `1px solid ${theme.medium}`, background: theme.light, borderRadius: "12px", padding: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", color: theme.color, textTransform: "uppercase" }}>
                Focus semaine
              </div>
              <strong style={{ fontSize: "13px", color: "#0f172a" }}>{zone.focus}</strong>
            </div>
            <p style={{ marginTop: "10px", fontSize: "12px", color: "#64748b" }}>{zone.notes}</p>
          </Card>
        ))}
      </div>

      <Card>
        <Kicker moduleKey="plateau" label="Recap mois" />
        <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Operations par zone</h2>
        <div style={{ display: "grid", gap: "10px", marginTop: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {Object.entries(monthlyOperations).map(([zone, operations]) => (
            <div key={zone} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "10px 12px", background: "#fff" }}>
              <h3 style={{ fontSize: "14px", marginBottom: "8px", color: "#0f172a" }}>{zone}</h3>
              <ul style={{ margin: 0, paddingLeft: "18px", color: "#64748b", fontSize: "12px", lineHeight: 1.6 }}>
                {operations.map((operation) => (
                  <li key={`${zone}-${operation.slot}-${operation.operation}`}>
                    {operation.slot}: {operation.operation}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
