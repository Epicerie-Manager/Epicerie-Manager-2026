import {
  hasBrowserWindow,
  purgeLegacyCacheByPrefixes,
  purgeLegacyCacheKeys,
} from "@/lib/browser-cache";
import { createClient } from "@/lib/supabase";

export type PlanningOverrideEntry = {
  s: string;
  h: string | null;
};

export type PlanningOverrides = Record<string, PlanningOverrideEntry>;
export type PlanningTriData = Record<number, [string, string]>;
export type PlanningBinomes = [string, string][];
export type PlanningUndoCell = {
  employeeName: string;
  employeeId: string;
  date: string;
};

export type PlanningUndoEntryRow = {
  id: string;
  date: string;
  employee_id: string;
  statut: string | null;
  horaire_custom: string | null;
};

export type PlanningUndoSnapshot = {
  id: string;
  label: string;
  timestamp: number;
  expiresAt: number;
  affectedCells: PlanningUndoCell[];
  entries: PlanningUndoEntryRow[];
};

export type PlanningEmployee = {
  dbId?: string;
  n: string;
  t: "M" | "S" | "E";
  hs: string | null;
  hm: string | null;
  hsa?: string | null;
  actif: boolean;
};

export type PlanningSyncState = "idle" | "syncing" | "success" | "error";

export type PlanningSyncStatus = {
  monthKey: string;
  state: PlanningSyncState;
  message: string;
  updatedAt: number | null;
};

const PLANNING_OVERRIDES_KEY = "epicerie-manager-planning-overrides-v2";
const PLANNING_TRI_KEY_PREFIX = "epicerie-manager-planning-tri-v1";
const PLANNING_BINOMES_KEY_PREFIX = "epicerie-manager-planning-binomes-v1";
const PLANNING_UPDATED_EVENT = "epicerie-manager:planning-updated";
const PLANNING_UNDO_UPDATED_EVENT = "epicerie-manager:planning-undo-updated";
const PLANNING_SYNC_STATUS_EVENT = "epicerie-manager:planning-sync-status";
const MAX_PLANNING_UNDO = 5;
const PLANNING_UNDO_DURATION_MS = 15_000;

export let planningEmployees: PlanningEmployee[] = [];

let cycle: Record<string, string[]> = {};
let planningSyncStatusByMonth: Record<string, PlanningSyncStatus> = {};

export const defaultPlanningTriData: PlanningTriData = {};

export const defaultPlanningBinomes: PlanningBinomes = [];

function isAbsencePlanningStatus(status: string) {
  const upper = String(status ?? "").toUpperCase().trim();
  return ["ABS", "ABSENT", "CP", "MAL", "CONGE_MAT", "FERIE", "FORM", "DEPLACEMENT_RH", "X"].includes(upper);
}

function getPlanningDefaultHoraire(employee: PlanningEmployee, date: Date) {
  const dow = date.getDay();
  if (dow === 2) return employee.hm;
  if (dow === 6 && employee.t === "E") return employee.hsa ?? "14h-21h30";
  return employee.hs;
}

function getPlanningDefaultStatus(employee: PlanningEmployee, date: Date) {
  const dow = date.getDay();
  if (dow === 0) return "X";
  if (employee.t === "E") return dow === 6 ? "PRESENT" : "X";
  if (!employee.actif) return "CONGE_MAT";
  const employeeCycle = cycle[employee.n];
  if (employeeCycle) {
    const cycleWeek = (getISOWeek(date) - 1) % 5;
    if (employeeCycle[cycleWeek] === dayToCode(dow)) return "RH";
  }
  return "PRESENT";
}

function shouldKeepPlanningOverrideEntry(
  employeeName: string,
  dateIso: string,
  entry: PlanningOverrideEntry,
  employees: PlanningEmployee[] = planningEmployees,
) {
  const employee = employees.find((item) => item.n === employeeName);
  if (!employee) return true;

  const date = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return true;

  const defaultStatus = getPlanningDefaultStatus(employee, date);
  const normalizedStatus = String(entry.s ?? "").toUpperCase().trim() || defaultStatus;
  if (normalizedStatus !== defaultStatus) return true;
  if (normalizedStatus !== "PRESENT") return false;

  const defaultHoraire = getPlanningDefaultHoraire(employee, date);
  const customHoraire = entry.h ?? null;
  return Boolean(customHoraire && customHoraire !== defaultHoraire);
}

