"use client";

import { tgWeeks, type TgDefaultAssignment, type TgFamily, type TgRayon, type TgWeekPlanRow } from "@/lib/tg-data";

export type TgExportOverviewRow = TgWeekPlanRow & {
  activeResponsible: string;
  hasData: boolean;
  orderNumber: number;
};

function buildAssignmentMap(assignments: TgDefaultAssignment[]) {
  return new Map(assignments.map((item) => [item.rayon, item.employee]));
}

function hasOperationData(row: Pick<TgWeekPlanRow, "gbProduct" | "tgProduct" | "tgQuantity" | "tgMechanic">) {
  return Boolean(row.gbProduct || row.tgProduct || row.tgQuantity || row.tgMechanic);
}

function withOperationState(row: TgWeekPlanRow) {
  return { ...row, hasOperation: hasOperationData(row) };
}

function getISOWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getCurrentTgWeekId(today = new Date()) {
  if (!tgWeeks.length) return "";
  const isoWeek = getISOWeekNumber(today);
  const padded = String(isoWeek).padStart(2, "0");
  const exact = tgWeeks.find((week) => week.id.startsWith(`${padded} `));
  if (exact) return exact.id;

  const parsed = tgWeeks
    .map((week) => {
      const match = week.id.match(/^(\d{1,2})\s/);
      if (!match) return null;
      return { id: week.id, num: Number(match[1]) };
    })
    .filter((row): row is { id: string; num: number } => row !== null);

  if (!parsed.length) return tgWeeks[0]?.id ?? "";
  parsed.sort((a, b) => Math.abs(a.num - isoWeek) - Math.abs(b.num - isoWeek));
  return parsed[0]?.id ?? tgWeeks[0]?.id ?? "";
}

export function formatTgWeekLabel(weekId: string) {
  const match = /^(\d{1,2}).*?(\d{2})$/.exec(weekId.trim());
  if (!match) return weekId;
  const week = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
  const end = new Date(monday);
  end.setUTCDate(monday.getUTCDate() + 6);
  const sameMonth = monday.getUTCMonth() === end.getUTCMonth();
  const startDay = monday.getUTCDate();
  const endDay = end.getUTCDate();
  const startMonth = monday.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" });
  const endMonth = end.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" });
  return sameMonth
    ? `S${week} · du ${startDay} au ${endDay} ${endMonth} ${year}`
    : `S${week} · du ${startDay} ${startMonth} au ${endDay} ${endMonth} ${year}`;
}

function sortRayonsByOrder(rayons: TgRayon[]) {
  return [...rayons].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

function assignSequentialRayonOrders(rayons: TgRayon[]) {
  return rayons.map((rayon, index) => ({ ...rayon, order: String((index + 1) * 10) }));
}

function normalizePlans(plans: TgWeekPlanRow[], rayons: TgRayon[], assignmentMap: Map<string, string>) {
  const byKey = new Map(plans.map((row) => [`${row.weekId}__${row.rayon}`, row]));
  const output: TgWeekPlanRow[] = [];
  const weekOrder = new Map(tgWeeks.map((week, index) => [week.id, index]));

  tgWeeks.forEach((week) =>
    rayons.forEach((rayon) => {
      const startIndex = weekOrder.get(rayon.startWeekId ?? tgWeeks[0]?.id ?? "") ?? 0;
      const currentIndex = weekOrder.get(week.id) ?? 0;
      if (currentIndex < startIndex) return;

      const key = `${week.id}__${rayon.rayon}`;
      const existing = byKey.get(key);
      if (existing) {
        output.push(
          withOperationState({
            ...existing,
            family: rayon.family,
            defaultResponsible: assignmentMap.get(rayon.rayon) ?? existing.defaultResponsible ?? "",
          }),
        );
        return;
      }

      output.push({
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
    }),
  );

  return output;
}

export function getTgOverviewData(weekId: string, rayons: TgRayon[], assignments: TgDefaultAssignment[], plans: TgWeekPlanRow[]) {
  const orderedRayons = assignSequentialRayonOrders(sortRayonsByOrder(rayons.filter((rayon) => rayon.active !== false)));
  const assignmentMap = buildAssignmentMap(assignments);
  const normalizedPlans = normalizePlans(plans, orderedRayons, assignmentMap);
  const weekOrder = new Map(tgWeeks.map((week, index) => [week.id, index]));
  const activeWeekIndex = weekOrder.get(weekId) ?? 0;
  const rayonStartMap = new Map(
    orderedRayons.map((rayon) => [rayon.rayon, weekOrder.get(rayon.startWeekId ?? tgWeeks[0]?.id ?? "") ?? 0]),
  );
  const rayonOrderMap = new Map(orderedRayons.map((rayon) => [rayon.rayon, Number(rayon.order) || 0]));

  const rows = normalizedPlans
    .filter((row) => row.weekId === weekId)
    .filter((row) => (rayonStartMap.get(row.rayon) ?? 0) <= activeWeekIndex)
    .sort((left, right) => (rayonOrderMap.get(left.rayon) ?? 0) - (rayonOrderMap.get(right.rayon) ?? 0))
    .map((row) => ({
      ...row,
      defaultResponsible: assignmentMap.get(row.rayon) ?? row.defaultResponsible,
      activeResponsible: row.tgResponsible || assignmentMap.get(row.rayon) || row.defaultResponsible || "Non défini",
      hasData: hasOperationData(row),
      orderNumber: Math.round((rayonOrderMap.get(row.rayon) ?? 0) / 10),
    }));

  const sale = rows.filter((row) => row.family === "Sale");
  const sucre = rows.filter((row) => row.family === "Sucre");
  const operationCount = rows.filter((row) => row.hasData).length;
  const tgAssignedCount = rows.filter((row) => Boolean(row.tgResponsible)).length;
  const responsibleCount = rows.filter((row) => row.activeResponsible && row.activeResponsible !== "Non défini").length;

  const overloaded = [...rows]
    .filter((row) => row.hasData)
    .reduce<Map<string, number>>((map, row) => {
      const current = row.activeResponsible;
      if (!current || current === "Non défini") return map;
      map.set(current, (map.get(current) || 0) + 1);
      return map;
    }, new Map())
    .entries();

  const topLoads = Array.from(overloaded)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "fr"))
    .slice(0, 4);

  return {
    rows,
    sale,
    sucre,
    operationCount,
    tgAssignedCount,
    responsibleCount,
    topLoads,
  };
}

export function getFamilyTone(family: TgFamily) {
  return family === "Sale"
    ? {
        sectionBg: "#eaf8ef",
        sectionBorder: "#b7e4c4",
        sectionColor: "#166534",
        chipBg: "#dcfce7",
        chipColor: "#166534",
      }
    : {
        sectionBg: "#fff8e8",
        sectionBorder: "#f7d89f",
        sectionColor: "#9a3412",
        chipBg: "#ffedd5",
        chipColor: "#9a3412",
      };
}
