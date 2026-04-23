"use client";

import {
  cloneOperations,
  clonePlans,
  DEFAULT_OPERATIONS,
  DEFAULT_PLANS,
  SECTION_THEME,
  type Intervention,
  type InterventionStatus,
  type Operation,
  type RayonPlan,
  type SectionKey,
} from "@/lib/plan-rayon-data";
import { loadPlanRayonState, type PlanState } from "@/lib/plan-rayon-db";

const OPS_STORAGE_KEY = "plan-rayon-native-ops-v1";
const PLANS_STORAGE_KEY = "plan-rayon-native-plans-v1";
const PLAN_RAYON_STORE_KEY = "villebon-2";

export const PLAN_RAYON_DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
export const PLAN_RAYON_MONTH_LABELS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
export const PLAN_RAYON_MONTH_SHORT_LABELS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aou", "Sep", "Oct", "Nov", "Dec"];

export type PlanRayonSnapshot = {
  operations: Operation[];
  plans: PlanState;
  activeOperationId: string;
};

export type PlanRayonPackage = {
  id: string;
  start: string;
  end: string;
  moment: Intervention["moment"];
  charged: boolean;
  replanned: boolean;
  interventions: Intervention[];
  sections: SectionKey[];
  sectionLabels: string[];
  rayonLabels: string[];
  count: number;
};

function getDefaultPlanRayonSnapshot(): PlanRayonSnapshot {
  const operations = cloneOperations(DEFAULT_OPERATIONS);
  return {
    operations,
    plans: clonePlans(DEFAULT_PLANS),
    activeOperationId: operations[0]?.id ?? DEFAULT_OPERATIONS[0].id,
  };
}

function normalizeOperationsState(raw: unknown) {
  if (Array.isArray(raw) && raw.length) {
    return {
      operations: raw as Operation[],
      activeOperationId: (raw[0] as Operation | undefined)?.id ?? DEFAULT_OPERATIONS[0].id,
    };
  }

  const fallback = cloneOperations(DEFAULT_OPERATIONS);
  return {
    operations: fallback,
    activeOperationId: fallback[0]?.id ?? DEFAULT_OPERATIONS[0].id,
  };
}

function normalizePlansState(raw: unknown): PlanState {
  if (raw && typeof raw === "object" && Object.keys(raw as object).length) {
    return raw as PlanState;
  }
  return clonePlans(DEFAULT_PLANS);
}

export function readLocalPlanRayonExportSnapshot(): PlanRayonSnapshot {
  const fallback = getDefaultPlanRayonSnapshot();
  if (typeof window === "undefined") return fallback;

  try {
    const storedOperations = window.localStorage.getItem(OPS_STORAGE_KEY);
    const storedPlans = window.localStorage.getItem(PLANS_STORAGE_KEY);

    const normalizedOperations = normalizeOperationsState(storedOperations ? JSON.parse(storedOperations) : null);
    const normalizedPlans = normalizePlansState(storedPlans ? JSON.parse(storedPlans) : null);

    return {
      operations: normalizedOperations.operations,
      plans: normalizedPlans,
      activeOperationId: normalizedOperations.activeOperationId,
    };
  } catch {
    return fallback;
  }
}

export async function loadPlanRayonExportSnapshot(): Promise<PlanRayonSnapshot> {
  const localSnapshot = readLocalPlanRayonExportSnapshot();

  try {
    const remoteSnapshot = await loadPlanRayonState(PLAN_RAYON_STORE_KEY);
    if (!remoteSnapshot) return localSnapshot;

    const normalizedOperations = normalizeOperationsState(remoteSnapshot.operations);
    const normalizedPlans = normalizePlansState(remoteSnapshot.plans);

    return {
      operations: normalizedOperations.operations,
      plans: normalizedPlans,
      activeOperationId: normalizedOperations.activeOperationId,
    };
  } catch {
    return localSnapshot;
  }
}

export function parsePlanRayonISODate(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function formatPlanRayonShortDate(value: string) {
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
}

export function formatPlanRayonLongDate(value: string) {
  const date = parsePlanRayonISODate(value);
  return `${PLAN_RAYON_DAY_LABELS[date.getDay()]} ${date.getDate()} ${PLAN_RAYON_MONTH_LABELS[date.getMonth()]}`;
}

export function formatPlanRayonMonthTitle(date: Date) {
  return `${PLAN_RAYON_MONTH_LABELS[date.getMonth()].charAt(0).toUpperCase()}${PLAN_RAYON_MONTH_LABELS[date.getMonth()].slice(1)} ${date.getFullYear()}`;
}

export function formatPlanRayonMonthKey(value: string) {
  const [year, month] = value.split("-");
  return `${PLAN_RAYON_MONTH_LABELS[Number(month) - 1].charAt(0).toUpperCase()}${PLAN_RAYON_MONTH_LABELS[Number(month) - 1].slice(1)} ${year}`;
}

export function getPlanRayonDaysBetween(start: string, end: string) {
  return Math.round((parsePlanRayonISODate(end).getTime() - parsePlanRayonISODate(start).getTime()) / 86400000);
}

function getRangeStart(interventions: Intervention[]) {
  const minDate = interventions.reduce((current, item) => (item.start < current ? item.start : current), interventions[0]?.start ?? "2026-05-01");
  const [year, month] = minDate.split("-");
  return `${year}-${month}-01`;
}

function getRangeEnd(interventions: Intervention[]) {
  const maxDate = interventions.reduce((current, item) => (item.end > current ? item.end : current), interventions[0]?.end ?? "2026-06-30");
  const date = parsePlanRayonISODate(`${maxDate.slice(0, 7)}-01`);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return date.toISOString().slice(0, 10);
}

export function buildPlanRayonTimelineDays(interventions: Intervention[]) {
  const start = getRangeStart(interventions);
  const end = getRangeEnd(interventions);
  const totalDays = getPlanRayonDaysBetween(start, end) + 1;
  const startDate = parsePlanRayonISODate(start);
  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      index,
      date,
      iso: date.toISOString().slice(0, 10),
      day: date.getDate(),
      weekday: date.getDay(),
      weekend: date.getDay() === 0 || date.getDay() === 6,
    };
  });
}

export function buildPlanRayonTimelineDaysForMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const totalDays = endDate.getDate();
  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(index + 1);
    return {
      index,
      date,
      iso: date.toISOString().slice(0, 10),
      day: date.getDate(),
      weekday: date.getDay(),
      weekend: date.getDay() === 0 || date.getDay() === 6,
    };
  });
}

export function groupPlanRayonTimelineMonths(days: ReturnType<typeof buildPlanRayonTimelineDays>) {
  const groups: Array<{ key: string; label: string; count: number }> = [];
  days.forEach((day) => {
    const key = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, "0")}`;
    const last = groups.at(-1);
    if (!last || last.key !== key) {
      groups.push({ key, label: formatPlanRayonMonthTitle(day.date), count: 1 });
      return;
    }
    last.count += 1;
  });
  return groups;
}

export function buildPlanRayonPackages(interventions: Intervention[], plans?: PlanState): PlanRayonPackage[] {
  const grouped = new Map<string, Intervention[]>();

  interventions.forEach((item) => {
    const key = [item.start, item.end, item.moment].join("|");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(item);
  });

  return Array.from(grouped.entries())
    .map(([key, items]) => {
      const [start, end, moment] = key.split("|");
      const sectionLabels = Array.from(
        new Set(items.map((item) => getPlanRayonTheme(item.section, plans?.[item.section]).label)),
      );
      const rayonLabels = items.map((item) => item.rayon);
      return {
        id: `pkg-${key}`,
        start,
        end,
        moment: moment as Intervention["moment"],
        charged: items.some((item) => item.charged),
        replanned: items.some((item) => isPlanRayonReplanned(item)),
        interventions: items.sort((left, right) => left.rayon.localeCompare(right.rayon, "fr")),
        sections: Array.from(new Set(items.map((item) => item.section))),
        sectionLabels,
        rayonLabels,
        count: items.length,
      };
    })
    .sort((left, right) => {
      if (left.start !== right.start) return left.start.localeCompare(right.start);
      if (left.end !== right.end) return left.end.localeCompare(right.end);
      return left.moment.localeCompare(right.moment);
    });
}

export function groupPlanRayonPackagesByMonth(packages: PlanRayonPackage[]) {
  return packages.reduce<Record<string, PlanRayonPackage[]>>((accumulator, item) => {
    const key = item.start.slice(0, 7);
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push(item);
    return accumulator;
  }, {});
}

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const expanded = clean.length === 3 ? clean.split("").map((char) => `${char}${char}`).join("") : clean;
  const value = Number.parseInt(expanded, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getPlanRayonTheme(section: string, plan?: RayonPlan) {
  const preset = Object.prototype.hasOwnProperty.call(SECTION_THEME, section)
    ? SECTION_THEME[section as keyof typeof SECTION_THEME]
    : null;
  if (preset) return preset;
  const color = plan?.columns[0]?.color ?? "#4b5563";
  return {
    color,
    light: hexToRgba(color, 0.14),
    text: "#13243b",
    label: plan?.title ?? "Univers",
    icon: plan?.icon ?? "🧩",
  };
}

export function isPlanRayonReplanned(item: Intervention) {
  return item.start !== item.originalStart || item.end !== item.originalEnd;
}

export function getPlanRayonStatusPill(status: InterventionStatus) {
  if (status === "fait") return { label: "Fait", background: "#eaf7ef", color: "#1b8b4b" };
  if (status === "cours") return { label: "En cours", background: "#fff3ee", color: "#ea580c" };
  return { label: "A faire", background: "#f5f7f9", color: "#617286" };
}

export function getPlanRayonOperationSummary(operation: Operation) {
  if (!operation.interventions.length) {
    return "Aucune intervention definie";
  }
  const starts = operation.interventions.map((item) => item.start).sort();
  const ends = operation.interventions.map((item) => item.end).sort();
  const chargedCount = operation.interventions.filter((item) => item.charged).length;
  return `${formatPlanRayonLongDate(starts[0])} → ${formatPlanRayonLongDate(ends.at(-1) ?? ends[0])} · ${operation.interventions.length} interventions${chargedCount ? ` · ${chargedCount} nuits chargees` : ""}`;
}

export function getOrderedPlanRayonEntries(plans: PlanState): Array<[SectionKey, RayonPlan]> {
  return Object.entries(plans) as Array<[SectionKey, RayonPlan]>;
}