export const defaultPlanningOverrides: PlanningOverrides = {};

function cloneTriData(data: PlanningTriData): PlanningTriData {
  return Object.fromEntries(
    Object.entries(data).map(([key, pair]) => [Number(key), [pair[0], pair[1]] as [string, string]]),
  ) as PlanningTriData;
}

function cloneBinomes(binomes: PlanningBinomes): PlanningBinomes {
  return binomes.map((pair) => [pair[0], pair[1]]) as PlanningBinomes;
}

function normalizePlanningHoraireSegment(segment: string) {
  const cleaned = String(segment ?? "").trim().toLowerCase().replace(/\s+/g, "");
  const match = cleaned.match(/^(\d{1,2})(?:h|:)?(?:(\d{2}))?$/);
  if (!match) return cleaned;
  const hours = String(Number(match[1]));
  const minutes = match[2] ?? "00";
  return minutes === "00" ? `${hours}h` : `${hours}h${minutes}`;
}

export function normalizePlanningHoraireValue(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const sanitized = raw.replace(/[–—]/g, "-");
  const parts = sanitized.split("-").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 2) {
    const start = normalizePlanningHoraireSegment(parts[0]);
    const end = normalizePlanningHoraireSegment(parts[1]);
    if (start && end) return `${start}-${end}`;
  }
  if (parts.length === 1) return normalizePlanningHoraireSegment(parts[0]);
  return sanitized.replace(/\s+/g, "");
}

function horaireToSortValue(horaire: string) {
  const normalized = normalizePlanningHoraireValue(horaire);
  const start = normalized.split("-")[0] ?? normalized;
  const match = start.match(/^(\d{1,2})h(?:(\d{2}))?$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  return (hours * 60) + minutes;
}

function sortPlanningHoraireValues(values: string[]) {
  return [...values].sort((a, b) => {
    const diff = horaireToSortValue(a) - horaireToSortValue(b);
    return diff || a.localeCompare(b, "fr-FR");
  });
}

function collectPlanningHorairePresets() {
  const values = new Set<string>();
  const pushHoraire = (horaire: string | null | undefined) => {
    const normalized = normalizePlanningHoraireValue(horaire);
    if (normalized) values.add(normalized);
  };

  planningEmployees.forEach((employee) => {
    pushHoraire(employee.hs);
    pushHoraire(employee.hm);
    pushHoraire(employee.hsa);
  });

  Object.values(defaultPlanningOverridesSnapshot).forEach((entry) => pushHoraire(entry.h));
  Object.values(planningOverridesSnapshot).forEach((entry) => pushHoraire(entry.h));

  return sortPlanningHoraireValues(Array.from(values));
}

const defaultPlanningOverridesSnapshot = cloneOverrides(defaultPlanningOverrides);
let planningOverridesSnapshot = cloneOverrides(defaultPlanningOverrides);
let planningOverridesSerialized = JSON.stringify(planningOverridesSnapshot);
let planningTriSnapshotByMonth: Record<string, PlanningTriData> = {};
let planningTriSerializedByMonth: Record<string, string> = {};
let planningBinomesSnapshotByMonth: Record<string, PlanningBinomes> = {};
let planningBinomesSerializedByMonth: Record<string, string> = {};
let planningUndoStack: PlanningUndoSnapshot[] = [];

function canUseStorage() {
  return hasBrowserWindow();
}

export function getPlanningMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function cloneOverrides(overrides: PlanningOverrides) {
  return Object.fromEntries(
    Object.entries(overrides).map(([key, value]) => [key, { ...value }]),
  ) as PlanningOverrides;
}

function cloneDefaultPlanningOverrides() {
  return cloneOverrides(defaultPlanningOverridesSnapshot);
}

function replacePlanningOverridesSnapshot(overrides: PlanningOverrides) {
  const nextOverrides = cloneOverrides(overrides);
  const serialized = JSON.stringify(nextOverrides);
  if (serialized === planningOverridesSerialized) return false;
  planningOverridesSnapshot = nextOverrides;
  planningOverridesSerialized = serialized;
  return true;
}

function getPlanningTriSnapshot(monthKey: string) {
  return planningTriSnapshotByMonth[monthKey]
    ? cloneTriData(planningTriSnapshotByMonth[monthKey])
    : cloneTriData(defaultPlanningTriData);
}

function replacePlanningTriSnapshot(monthKey: string, data: PlanningTriData) {
  const nextTriData = cloneTriData(data);
  const serialized = JSON.stringify(nextTriData);
  if (planningTriSerializedByMonth[monthKey] === serialized) return false;
  planningTriSnapshotByMonth = {
    ...planningTriSnapshotByMonth,
    [monthKey]: nextTriData,
  };
  planningTriSerializedByMonth = {
    ...planningTriSerializedByMonth,
    [monthKey]: serialized,
  };
  return true;
}

function getPlanningBinomesSnapshot(monthKey: string) {
  return planningBinomesSnapshotByMonth[monthKey]
    ? cloneBinomes(planningBinomesSnapshotByMonth[monthKey])
    : cloneBinomes(defaultPlanningBinomes);
}

function replacePlanningBinomesSnapshot(monthKey: string, binomes: PlanningBinomes) {
  const nextBinomes = cloneBinomes(binomes);
  const serialized = JSON.stringify(nextBinomes);
  if (planningBinomesSerializedByMonth[monthKey] === serialized) return false;
  planningBinomesSnapshotByMonth = {
    ...planningBinomesSnapshotByMonth,
    [monthKey]: nextBinomes,
  };
  planningBinomesSerializedByMonth = {
    ...planningBinomesSerializedByMonth,
    [monthKey]: serialized,
  };
  return true;
}

export function getPlanningUpdatedEventName() {
  return PLANNING_UPDATED_EVENT;
}

function emitPlanningUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PLANNING_UPDATED_EVENT));
}

function emitPlanningSyncStatusUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PLANNING_SYNC_STATUS_EVENT));
}

function setPlanningSyncStatus(monthKey: string, state: PlanningSyncState, message = "") {
  const nextStatus: PlanningSyncStatus = {
    monthKey,
    state,
    message,
    updatedAt: Date.now(),
  };
  const currentStatus = planningSyncStatusByMonth[monthKey];
  if (
    currentStatus &&
    currentStatus.state === nextStatus.state &&
    currentStatus.message === nextStatus.message
  ) {
    planningSyncStatusByMonth = {
      ...planningSyncStatusByMonth,
      [monthKey]: nextStatus,
    };
    return;
  }
  planningSyncStatusByMonth = {
    ...planningSyncStatusByMonth,
    [monthKey]: nextStatus,
  };
  emitPlanningSyncStatusUpdated();
}

export function getPlanningSyncStatusUpdatedEventName() {
  return PLANNING_SYNC_STATUS_EVENT;
}

export function loadPlanningSyncStatus(monthKey = getPlanningMonthKey(new Date())): PlanningSyncStatus {
  return planningSyncStatusByMonth[monthKey] ?? {
    monthKey,
    state: "idle",
    message: "",
    updatedAt: null,
  };
}

export function getPlanningUndoUpdatedEventName() {
  return PLANNING_UNDO_UPDATED_EVENT;
}

function emitPlanningUndoUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PLANNING_UNDO_UPDATED_EVENT));
}

function replacePlanningUndoStack(nextStack: PlanningUndoSnapshot[]) {
  const serializedCurrent = JSON.stringify(planningUndoStack);
  const serializedNext = JSON.stringify(nextStack);
  if (serializedCurrent === serializedNext) return false;
  planningUndoStack = nextStack;
  return true;
}

function cleanupExpiredPlanningUndo() {
  const now = Date.now();
  const nextStack = planningUndoStack.filter((snapshot) => snapshot.expiresAt > now);
  const changed = replacePlanningUndoStack(nextStack);
  if (changed) emitPlanningUndoUpdated();
  return nextStack;
}

function pushPlanningUndo(label: string, affectedCells: PlanningUndoCell[], entries: PlanningUndoEntryRow[]) {
  const snapshot: PlanningUndoSnapshot = {
    id: crypto.randomUUID(),
    label,
    timestamp: Date.now(),
    expiresAt: Date.now() + PLANNING_UNDO_DURATION_MS,
    affectedCells: affectedCells.map((cell) => ({ ...cell })),
    entries: entries.map((entry) => ({ ...entry })),
  };
  const nextStack = [snapshot, ...planningUndoStack.filter((item) => item.expiresAt > Date.now())].slice(0, MAX_PLANNING_UNDO);
  if (replacePlanningUndoStack(nextStack)) emitPlanningUndoUpdated();
  return snapshot;
}

