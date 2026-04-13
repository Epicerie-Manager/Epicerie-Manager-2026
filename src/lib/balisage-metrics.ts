import { balisageMonths, balisageObjective } from "@/lib/balisage-data";

export type BalisageStatus = "OK" | "En retard" | "Alerte";

const MONTH_KEY_BY_INDEX = ["JANV", "FEVR", "MARS", "AVRIL", "MAI", "JUIN", "JUIL", "AOUT", "SEPT", "OCT", "NOV", "DEC"];

const MONTH_INDEX_BY_KEY: Record<string, number> = {
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

export function parseBalisageMonthId(monthId: string) {
  const [rawMonth, rawYear] = String(monthId || "").split("_");
  return {
    year: Number(rawYear),
    month: MONTH_INDEX_BY_KEY[rawMonth] ?? 0,
  };
}

export function getCurrentBalisageMonthId(today = new Date()) {
  const key = MONTH_KEY_BY_INDEX[today.getMonth()] ?? "JANV";
  const fullId = `${key}_${today.getFullYear()}`;
  return balisageMonths.find((month) => month.id === fullId)?.id ?? "AVRIL_2026";
}

export function getCurrentBalisageMonthIndex(today = new Date()) {
  const currentMonthId = getCurrentBalisageMonthId(today);
  const exactIndex = balisageMonths.findIndex((month) => month.id === currentMonthId);
  return exactIndex >= 0 ? exactIndex : 0;
}

export function getBalisageMonthLabel(monthId: string) {
  return balisageMonths.find((month) => month.id === monthId)?.label ?? monthId;
}

export function getPreviousBalisageMonthId(monthId: string) {
  const index = balisageMonths.findIndex((month) => month.id === monthId);
  if (index <= 0) return null;
  return balisageMonths[index - 1]?.id ?? null;
}

export function isPastBalisageMonth(monthId: string, today = new Date()) {
  const { year, month } = parseBalisageMonthId(monthId);
  return today > new Date(year, month + 1, 0);
}

export function isFutureBalisageMonth(monthId: string, today = new Date()) {
  const { year, month } = parseBalisageMonthId(monthId);
  return today < new Date(year, month, 1);
}

export function getBalisageProgress(total: number) {
  return Math.min(Math.round((total / balisageObjective) * 100), 100);
}

export function getBalisageExpectedTotal(monthId: string, today = new Date()) {
  const { year, month } = parseBalisageMonthId(monthId);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const totalDays = monthEnd.getDate();

  if (today < monthStart) return 0;
  if (today > monthEnd) return balisageObjective;

  return Math.round((balisageObjective / totalDays) * today.getDate());
}

function getClosedMonthStatus(total: number): BalisageStatus {
  if (total >= balisageObjective * 0.75) return "OK";
  if (total >= balisageObjective * 0.25) return "En retard";
  return "Alerte";
}

export function getBalisageDynamicStatus(total: number, monthId: string, today = new Date()): BalisageStatus {
  const { year, month } = parseBalisageMonthId(monthId);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const totalDays = monthEnd.getDate();

  if (today < monthStart) return "OK";
  if (today > monthEnd) return getClosedMonthStatus(total);

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

export function getBalisageStatusPalette(status: BalisageStatus) {
  if (status === "OK") {
    return {
      fill: "#22c55e",
      text: "#15803d",
      badgeBg: "#dcfce7",
      border: "#86efac",
    };
  }
  if (status === "En retard") {
    return {
      fill: "#f59e0b",
      text: "#854d0e",
      badgeBg: "#fef3c7",
      border: "#fcd34d",
    };
  }
  return {
    fill: "#ef4444",
    text: "#991b1b",
    badgeBg: "#fee2e2",
    border: "#fca5a5",
  };
}

export function getBalisageStatusStyle(status: BalisageStatus) {
  const palette = getBalisageStatusPalette(status);
  return {
    bg: palette.badgeBg,
    color: palette.text,
    border: palette.border,
  };
}

export function getBalisageStatusBadgeLabel(total: number, monthId: string, today = new Date()) {
  if (isFutureBalisageMonth(monthId, today)) return "A venir";
  const status = getBalisageDynamicStatus(total, monthId, today);
  if (status === "OK") {
    if (isPastBalisageMonth(monthId, today)) return "A jour";
    return total > getBalisageExpectedTotal(monthId, today) ? "En avance" : "A jour";
  }
  if (status === "En retard") return "En retard";
  return "Alerte";
}
