import {
  sheetPlanningBinomes,
  sheetPlanningCycle,
  sheetPlanningEmployees,
  sheetPlanningOverrides,
} from "@/lib/planning-sheet-data";

export type PlanningOverrideEntry = {
  s: string;
  h: string | null;
};

export type PlanningOverrides = Record<string, PlanningOverrideEntry>;
export type PlanningTriData = Record<number, [string, string]>;
export type PlanningBinomes = [string, string][];

export type PlanningEmployee = {
  n: string;
  t: "M" | "S" | "E";
  hs: string | null;
  hm: string | null;
  actif: boolean;
};

const PLANNING_OVERRIDES_KEY = "epicerie-manager-planning-overrides-v2";
const PLANNING_TRI_KEY = "epicerie-manager-planning-tri-v1";
const PLANNING_BINOMES_KEY = "epicerie-manager-planning-binomes-v1";
const PLANNING_UPDATED_EVENT = "epicerie-manager:planning-updated";

export const planningEmployees: PlanningEmployee[] = sheetPlanningEmployees;

const cycle: Record<string, string[]> = sheetPlanningCycle;

export const defaultPlanningTriData: PlanningTriData = {
  1: ["CECILE", "WASIM"],
  2: ["ROSALIE", "JAMAA"],
  3: ["JEREMY", "KAMEL"],
  4: ["EL HASSANE", "LIYAKATH"],
  5: ["KHANH", "YASSINE"],
  6: ["MOHCINE", "PASCALE"],
};

export const defaultPlanningBinomes: PlanningBinomes = sheetPlanningBinomes;

function cloneTriData(data: PlanningTriData): PlanningTriData {
  return Object.fromEntries(
    Object.entries(data).map(([key, pair]) => [Number(key), [pair[0], pair[1]] as [string, string]]),
  ) as PlanningTriData;
}

function cloneBinomes(binomes: PlanningBinomes): PlanningBinomes {
  return binomes.map((pair) => [pair[0], pair[1]]) as PlanningBinomes;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getPlanningUpdatedEventName() {
  return PLANNING_UPDATED_EVENT;
}

function emitPlanningUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PLANNING_UPDATED_EVENT));
}

export function loadPlanningOverrides(): PlanningOverrides {
  if (!canUseStorage()) return { ...sheetPlanningOverrides };
  try {
    const raw = window.localStorage.getItem(PLANNING_OVERRIDES_KEY);
    if (!raw) return { ...sheetPlanningOverrides };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...sheetPlanningOverrides };
    return { ...sheetPlanningOverrides, ...(parsed as PlanningOverrides) };
  } catch {
    return { ...sheetPlanningOverrides };
  }
}

export function savePlanningOverrides(overrides: PlanningOverrides) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(PLANNING_OVERRIDES_KEY, JSON.stringify(overrides));
  emitPlanningUpdated();
}

export function loadPlanningTriData(): PlanningTriData {
  if (!canUseStorage()) return cloneTriData(defaultPlanningTriData);
  try {
    const raw = window.localStorage.getItem(PLANNING_TRI_KEY);
    if (!raw) return cloneTriData(defaultPlanningTriData);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return cloneTriData(defaultPlanningTriData);
    const merged = cloneTriData(defaultPlanningTriData);
    Object.entries(parsed as Record<string, unknown>).forEach(([key, value]) => {
      if (!Array.isArray(value) || value.length < 2) return;
      merged[Number(key)] = [String(value[0] ?? ""), String(value[1] ?? "")];
    });
    return merged;
  } catch {
    return cloneTriData(defaultPlanningTriData);
  }
}

export function savePlanningTriData(data: PlanningTriData) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(PLANNING_TRI_KEY, JSON.stringify(data));
  emitPlanningUpdated();
}

export function loadPlanningBinomes(): PlanningBinomes {
  if (!canUseStorage()) return cloneBinomes(defaultPlanningBinomes);
  try {
    const raw = window.localStorage.getItem(PLANNING_BINOMES_KEY);
    if (!raw) return cloneBinomes(defaultPlanningBinomes);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return cloneBinomes(defaultPlanningBinomes);
    const rows = parsed
      .filter((row: unknown) => Array.isArray(row) && row.length >= 2)
      .map((row: unknown) => [String((row as unknown[])[0] ?? ""), String((row as unknown[])[1] ?? "")] as [string, string]);
    return rows.length ? (rows as PlanningBinomes) : cloneBinomes(defaultPlanningBinomes);
  } catch {
    return cloneBinomes(defaultPlanningBinomes);
  }
}

export function savePlanningBinomes(binomes: PlanningBinomes) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(PLANNING_BINOMES_KEY, JSON.stringify(binomes));
  emitPlanningUpdated();
}

function getISOWeek(d: Date) {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const w = new Date(t.getFullYear(), 0, 4);
  return 1 + Math.round(((t.getTime() - w.getTime()) / 864e5 - 3 + ((w.getDay() + 6) % 7)) / 7);
}

function dayToCode(day: number) {
  return ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"][day];
}

export function getPlanningStatus(emp: PlanningEmployee, date: Date, overrides: PlanningOverrides) {
  const key = `${emp.n}_${date.toISOString().slice(0, 10)}`;
  if (overrides[key]) return overrides[key].s;
  const dow = date.getDay();
  if (dow === 0) return "X";
  if (emp.t === "E") return dow === 6 ? "PRESENT" : "X";
  if (!emp.actif) return "CONGE_MAT";
  const c = cycle[emp.n];
  if (c) {
    const cw = (getISOWeek(date) - 1) % 5;
    if (c[cw] === dayToCode(dow)) return "RH";
  }
  return "PRESENT";
}

export function getPlanningTriPairForDate(date: Date, triData: PlanningTriData) {
  const day = date.getDay();
  if (day < 1 || day > 6) return null;
  return triData[day] ?? null;
}

export function getPlanningBinomeForDate(date: Date, binomes: PlanningBinomes) {
  const day = date.getDay();
  if (day < 1 || day > 6) return null;
  const index = (day - 1) % binomes.length;
  return binomes[index] ?? null;
}