export function loadLatestPlanningUndo() {
  cleanupExpiredPlanningUndo();
  return planningUndoStack.length > 0 ? { ...planningUndoStack[0], affectedCells: planningUndoStack[0].affectedCells.map((cell) => ({ ...cell })), entries: planningUndoStack[0].entries.map((entry) => ({ ...entry })) } : null;
}

export function dismissPlanningUndo(snapshotId?: string) {
  cleanupExpiredPlanningUndo();
  if (!snapshotId) return;
  const nextStack = planningUndoStack.filter((snapshot) => snapshot.id !== snapshotId);
  if (replacePlanningUndoStack(nextStack)) emitPlanningUndoUpdated();
}

function purgePlanningLegacyCache() {
  purgeLegacyCacheKeys([PLANNING_OVERRIDES_KEY]);
  purgeLegacyCacheByPrefixes([PLANNING_TRI_KEY_PREFIX, PLANNING_BINOMES_KEY_PREFIX]);
}

const DAY_CODE_TO_INDEX: Record<string, number> = {
  LUN: 1,
  MAR: 2,
  MER: 3,
  JEU: 4,
  VEN: 5,
  SAM: 6,
};

function employeeFromAbsenceNote(note: unknown) {
  const text = String(note ?? "");
  const match = text.match(/^EMPLOYEE:([^|]+)(\||$)/i);
  if (!match) return null;
  return match[1].trim().toUpperCase();
}

