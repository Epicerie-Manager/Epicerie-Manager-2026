"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { ModuleHeader } from "@/components/layout/module-header";
import { moduleThemes } from "@/lib/theme";
import { tgEntries, tgWeeks } from "@/lib/tg-data";

type FamilyFilter = "ALL" | "Sale" | "Sucre";

export default function PlanTgPage() {
  const [activeWeekId, setActiveWeekId] = useState(tgWeeks[0]?.id ?? "");
  const [familyFilter, setFamilyFilter] = useState<FamilyFilter>("ALL");
  const [search, setSearch] = useState("");

  const theme = moduleThemes.plantg;
  const activeWeek = tgWeeks.find((week) => week.id === activeWeekId) ?? tgWeeks[0];

  const weekEntries = useMemo(() => {
    return tgEntries
      .filter((entry) => entry.weekId === activeWeek.id)
      .filter((entry) => (familyFilter === "ALL" ? true : entry.family === familyFilter))
      .filter((entry) => {
        if (!search.trim()) return true;
        const normalized = search.toLowerCase();
        return (
          entry.rayon.toLowerCase().includes(normalized) ||
          entry.product.toLowerCase().includes(normalized) ||
          entry.manager.toLowerCase().includes(normalized)
        );
      });
  }, [activeWeek.id, familyFilter, search]);

  const groupedRayons = Array.from(new Set(weekEntries.map((entry) => entry.rayon))).map(
    (rayon) => ({ rayon, entries: weekEntries.filter((entry) => entry.rayon === rayon) }),
  );

  const tgCount = weekEntries.filter((entry) => entry.type === "TG").length;
  const gbCount = weekEntries.filter((entry) => entry.type === "GB").length;
  const managers = Array.from(new Set(weekEntries.map((entry) => entry.manager)));

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
        moduleKey="plantg"
        title="Plan TG / GB"
        description="Pilotage TG actif par semaine, rayon et responsable. Lecture rapide des mecaniques et priorites terrain."
      />

      <Card>
        <div style={{ display: "grid", gap: "10px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {tgWeeks.map((week) => (
              <button
                key={week.id}
                type="button"
                style={chipStyle(activeWeek.id === week.id)}
                onClick={() => setActiveWeekId(week.id)}
              >
                {week.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            {(["ALL", "Sale", "Sucre"] as const).map((value) => (
              <button
                key={value}
                type="button"
                style={chipStyle(familyFilter === value)}
                onClick={() => setFamilyFilter(value)}
              >
                {value === "ALL" ? "Tous rayons" : value}
              </button>
            ))}
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Recherche rayon / produit / responsable..."
              style={{
                minHeight: "34px",
                minWidth: "260px",
                borderRadius: "10px",
                border: "1px solid #dbe3eb",
                padding: "0 10px",
                fontSize: "12px",
                color: "#1e293b",
              }}
            />
          </div>
        </div>
      </Card>

      <KPIRow>
        <KPI moduleKey="plantg" value={activeWeek.label} label="Semaine active" size="sm" />
        <KPI moduleKey="plantg" value={tgCount} label="Lignes TG" />
        <KPI moduleKey="plantg" value={gbCount} label="Lignes GB" />
        <KPI moduleKey="plantg" value={managers.length} label="Responsables" />
      </KPIRow>

      <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        {groupedRayons.map(({ rayon, entries }) => (
          <Card key={rayon}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
              <div>
                <Kicker moduleKey="plantg" label={entries[0]?.family ?? "Rayon"} />
                <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>{rayon}</h2>
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "4px 8px", borderRadius: "999px", background: "#dcfce7", color: "#166534" }}>
                  {entries.filter((entry) => entry.type === "TG").length} TG
                </span>
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "4px 8px", borderRadius: "999px", background: "#eff6ff", color: "#1d4ed8" }}>
                  {entries.filter((entry) => entry.type === "GB").length} GB
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gap: "8px" }}>
              {entries.map((entry, index) => (
                <div
                  key={`${entry.product}-${index}`}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "999px",
                        background: entry.type === "TG" ? "#dcfce7" : "#e0f2fe",
                        color: entry.type === "TG" ? "#166534" : "#075985",
                      }}
                    >
                      {entry.type}
                    </span>
                    <strong style={{ fontSize: "13px", color: "#0f172a" }}>{entry.product}</strong>
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", fontSize: "12px", color: "#64748b" }}>
                    <span>Resp. {entry.manager}</span>
                    {entry.quantity ? <span>Qte {entry.quantity}</span> : null}
                    {entry.mechanic ? <span>{entry.mechanic}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {groupedRayons.length === 0 ? (
        <Card>
          <p style={{ color: "#64748b", fontSize: "13px" }}>
            Aucun resultat sur cette combinaison semaine/filtre/recherche.
          </p>
        </Card>
      ) : null}
    </section>
  );
}
