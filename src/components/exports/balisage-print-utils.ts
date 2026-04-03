"use client";

import { balisageMonths, balisageObjective, type BalisageEmployeeStat } from "@/lib/balisage-data";

export type BalisagePrintStat = BalisageEmployeeStat & {
  actif: boolean;
  previousTotal: number | null;
  deltaFromPrevious: number | null;
};

export function getCurrentBalisageMonthId(today = new Date()) {
  const monthKeys = ["JANV", "FEVR", "MARS", "AVRIL", "MAI", "JUIN", "JUIL", "AOUT", "SEPT", "OCT", "NOV", "DEC"];
  const key = monthKeys[today.getMonth()] ?? "JANV";
  const fullId = `${key}_${today.getFullYear()}`;
  const exact = balisageMonths.find((month) => month.id === fullId);
  return exact?.id ?? "AVRIL_2026";
}

export function getBalisageMonthLabel(monthId: string) {
  return balisageMonths.find((month) => month.id === monthId)?.label ?? monthId;
}

export function getPreviousBalisageMonthId(monthId: string) {
  const index = balisageMonths.findIndex((month) => month.id === monthId);
  if (index <= 0) return null;
  return balisageMonths[index - 1]?.id ?? null;
}

function parseMonthFromId(monthId: string) {
  const [rawMonth, rawYear] = String(monthId || "").split("_");
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

export function getDynamicStatus(total: number, monthId: string, today = new Date()) {
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

export function getProgress(total: number) {
  return Math.min(Math.round((total / balisageObjective) * 100), 100);
}

export function getStatusStyle(status: string) {
  if (status === "OK") {
    return { bg: "#dcfce7", color: "#166534", border: "#86efac" };
  }
  if (status === "En retard") {
    return { bg: "#fef3c7", color: "#92400e", border: "#fcd34d" };
  }
  return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
}

export function sortBalisageStats(stats: BalisagePrintStat[]) {
  return [...stats].sort((a, b) => {
    if (a.actif !== b.actif) return a.actif ? -1 : 1;
    return b.total - a.total || a.name.localeCompare(b.name, "fr");
  });
}
