"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Kicker } from "@/components/ui/kicker";
import { KPI, KPIRow } from "@/components/ui/kpi";
import { ModuleHeader } from "@/components/layout/module-header";
import {
  tgEmployees,
  tgWeeks,
  type TgDefaultAssignment,
  type TgFamily,
  type TgRayon,
  type TgWeekPlanRow,
} from "@/lib/tg-data";
import {
  loadTgDefaultAssignments,
  loadTgRayons,
  loadTgWeekPlans,
  saveTgDefaultAssignments,
  saveTgRayons,
  saveTgWeekPlans,
} from "@/lib/tg-store";
import { moduleThemes } from "@/lib/theme";

type FamilyFilter = "ALL" | TgFamily;

function chipStyle(active: boolean, color: string, medium: string): React.CSSProperties {
  return {
    borderRadius: "999px",
    border: `1px solid ${active ? color : "#dbe3eb"}`,
    background: active ? medium : "#fff",
    color: active ? color : "#64748b",
    fontWeight: active ? 700 : 500,
    fontSize: "12px",
    padding: "7px 12px",
  };
}

function parseWeekMeta(weekId: string) {
  const match = /^(\d{1,2}).*?(\d{2})$/.exec(weekId.trim());
  if (!match) return null;
  const weekNumber = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (!Number.isFinite(weekNumber) || !Number.isFinite(year)) return null;
  return { weekNumber, year };
}

function getIsoWeekStart(year: number, weekNumber: number) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const target = new Date(week1Monday);
  target.setUTCDate(week1Monday.getUTCDate() + (weekNumber - 1) * 7);
  return target;
}

function formatWeekLabel(weekId: string) {
  const meta = parseWeekMeta(weekId);
  if (!meta) return weekId;
  const start = getIsoWeekStart(meta.year, meta.weekNumber);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const startMonth = start.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" });
  const endMonth = end.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" });

  if (sameMonth) {
    return `S${meta.weekNumber} - du ${startDay} au ${endDay} ${endMonth} ${meta.year}`;
  }
  return `S${meta.weekNumber} - du ${startDay} ${startMonth} au ${endDay} ${endMonth} ${meta.year}`;
}

function nextRayonOrder(rayons: TgRayon[]) {
  const max = rayons.reduce((acc, row) => {
    const parsed = Number(row.order);
    if (!Number.isFinite(parsed)) return acc;
    return Math.max(acc, parsed);
  }, 0);
  return String(max + 10);
}

function normalizePlans(
  plans: TgWeekPlanRow[],
  rayons: TgRayon[],
  assignmentMap: Map<string, string>,
): TgWeekPlanRow[] {
  const planMap = new Map(plans.map((row) => [`${row.weekId}__${row.rayon}`, row]));
  const next: TgWeekPlanRow[] = [];

  tgWeeks.forEach((week) => {
    rayons.forEach((rayon) => {
      const key = `${week.id}__${rayon.rayon}`;
      const existing = planMap.get(key);
      if (existing) {
        next.push({
          ...existing,
          family: rayon.family,
          defaultResponsible: assignmentMap.get(rayon.rayon) ?? existing.defaultResponsible ?? "",
          hasOperation: Boolean(
            existing.gbProduct || existing.tgProduct || existing.tgQuantity || existing.tgMechanic,
          ),
        });
        return;
      }

      next.push({
        weekId: week.id,
        rayon: rayon.rayon,
        family: rayon.family,
        defaultResponsible: assignmentMap.get(rayon.rayon) ?? "",
        gbProduct: "",
        tgResponsible: assignmentMap.get(rayon.rayon) ?? "",
        tgProduct: "",
        tgQuantity: "",
        tgMechanic: "",
        hasOperation: false,
      });
    });
  });

  return next;
}