function listPlanningAbsenceDates(startDate: string, endDate: string) {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (current <= end) {
    if (current.getDay() !== 0) {
      dates.push(formatPlanningDate(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function getPlanningStatusFromAbsenceType(type: string) {
  const upper = String(type ?? "").toUpperCase();
  if (upper === "CP") return "CP";
  if (upper === "DEPLACEMENT_RH") return "DEPLACEMENT_RH";
  if (upper === "MAL") return "MAL";
  if (upper === "CONGE_MAT") return "CONGE_MAT";
  if (upper === "FORM") return "FORM";
  if (upper === "FERIE") return "FERIE";
  return "X";
}

export function formatPlanningDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizePlanningStatusFromDb(status: string) {
  const upper = String(status || "").toUpperCase().trim();
  if (upper === "PRESENT") return "PRESENT";
  if (upper === "RH") return "RH";
  if (upper === "CP") return "CP";
  if (upper === "MAL") return "MAL";
  if (upper === "CONGE_MAT") return "CONGE_MAT";
  if (upper === "FERIE") return "FERIE";
  if (upper === "FORMATION") return "FORM";
  if (upper === "FORM") return "FORM";
  if (upper === "ABSENT") return "X";
  if (upper === "X") return "X";
  return upper || "X";
}

function normalizePlanningStatusToDb(status: string) {
  const upper = String(status || "").toUpperCase();
  if (upper === "ABS") return "ABSENT";
  if (upper === "X") return "ABSENT";
  if (upper === "FORM") return "FORMATION";
  return upper || "PRESENT";
}

function normalizeRhType(value: string): "M" | "S" | "E" {
  const upper = String(value || "").toUpperCase();
  if (upper.includes("APRES")) return "S";
  if (upper.includes("ETUD")) return "E";
  return "M";
}

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const pageSize = 1000;
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }

  return rows;
}

export async function syncPlanningFromSupabase(monthKey = getPlanningMonthKey(new Date())) {
  if (!canUseStorage()) return false;
  purgePlanningLegacyCache();
  setPlanningSyncStatus(monthKey, "syncing");

  try {
    const supabase = createClient();
    let didChange = false;

    const { data: employeeRows, error: employeeError } = await supabase
      .from("employees")
      .select("id,name,type,horaire_standard,horaire_mardi,horaire_samedi,actif")
      .limit(5000);
    if (employeeError) throw employeeError;
    if (!employeeRows || employeeRows.length === 0) {
      throw new Error("Aucune donnée planning employee n'a été reçue depuis Supabase.");
    }

    const mappedEmployees: PlanningEmployee[] = employeeRows.map((employee) => ({
      dbId: String(employee.id),
      n: String(employee.name ?? "").trim().toUpperCase(),
      t: normalizeRhType(String(employee.type ?? "")),
      hs: employee.horaire_standard ?? null,
      hm: employee.horaire_mardi ?? null,
      hsa: employee.horaire_samedi ?? null,
      actif: Boolean(employee.actif),
    }));
    const employeesSerialized = JSON.stringify(mappedEmployees);
    if (employeesSerialized !== JSON.stringify(planningEmployees)) {
      planningEmployees = mappedEmployees;
      didChange = true;
    } else {
      planningEmployees = mappedEmployees;
    }
    const employeeNameById = new Map(
      employeeRows.map((employee) => [String(employee.id), String(employee.name ?? "").trim().toUpperCase()]),
    );

    const { data: cycleRows } = await supabase
      .from("cycle_repos")
      .select("employee_id,semaine_cycle,jour_repos")
      .limit(5000);
    if (Array.isArray(cycleRows) && cycleRows.length > 0) {
      const nextCycle: Record<string, string[]> = {};
      cycleRows.forEach((row) => {
        const name = employeeNameById.get(String(row.employee_id));
        if (!name) return;
        if (!nextCycle[name]) nextCycle[name] = (cycle[name] ?? ["LUN", "LUN", "LUN", "LUN", "LUN"]).slice(0, 5);
        const idx = Number(row.semaine_cycle) - 1;
        if (idx >= 0 && idx < 5) {
          nextCycle[name][idx] = String(row.jour_repos ?? "LUN").toUpperCase();
        }
      });
      if (Object.keys(nextCycle).length > 0) {
        const mergedCycle = { ...cycle, ...nextCycle };
        if (JSON.stringify(mergedCycle) !== JSON.stringify(cycle)) {
          cycle = mergedCycle;
          didChange = true;
        } else {
          cycle = mergedCycle;
        }
      }
    }

    const nextTriData = cloneTriData(defaultPlanningTriData);
    const { data: triRows } = await supabase
      .from("tri_caddie")
      .select("jour_semaine,employee1_id,employee2_id")
      .eq("mois", monthKey)
      .limit(100);
    if (Array.isArray(triRows) && triRows.length > 0) {
      triRows.forEach((row) => {
        const index = DAY_CODE_TO_INDEX[String(row.jour_semaine ?? "").toUpperCase()];
        if (!index) return;
        const name1 = employeeNameById.get(String(row.employee1_id));
        const name2 = employeeNameById.get(String(row.employee2_id));
        if (!name1 || !name2) return;
        nextTriData[index] = [name1, name2];
      });
    }
    didChange = replacePlanningTriSnapshot(monthKey, nextTriData) || didChange;

    let nextBinomes = cloneBinomes(defaultPlanningBinomes);
    const { data: binomeRows } = await supabase
      .from("binomes_repos")
      .select("binome_number,employee1_id,employee2_id")
      .eq("mois", monthKey)
      .order("binome_number", { ascending: true })
      .limit(20);
    if (Array.isArray(binomeRows) && binomeRows.length > 0) {
      const mergedBinomes = cloneBinomes(defaultPlanningBinomes);
      binomeRows.forEach((row) => {
        const name1 = employeeNameById.get(String(row.employee1_id));
        const name2 = employeeNameById.get(String(row.employee2_id));
        const index = Number(row.binome_number ?? 0) - 1;
        if (!name1 || !name2 || index < 0) return;

        while (mergedBinomes.length <= index) {
          mergedBinomes.push(["", ""]);
        }
        mergedBinomes[index] = [name1, name2];
      });
      nextBinomes = mergedBinomes;
    }
    didChange = replacePlanningBinomesSnapshot(monthKey, nextBinomes) || didChange;

    const overrides: PlanningOverrides = cloneDefaultPlanningOverrides();
    const planningRows = await fetchAllRows<{
      date: string | null;
      employee_id: string | null;
      statut: string | null;
      horaire_custom: string | null;
    }>((from, to) =>
      supabase
        .from("planning_entries")
        .select("date,employee_id,statut,horaire_custom")
        .range(from, to),
    );
    if (Array.isArray(planningRows) && planningRows.length > 0) {
      planningRows.forEach((row) => {
        const name = employeeNameById.get(String(row.employee_id));
        if (!name || !row.date) return;
        const normalizedStatus = normalizePlanningStatusFromDb(String(row.statut ?? ""));
        if (isAbsencePlanningStatus(normalizedStatus)) return;
        const key = `${name}_${String(row.date)}`;
        const nextEntry = {
          s: normalizedStatus,
          h: row.horaire_custom ?? null,
        };
        if (!shouldKeepPlanningOverrideEntry(name, String(row.date), nextEntry, mappedEmployees)) return;
        overrides[key] = nextEntry;
      });
    }

    const absencesRows = await fetchAllRows<{
      employee_id: string | null;
      type: string | null;
      date_debut: string | null;
      date_fin: string | null;
      statut: string | null;
      note: string | null;
    }>((from, to) =>
      supabase
        .from("absences")
        .select("employee_id,type,date_debut,date_fin,statut,note")
        .eq("statut", "approuve")
        .range(from, to),
    );
    const approvedAbsenceRows = Array.isArray(absencesRows) ? absencesRows : [];
    if (approvedAbsenceRows.length > 0) {
      approvedAbsenceRows.forEach((row) => {
        const baseEmployeeName =
          employeeNameById.get(String(row.employee_id ?? "")) ??
          employeeFromAbsenceNote(row.note);
        if (!baseEmployeeName) return;

        const targetEmployees = baseEmployeeName === "TOUS"
          ? mappedEmployees.filter((employee) => employee.actif).map((employee) => employee.n)
          : [baseEmployeeName];
        const targetDates = listPlanningAbsenceDates(
          String(row.date_debut ?? ""),
          String(row.date_fin ?? row.date_debut ?? ""),
        );
        const planningStatus = getPlanningStatusFromAbsenceType(String(row.type ?? "AUTRE"));

        targetEmployees.forEach((employeeName) => {
          targetDates.forEach((date) => {
            overrides[`${employeeName}_${date}`] = { s: planningStatus, h: null };
          });
        });
      });
    }

    didChange = replacePlanningOverridesSnapshot(overrides) || didChange;

    if (didChange) emitPlanningUpdated();
    setPlanningSyncStatus(monthKey, "success");
    return didChange;
  } catch (error) {
    setPlanningSyncStatus(monthKey, "error", normalizeActionError(error));
    return false;
  }
}

export function loadPlanningOverrides(): PlanningOverrides {
  if (!canUseStorage()) return cloneDefaultPlanningOverrides();
  try {
    purgePlanningLegacyCache();
    return cloneOverrides(planningOverridesSnapshot);
  } catch {
    return cloneDefaultPlanningOverrides();
  }
}

export function savePlanningOverrides(overrides: PlanningOverrides) {
  if (!canUseStorage()) return;
  if (replacePlanningOverridesSnapshot(overrides)) emitPlanningUpdated();
}

export function loadPlanningTriData(monthKey = getPlanningMonthKey(new Date())): PlanningTriData {
  if (!canUseStorage()) return cloneTriData(defaultPlanningTriData);
  try {
    purgePlanningLegacyCache();
    return getPlanningTriSnapshot(monthKey);
  } catch {
    return cloneTriData(defaultPlanningTriData);
  }
}

export function savePlanningTriData(data: PlanningTriData) {
  if (!canUseStorage()) return;
  const monthKey = getPlanningMonthKey(new Date());
  if (replacePlanningTriSnapshot(monthKey, data)) emitPlanningUpdated();
}

export function loadPlanningBinomes(monthKey = getPlanningMonthKey(new Date())): PlanningBinomes {
  if (!canUseStorage()) return cloneBinomes(defaultPlanningBinomes);
  try {
    purgePlanningLegacyCache();
    return getPlanningBinomesSnapshot(monthKey);
  } catch {
    return cloneBinomes(defaultPlanningBinomes);
  }
}

export function savePlanningBinomes(binomes: PlanningBinomes) {
  if (!canUseStorage()) return;
  const monthKey = getPlanningMonthKey(new Date());
  if (replacePlanningBinomesSnapshot(monthKey, binomes)) emitPlanningUpdated();
}

export function loadPlanningHorairePresets() {
  return collectPlanningHorairePresets();
}

function normalizeActionError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : typeof error === "object" && error && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : "Erreur Supabase.";
  const normalized = message.toLowerCase();
  if (
    normalized.includes("row-level security") ||
    normalized.includes("permission denied") ||
    normalized.includes("42501")
  ) {
    return "Action reservee aux managers.";
  }
  if (normalized.includes("jwt") || normalized.includes("not authenticated")) {
    return "Connexion requise.";
  }
  return message || "Erreur Supabase.";
}

async function getEmployeeIdByName(name: string) {
  const normalizedName = String(name || "").trim().toUpperCase();
  const cached = planningEmployees.find((employee) => employee.n === normalizedName && employee.dbId);
  if (cached?.dbId) return cached.dbId;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id,name,type,horaire_standard,horaire_mardi,horaire_samedi,actif")
    .eq("name", normalizedName)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error(`Employe introuvable: ${normalizedName}`);
  return String(data.id);
}

type PlanningOverrideMutation = {
  employeeName: string;
  date: string;
  status: string;
  horaire: string | null;
};

type ResolvedPlanningOverrideMutation = PlanningOverrideMutation & {
  employeeId: string;
};

function buildPlanningUndoLabel(cells: PlanningUndoCell[]) {
  const uniqueNames = Array.from(new Set(cells.map((cell) => cell.employeeName)));
  if (uniqueNames.length === 1) {
    return `Modification planning ${uniqueNames[0]} - ${cells.length} entr${cells.length > 1 ? "ées" : "ée"}`;
  }
  return `Planning modifie - ${cells.length} entr${cells.length > 1 ? "ées" : "ée"}`;
}

async function fetchPlanningEntriesForCells(supabase: ReturnType<typeof createClient>, affectedCells: PlanningUndoCell[]) {
  if (!affectedCells.length) return [];
  const employeeIds = Array.from(new Set(affectedCells.map((cell) => cell.employeeId)));
  const dates = Array.from(new Set(affectedCells.map((cell) => cell.date)));
  const { data, error } = await supabase
    .from("planning_entries")
    .select("id,date,employee_id,statut,horaire_custom")
    .in("employee_id", employeeIds)
    .in("date", dates);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function undoLastPlanningAction(snapshotId?: string) {
  cleanupExpiredPlanningUndo();
  const targetIndex = snapshotId
    ? planningUndoStack.findIndex((snapshot) => snapshot.id === snapshotId)
    : 0;
  if (targetIndex < 0) return null;

  const snapshot = planningUndoStack[targetIndex];
  const nextStack = planningUndoStack.filter((item) => item.id !== snapshot.id);
  replacePlanningUndoStack(nextStack);
  emitPlanningUndoUpdated();

  const supabase = createClient();

  try {
    const currentRows = await fetchPlanningEntriesForCells(supabase, snapshot.affectedCells);
    const currentRowIds = currentRows.map((row) => String(row.id ?? "")).filter(Boolean);
    if (currentRowIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("planning_entries")
        .delete()
        .in("id", currentRowIds);
      if (deleteError) throw deleteError;
    }

    if (snapshot.entries.length > 0) {
      const payload = snapshot.entries.map((entry) => ({
        id: entry.id,
        date: entry.date,
        employee_id: entry.employee_id,
        statut: entry.statut,
        horaire_custom: entry.horaire_custom,
      }));
      const { error: insertError } = await supabase.from("planning_entries").insert(payload);
      if (insertError) throw insertError;
    }

    const touchedMonthKeys = Array.from(
      new Set(
        snapshot.affectedCells.map((cell) => {
          const [year, month] = cell.date.split("-");
          return `${year}-${month}`;
        }),
      ),
    );
    await Promise.all(touchedMonthKeys.map((monthKey) => syncPlanningFromSupabase(monthKey)));
    return snapshot.label;
  } catch (error) {
    const restoredStack = [snapshot, ...planningUndoStack].slice(0, MAX_PLANNING_UNDO);
    replacePlanningUndoStack(restoredStack);
    emitPlanningUndoUpdated();
    throw new Error(normalizeActionError(error));
  }
}

export async function savePlanningOverridesToSupabase(
  mutations: PlanningOverrideMutation[],
  nextOverrides: PlanningOverrides,
) {
  const supabase = createClient();

  try {
    const resolvedMutationsMap = new Map<string, ResolvedPlanningOverrideMutation>();
    for (const mutation of mutations) {
      const employeeId = await getEmployeeIdByName(mutation.employeeName);
      resolvedMutationsMap.set(`${employeeId}_${mutation.date}`, {
        ...mutation,
        employeeId,
      });
    }

    const resolvedMutations = Array.from(resolvedMutationsMap.values());
    const affectedCells = resolvedMutations.map((mutation) => ({
      employeeName: mutation.employeeName,
      employeeId: mutation.employeeId,
      date: mutation.date,
    }));
    const existingRows = await fetchPlanningEntriesForCells(supabase, affectedCells);
    const existingRowsMap = new Map(
      existingRows.map((row) => [`${String(row.employee_id)}_${String(row.date)}`, row]),
    );

    if (affectedCells.length > 1) {
      pushPlanningUndo(buildPlanningUndoLabel(affectedCells), affectedCells, existingRows.map((row) => ({
        id: String(row.id ?? ""),
        date: String(row.date ?? ""),
        employee_id: String(row.employee_id ?? ""),
        statut: row.statut ?? null,
        horaire_custom: row.horaire_custom ?? null,
      })));
    }

    for (const mutation of resolvedMutations) {
      const normalizedStatus = normalizePlanningStatusToDb(mutation.status);
      const existingRow = existingRowsMap.get(`${mutation.employeeId}_${mutation.date}`);

      if (isAbsencePlanningStatus(mutation.status)) {
        if (existingRow?.id) {
          const { error: deleteError } = await supabase
            .from("planning_entries")
            .delete()
            .eq("id", existingRow.id);
          if (deleteError) throw deleteError;
        }
        continue;
      }

      if (!shouldKeepPlanningOverrideEntry(mutation.employeeName, mutation.date, {
        s: mutation.status,
        h: mutation.horaire,
      })) {
        if (existingRow?.id) {
          const { error: deleteError } = await supabase
            .from("planning_entries")
            .delete()
            .eq("id", existingRow.id);
          if (deleteError) throw deleteError;
        }
        continue;
      }

      const payload = {
        date: mutation.date,
        employee_id: mutation.employeeId,
        statut: normalizedStatus,
        horaire_custom: mutation.horaire,
      };

      if (existingRow?.id) {
        const { error: updateError } = await supabase
          .from("planning_entries")
          .update(payload)
          .eq("id", existingRow.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("planning_entries").insert(payload);
        if (insertError) throw insertError;
      }
    }

    replacePlanningOverridesSnapshot(nextOverrides);
    emitPlanningUpdated();
    return cloneOverrides(nextOverrides);
  } catch (error) {
    throw new Error(normalizeActionError(error));
  }
}

export async function savePlanningTriPairToSupabase(
  dayIndex: number,
  pair: [string, string],
  nextTriData: PlanningTriData,
  monthKey = getPlanningMonthKey(new Date()),
) {
  const supabase = createClient();

  try {
    const employee1Id = await getEmployeeIdByName(pair[0]);
    const employee2Id = await getEmployeeIdByName(pair[1]);
    const jourSemaine = dayToCode(dayIndex);
    const { data: existingRow, error: existingError } = await supabase
      .from("tri_caddie")
      .select("id")
      .eq("mois", monthKey)
      .eq("jour_semaine", jourSemaine)
      .maybeSingle();
    if (existingError) throw existingError;

    const payload = {
      mois: monthKey,
      jour_semaine: jourSemaine,
      employee1_id: employee1Id,
      employee2_id: employee2Id,
    };

    if (existingRow?.id) {
      const { error: updateError } = await supabase.from("tri_caddie").update(payload).eq("id", existingRow.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from("tri_caddie").insert(payload);
      if (insertError) throw insertError;
    }

    replacePlanningTriSnapshot(monthKey, nextTriData);
    emitPlanningUpdated();
    return cloneTriData(nextTriData);
  } catch (error) {
    throw new Error(normalizeActionError(error));
  }
}

export async function savePlanningBinomeToSupabase(
  index: number,
  pair: [string, string],
  nextBinomes: PlanningBinomes,
  monthKey = getPlanningMonthKey(new Date()),
) {
  const supabase = createClient();

  try {
    const employee1Id = await getEmployeeIdByName(pair[0]);
    const employee2Id = await getEmployeeIdByName(pair[1]);
    const binomeNumber = index + 1;

    const { data: existingRow, error: existingError } = await supabase
      .from("binomes_repos")
      .select("id")
      .eq("mois", monthKey)
      .eq("binome_number", binomeNumber)
      .maybeSingle();
    if (existingError) throw existingError;

    const payload = {
      mois: monthKey,
      binome_number: binomeNumber,
      employee1_id: employee1Id,
      employee2_id: employee2Id,
    };

    if (existingRow?.id) {
      const { error: updateError } = await supabase.from("binomes_repos").update(payload).eq("id", existingRow.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from("binomes_repos").insert(payload);
      if (insertError) throw insertError;
    }

    replacePlanningBinomesSnapshot(monthKey, nextBinomes);
    emitPlanningUpdated();
    return cloneBinomes(nextBinomes);
  } catch (error) {
    throw new Error(normalizeActionError(error));
  }
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
  const key = `${emp.n}_${formatPlanningDate(date)}`;
  if (overrides[key]) return overrides[key].s;
  return getPlanningDefaultStatus(emp, date);
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