export default function PlanTgPage() {
  const theme = moduleThemes.plantg;
  const [rayons, setRayons] = useState<TgRayon[]>(() => loadTgRayons());
  const [assignments, setAssignments] = useState<TgDefaultAssignment[]>(() => loadTgDefaultAssignments());
  const [plans, setPlans] = useState<TgWeekPlanRow[]>(() => {
    const loadedRayons = loadTgRayons();
    const loadedAssignments = loadTgDefaultAssignments();
    const assignmentMap = new Map(loadedAssignments.map((item) => [item.rayon, item.employee]));
    return normalizePlans(loadTgWeekPlans(), loadedRayons, assignmentMap);
  });
  const [activeWeekId, setActiveWeekId] = useState(tgWeeks[0]?.id ?? "");
  const [familyFilter, setFamilyFilter] = useState<FamilyFilter>("ALL");
  const [search, setSearch] = useState("");
  const [selectedRayon, setSelectedRayon] = useState<string>(rayons[0]?.rayon ?? "");
  const [rangeEndWeekId, setRangeEndWeekId] = useState(tgWeeks[0]?.id ?? "");
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [newRayonName, setNewRayonName] = useState("");
  const [newRayonFamily, setNewRayonFamily] = useState<TgFamily>("Sale");
  const [newRayonResponsible, setNewRayonResponsible] = useState("");

  const assignmentMap = useMemo(
    () => new Map(assignments.map((item) => [item.rayon, item.employee])),
    [assignments],
  );
  const weekOrder = useMemo(
    () => new Map(tgWeeks.map((week, index) => [week.id, index])),
    [],
  );
  const activeWeekIndex = weekOrder.get(activeWeekId) ?? 0;
  const activeWeek = tgWeeks.find((week) => week.id === activeWeekId) ?? tgWeeks[0];
  const activeWeekDisplay = activeWeek ? formatWeekLabel(activeWeek.id) : "";

  const orderedRayons = useMemo(
    () =>
      [...rayons].sort(
        (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0),
      ),
    [rayons],
  );

  const activeWeekRows = useMemo(() => {
    return plans
      .filter((row) => row.weekId === activeWeek.id)
      .sort(
        (a, b) =>
          (Number(orderedRayons.find((r) => r.rayon === a.rayon)?.order ?? "0") || 0) -
          (Number(orderedRayons.find((r) => r.rayon === b.rayon)?.order ?? "0") || 0),
      )
      .map((row) => ({
        ...row,
        defaultResponsible: assignmentMap.get(row.rayon) ?? row.defaultResponsible,
      }));
  }, [activeWeek.id, assignmentMap, orderedRayons, plans]);

  const filteredRows = useMemo(() => {
    return activeWeekRows
      .filter((row) => (familyFilter === "ALL" ? true : row.family === familyFilter))
      .filter((row) => {
        if (!search.trim()) return true;
        const normalized = search.toLowerCase();
        return (
          row.rayon.toLowerCase().includes(normalized) ||
          row.gbProduct.toLowerCase().includes(normalized) ||
          row.tgProduct.toLowerCase().includes(normalized) ||
          row.tgResponsible.toLowerCase().includes(normalized) ||
          row.defaultResponsible.toLowerCase().includes(normalized)
        );
      });
  }, [activeWeekRows, familyFilter, search]);

  const effectiveSelectedRayon = activeWeekRows.some((row) => row.rayon === selectedRayon)
    ? selectedRayon
    : (activeWeekRows[0]?.rayon ?? "");
  const selectedRow = activeWeekRows.find((row) => row.rayon === effectiveSelectedRayon);
  const employees = tgEmployees.filter((employee) => employee.active).map((employee) => employee.name);

  useEffect(() => {
    saveTgRayons(rayons);
  }, [rayons]);

  useEffect(() => {
    saveTgDefaultAssignments(assignments);
  }, [assignments]);

  useEffect(() => {
    saveTgWeekPlans(normalizePlans(plans, rayons, assignmentMap));
  }, [assignmentMap, plans, rayons]);

  const operationCount = activeWeekRows.filter(
    (row) => row.gbProduct || row.tgProduct || row.tgQuantity || row.tgMechanic,
  ).length;
  const tgAssignedCount = activeWeekRows.filter((row) => row.tgResponsible).length;

  const overloaded = useMemo(() => {
    const byEmployee = new Map<string, number>();
    activeWeekRows.forEach((row) => {
      if (!(row.gbProduct || row.tgProduct || row.tgQuantity || row.tgMechanic)) return;
      const owner = row.tgResponsible || row.defaultResponsible;
      if (!owner) return;
      byEmployee.set(owner, (byEmployee.get(owner) ?? 0) + 1);
    });
    return [...byEmployee.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [activeWeekRows]);

  const groupedOverview = useMemo(() => {
    const sale = filteredRows.filter((row) => row.family === "Sale");
    const sucre = filteredRows.filter((row) => row.family === "Sucre");
    return { sale, sucre };
  }, [filteredRows]);

  const updateSelectedRow = (patch: Partial<TgWeekPlanRow>) => {
    if (!selectedRow) return;
    setPlans((current) =>
      current.map((row) => {
        if (row.weekId !== activeWeek.id || row.rayon !== selectedRow.rayon) return row;
        const next = { ...row, ...patch };
        return {
          ...next,
          hasOperation: Boolean(next.gbProduct || next.tgProduct || next.tgQuantity || next.tgMechanic),
        };
      }),
    );
  };

  const applyRangeForSelectedRayon = () => {
    if (!selectedRow) return;
    const from = weekOrder.get(activeWeek.id) ?? 0;
    const to = weekOrder.get(rangeEndWeekId) ?? from;
    const [start, end] = from <= to ? [from, to] : [to, from];

    setPlans((current) =>
      current.map((row) => {
        const index = weekOrder.get(row.weekId) ?? -1;
        if (row.rayon !== selectedRow.rayon || index < start || index > end) return row;
        const next = {
          ...row,
          gbProduct: selectedRow.gbProduct,
          tgResponsible: selectedRow.tgResponsible,
          tgProduct: selectedRow.tgProduct,
          tgQuantity: selectedRow.tgQuantity,
          tgMechanic: selectedRow.tgMechanic,
        };
        return {
          ...next,
          hasOperation: Boolean(next.gbProduct || next.tgProduct || next.tgQuantity || next.tgMechanic),
        };
      }),
    );
  };

  const copyPreviousWeek = () => {
    const index = weekOrder.get(activeWeek.id) ?? 0;
    const prev = tgWeeks[index - 1];
    if (!prev) return;
    const prevRows = plans.filter((row) => row.weekId === prev.id);
    const prevMap = new Map(prevRows.map((row) => [row.rayon, row]));

    setPlans((current) =>
      current.map((row) => {
        if (row.weekId !== activeWeek.id) return row;
        const source = prevMap.get(row.rayon);
        if (!source) return row;
        return {
          ...row,
          gbProduct: source.gbProduct,
          tgResponsible: source.tgResponsible,
          tgProduct: source.tgProduct,
          tgQuantity: source.tgQuantity,
          tgMechanic: source.tgMechanic,
          hasOperation: source.hasOperation,
        };
      }),
    );
  };

  const clearSelectedRow = () => {
    updateSelectedRow({
      gbProduct: "",
      tgProduct: "",
      tgQuantity: "",
      tgMechanic: "",
      tgResponsible: selectedRow?.defaultResponsible ?? "",
    });
  };

  const goToPreviousWeek = () => {
    const previous = tgWeeks[activeWeekIndex - 1];
    if (!previous) return;
    setActiveWeekId(previous.id);
    setRangeEndWeekId(previous.id);
  };

  const goToNextWeek = () => {
    const next = tgWeeks[activeWeekIndex + 1];
    if (!next) return;
    setActiveWeekId(next.id);
    setRangeEndWeekId(next.id);
  };

  const addRayon = () => {
    const rayonName = newRayonName.trim().toUpperCase();
    if (!rayonName) return;
    if (rayons.some((item) => item.rayon === rayonName)) return;

    const nextRayon: TgRayon = {
      rayon: rayonName,
      family: newRayonFamily,
      order: nextRayonOrder(rayons),
      active: true,
    };
    const nextRayons = [...rayons, nextRayon];
    const defaultOwner = newRayonResponsible.trim();

    const nextAssignments = defaultOwner
      ? [...assignments.filter((item) => item.rayon !== rayonName), { employee: defaultOwner, rayon: rayonName }]
      : assignments;

    const assignmentByRayon = new Map(nextAssignments.map((item) => [item.rayon, item.employee]));
    const nextPlans = normalizePlans(plans, nextRayons, assignmentByRayon);

    setRayons(nextRayons);
    setAssignments(nextAssignments);
    setPlans(nextPlans);
    setSelectedRayon(rayonName);
    setNewRayonName("");
    setNewRayonResponsible("");
  };

  return (
    <section style={{ display: "grid", gap: "14px", marginTop: "20px" }}>
      <ModuleHeader
        moduleKey="plantg"
        title="Plan TG / GB manager"
        description="Pilotage hebdomadaire des têtes de gondole et gondoles basses. Affectation dynamique des collaborateurs selon la charge."
      />

      <Card>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={goToPreviousWeek} disabled={activeWeekIndex <= 0} style={{ ...chipStyle(false, theme.color, theme.medium), opacity: activeWeekIndex <= 0 ? 0.5 : 1, cursor: activeWeekIndex <= 0 ? "not-allowed" : "pointer" }}>←</button>
            <select
              value={activeWeek.id}
              onChange={(event) => {
                setActiveWeekId(event.target.value);
                setRangeEndWeekId(event.target.value);
              }}
              style={{ minHeight: "34px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px", fontSize: "12px" }}
            >
              {tgWeeks.map((week) => (
                <option key={week.id} value={week.id}>
                  {formatWeekLabel(week.id)}
                </option>
              ))}
            </select>
            <button type="button" onClick={goToNextWeek} disabled={activeWeekIndex >= tgWeeks.length - 1} style={{ ...chipStyle(false, theme.color, theme.medium), opacity: activeWeekIndex >= tgWeeks.length - 1 ? 0.5 : 1, cursor: activeWeekIndex >= tgWeeks.length - 1 ? "not-allowed" : "pointer" }}>→</button>
            {(["ALL", "Sale", "Sucre"] as const).map((value) => (
              <button key={value} type="button" style={chipStyle(familyFilter === value, theme.color, theme.medium)} onClick={() => setFamilyFilter(value)}>
                {value === "ALL" ? "Tous rayons" : value}
              </button>
            ))}
          </div>
          <button type="button" style={chipStyle(false, theme.color, theme.medium)} onClick={copyPreviousWeek}>
            Copier semaine précédente
          </button>
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Recherche rayon / produit / responsable..."
          style={{ marginTop: "10px", minHeight: "36px", width: "100%", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 12px", fontSize: "12px", color: "#1e293b" }}
        />
      </Card>

      <KPIRow>
        <KPI moduleKey="plantg" value={activeWeekDisplay} label="Semaine active" size="sm" />
        <KPI moduleKey="plantg" value={filteredRows.length} label="Rayons visibles" />
        <KPI moduleKey="plantg" value={operationCount} label="Rayons avec opérations" />
        <KPI moduleKey="plantg" value={tgAssignedCount} label="TG affectées" />
      </KPIRow>

      <Card>
        <button
          type="button"
          onClick={() => setOverviewOpen((current) => !current)}
          style={{ width: "100%", textAlign: "left", border: "1px solid #dbe3eb", borderRadius: "12px", background: "#fff", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Vue d&apos;ensemble du plan (rayons salé / sucré)</span>
          <span style={{ fontSize: "16px", color: "#64748b" }}>{overviewOpen ? "▾" : "▸"}</span>
        </button>

        {overviewOpen ? (
          <div style={{ marginTop: "12px", display: "grid", gap: "12px" }}>
            <div>
              <Kicker moduleKey="plantg" label="Rayons Salé" />
              <div style={{ marginTop: "8px", display: "grid", gap: "8px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                {groupedOverview.sale.map((row) => (
                  <button
                    key={`sale-${row.rayon}`}
                    type="button"
                    onClick={() => setSelectedRayon(row.rayon)}
                    style={{ textAlign: "left", borderRadius: "12px", border: `1px solid ${row.rayon === effectiveSelectedRayon ? theme.color : "#dbe3eb"}`, background: row.rayon === effectiveSelectedRayon ? theme.light : "#fff", padding: "10px 12px" }}
                  >
                    <strong style={{ fontSize: "12px", color: "#0f172a" }}>{row.rayon}</strong>
                    <div style={{ marginTop: "4px", fontSize: "11px", color: "#64748b" }}>Resp.: {row.tgResponsible || row.defaultResponsible || "Non défini"}</div>
                    <div style={{ marginTop: "4px", fontSize: "11px", color: "#334155" }}>GB: {row.gbProduct ? "Renseigné" : "Vide"} · TG: {row.tgProduct ? "Renseigné" : "Vide"}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Kicker moduleKey="plantg" label="Rayons Sucré" />
              <div style={{ marginTop: "8px", display: "grid", gap: "8px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                {groupedOverview.sucre.map((row) => (
                  <button
                    key={`sucre-${row.rayon}`}
                    type="button"
                    onClick={() => setSelectedRayon(row.rayon)}
                    style={{ textAlign: "left", borderRadius: "12px", border: `1px solid ${row.rayon === effectiveSelectedRayon ? theme.color : "#dbe3eb"}`, background: row.rayon === effectiveSelectedRayon ? theme.light : "#fff", padding: "10px 12px" }}
                  >
                    <strong style={{ fontSize: "12px", color: "#0f172a" }}>{row.rayon}</strong>
                    <div style={{ marginTop: "4px", fontSize: "11px", color: "#64748b" }}>Resp.: {row.tgResponsible || row.defaultResponsible || "Non défini"}</div>
                    <div style={{ marginTop: "4px", fontSize: "11px", color: "#334155" }}>GB: {row.gbProduct ? "Renseigné" : "Vide"} · TG: {row.tgProduct ? "Renseigné" : "Vide"}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "1.2fr 1fr" }}>
        <Card>
          <Kicker moduleKey="plantg" label="Vue rayons" />
          <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Saisie rapide semaine</h2>
          <div style={{ marginTop: "10px", display: "grid", gap: "8px", maxHeight: "560px", overflowY: "auto", paddingRight: "2px" }}>
            {filteredRows.map((row) => {
              const active = row.rayon === effectiveSelectedRayon;
              const hasData = row.gbProduct || row.tgProduct || row.tgQuantity || row.tgMechanic;
              return (
                <button key={row.rayon} type="button" onClick={() => setSelectedRayon(row.rayon)} style={{ textAlign: "left", borderRadius: "12px", border: `1px solid ${active ? theme.color : "#dbe3eb"}`, background: active ? theme.light : "#fff", padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                    <strong style={{ fontSize: "13px", color: "#0f172a" }}>{row.rayon}</strong>
                    <span style={{ fontSize: "10px", fontWeight: 700, borderRadius: "999px", padding: "3px 8px", background: row.family === "Sale" ? "#dcfce7" : "#fef3c7", color: row.family === "Sale" ? "#166534" : "#92400e" }}>{row.family}</span>
                  </div>
                  <div style={{ marginTop: "5px", fontSize: "12px", color: "#64748b" }}>Resp. base: <strong style={{ color: "#334155" }}>{row.defaultResponsible || "Non défini"}</strong></div>
                  <div style={{ marginTop: "4px", fontSize: "12px", color: hasData ? "#1e293b" : "#94a3b8" }}>{hasData ? "Plan renseigné" : "Aucune opération saisie"}</div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <Kicker moduleKey="plantg" label="Edition rayon" />
          <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>{selectedRow ? selectedRow.rayon : "Sélectionner un rayon"}</h2>
          {selectedRow ? (
            <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
              <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#64748b" }}>
                <span>Produit GB (gondole basse)</span>
                <textarea value={selectedRow.gbProduct} onChange={(event) => updateSelectedRow({ gbProduct: event.target.value })} rows={2} style={{ borderRadius: "10px", border: "1px solid #dbe3eb", padding: "8px 10px", resize: "vertical", fontFamily: "inherit" }} />
              </label>

              <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#64748b" }}>
                <span>Responsable TG</span>
                <select value={selectedRow.tgResponsible || selectedRow.defaultResponsible} onChange={(event) => updateSelectedRow({ tgResponsible: event.target.value })} style={{ minHeight: "36px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px" }}>
                  {[...new Set([selectedRow.defaultResponsible, ...employees].filter(Boolean))].map((employee) => (
                    <option key={employee} value={employee}>{employee}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#64748b" }}>
                <span>Produit TG</span>
                <textarea value={selectedRow.tgProduct} onChange={(event) => updateSelectedRow({ tgProduct: event.target.value })} rows={3} style={{ borderRadius: "10px", border: "1px solid #dbe3eb", padding: "8px 10px", resize: "vertical", fontFamily: "inherit" }} />
              </label>

              <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "1fr 1fr" }}>
                <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#64748b" }}>
                  <span>Quantité</span>
                  <input value={selectedRow.tgQuantity} onChange={(event) => updateSelectedRow({ tgQuantity: event.target.value })} style={{ minHeight: "34px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px" }} />
                </label>
                <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#64748b" }}>
                  <span>Mécanique</span>
                  <input value={selectedRow.tgMechanic} onChange={(event) => updateSelectedRow({ tgMechanic: event.target.value })} style={{ minHeight: "34px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px" }} />
                </label>
              </div>

              <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "1fr auto" }}>
                <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#64748b" }}>
                  <span>Appliquer jusqu’à la semaine</span>
                  <select value={rangeEndWeekId} onChange={(event) => setRangeEndWeekId(event.target.value)} style={{ minHeight: "34px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px", fontSize: "12px" }}>
                    {tgWeeks.map((week) => (
                      <option key={week.id} value={week.id}>{formatWeekLabel(week.id)}</option>
                    ))}
                  </select>
                </label>
                <button type="button" style={chipStyle(false, theme.color, theme.medium)} onClick={applyRangeForSelectedRayon}>
                  Appliquer la plage
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" style={chipStyle(false, theme.color, theme.medium)} onClick={clearSelectedRow}>
                  Vider le rayon
                </button>
              </div>
            </div>
          ) : (
            <p style={{ marginTop: "10px", color: "#64748b", fontSize: "12px" }}>Sélectionne un rayon pour éditer son plan TG/GB.</p>
          )}
        </Card>
      </div>

      <Card>
        <Kicker moduleKey="plantg" label="Paramètres rayons" />
        <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Ajouter un rayon (préparation évolutions)</h2>
        <div style={{ display: "grid", marginTop: "10px", gap: "8px", gridTemplateColumns: "1.2fr 0.8fr 1fr auto" }}>
          <input value={newRayonName} onChange={(event) => setNewRayonName(event.target.value)} placeholder="Nom du rayon (ex: SNACK SALES)" style={{ minHeight: "34px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px" }} />
          <select value={newRayonFamily} onChange={(event) => setNewRayonFamily(event.target.value as TgFamily)} style={{ minHeight: "34px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px" }}>
            <option value="Sale">Salé</option>
            <option value="Sucre">Sucré</option>
          </select>
          <select value={newRayonResponsible} onChange={(event) => setNewRayonResponsible(event.target.value)} style={{ minHeight: "34px", borderRadius: "10px", border: "1px solid #dbe3eb", padding: "0 10px" }}>
            <option value="">Responsable (optionnel)</option>
            {employees.map((employee) => (
              <option key={employee} value={employee}>{employee}</option>
            ))}
          </select>
          <button type="button" style={chipStyle(false, theme.color, theme.medium)} onClick={addRayon}>
            Ajouter
          </button>
        </div>
      </Card>

      <Card>
        <Kicker moduleKey="plantg" label="Charge équipe" />
        <h2 style={{ marginTop: "6px", fontSize: "18px", color: "#0f172a" }}>Répartition des opérations</h2>
        <div style={{ marginTop: "10px", display: "grid", gap: "8px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {overloaded.map(([employee, count]) => (
            <div key={employee} style={{ borderRadius: "12px", border: "1px solid #dbe3eb", background: "#fff", padding: "10px 12px" }}>
              <strong style={{ fontSize: "13px", color: "#0f172a" }}>{employee}</strong>
              <div style={{ marginTop: "4px", fontSize: "12px", color: "#64748b" }}>{count} rayon(s) avec opération</div>
            </div>
          ))}
          {overloaded.length === 0 ? <p style={{ fontSize: "12px", color: "#64748b" }}>Aucune charge détectée sur cette semaine.</p> : null}
        </div>
      </Card>
    </section>
  );
}

