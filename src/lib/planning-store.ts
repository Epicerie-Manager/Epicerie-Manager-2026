import {
  sheetPlanningBinomes,
  sheetPlanningCycle,
  sheetPlanningEmployees,
  sheetPlanningOverrides,
} from "@/lib/planning-sheet-data";
import {
  hasBrowserWindow,
  purgeLegacyCacheByPrefixes,
  purgeLegacyCacheKeys,
  readSessionCache,
  writeSessionCache,
} from "@/lib/browser-cache";
import { createClient } from "@/lib/supabase";

export type PlanningOverrideEntry = {
  s: string;
  h: string | null;
};

export type PlanningOverrides = Record<string, PlanningOverrideEntry>;
export type PlanningTriData = Record<number, [string, string]>;
export type PlanningBinomes = [string, string][];

export type PlanningEmployee = {
  dbId?: string;
  n: string;
  t: "M" | "S" | "E";
  hs: string | null;
  hm: string | null;
  actif: boolean;
};

const PLANNING_OVERRIDES_KEY = "epicerie-manager-planning-overrides-v2";
const PLANNING_TRI_KEY_PREFIX = "epicerie-manager-planning-tri-v1";
const PLANNING_BINOMES_KEY_PREFIX = "epicerie-manager-planning-binomes-v1";
const PLANNING_UPDATED_EVENT = "epicerie-manager:planning-updated";

export let planningEmployees: PlanningEmployee[] = sheetPlanningEmployees;

let cycle: Record<string, string[]> = sheetPlanningCycle;

export const defaultPlanningTriData: PlanningTriData = {
  1: ["CECILE", "WASIM"],
  2: ["ROSALIE", "JAMAA"],
  3: ["JEREMY", "KAMEL"],
  4: ["EL HASSANE", "LIYAKATH"],
  5: ["KHANH", "YASSINE"],
  6: ["MOHCINE", "PASCALE"],
};

export const defaultPlanningBinomes: PlanningBinomes = sheetPlanningBinomes;

function isAbsencePlanningStatus(status: string) {
  const upper = String(status ?? "").toUpperCase().trim();
  return ["ABS", "ABSENT", "CP", "MAL", "CONGE_MAT", "FERIE", "FORM", "X"].includes(upper);
}

function getPlanningDefaultHoraire(employee: PlanningEmployee, date: Date) {
  const dow = date.getDay();
  if (dow === 2) return employee.hm;
  if (dow === 6 && employee.t === "E") return "14h-21h30";
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

function parsePlanningOverrideKey(key: string) {
  const match = key.match(/^(.*)_(\d{4}-\d{2}-\d{2})$/);
  if (!match) return null;
  return {
    employeeName: match[1],
    date: match[2],
  };
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

function buildPlanningBaseOverrides(source: PlanningOverrides) {
  return Object.fromEntries(
    Object.entries(source)
      .filter(([key, value]) => {
        if (isAbsencePlanningStatus(value.s)) return false;
        const parsed = parsePlanningOverrideKey(key);
        if (!parsed) return true;
        return shouldKeepPlanningOverrideEntry(parsed.employeeName, parsed.date, value, sheetPlanningEmployees);
      })
      .map(([key, value]) => [key, { ...value }]),
  ) as PlanningOverrides;
}

export const defaultPlanningOverrides: PlanningOverrides = buildPlanningBaseOverrides(sheetPlanningOverrides);

function cloneTriData(data: PlanningTriData): PlanningTriData {
  return Object.fromEntries(
    Object.entries(data).map(([key, pair]) => [Number(key), [pair[0], pair[1]] as [string, string]]),
  ) as PlanningTriData;
}

function cloneBinomes(binomes: PlanningBinomes): PlanningBinomes {
  return binomes.map((pair) => [pair[0], pair[1]]) as PlanningBinomes;
}

function canUseStorage() {
  return hasBrowserWindow();
}

export function getPlanningMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getPlanningTriStorageKey(monthKey: string) {
  return `${PLANNING_TRI_KEY_PREFIX}:${monthKey}`;
}

function getPlanningBinomesStorageKey(monthKey: string) {
  return `${PLANNING_BINOMES_KEY_PREFIX}:${monthKey}`;
}

function cloneOverrides(overrides: PlanningOverrides) {
  return Object.fromEntries(
    Object.entries(overrides).map(([key, value]) => [key, { ...value }]),
  ) as PlanningOverrides;
}

function cloneDefaultPlanningOverrides() {
  return cloneOverrides(defaultPlanningOverrides);
}

export function getPlanningUpdatedEventName() {
  return PLANNING_UPDATED_EVENT;
}

function emitPlanningUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PLANNING_UPDATED_EVENT));
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

  try {
    const supabase = createClient();

    const { data: employeeRows, error: employeeError } = await supabase
      .from("employees")
      .select("id,name,type,horaire_standard,horaire_mardi,actif")
      .limit(5000);
    if (employeeError) throw employeeError;
    if (!employeeRows || employeeRows.length === 0) return false;

    const mappedEmployees: PlanningEmployee[] = employeeRows.map((employee) => ({
      dbId: String(employee.id),
      n: String(employee.name ?? "").trim().toUpperCase(),
      t: normalizeRhType(String(employee.type ?? "")),
      hs: employee.horaire_standard ?? null,
      hm: employee.horaire_mardi ?? null,
      actif: Boolean(employee.actif),
    }));
    planningEmployees = mappedEmployees;
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
        cycle = { ...cycle, ...nextCycle };
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
    writeSessionCache(getPlanningTriStorageKey(monthKey), nextTriData);

    let nextBinomes = cloneBinomes(defaultPlanningBinomes);
    const { data: binomeRows } = await supabase
      .from("binomes_repos")
      .select("binome_number,employee1_id,employee2_id")
      .eq("mois", monthKey)
      .order("binome_number", { ascending: true })
      .limit(20);
    if (Array.isArray(binomeRows) && binomeRows.length > 0) {
      const binomes: PlanningBinomes = binomeRows
        .map((row) => {
          const name1 = employeeNameById.get(String(row.employee1_id));
          const name2 = employeeNameById.get(String(row.employee2_id));
          if (!name1 || !name2) return null;
          return [name1, name2] as [string, string];
        })
        .filter((row): row is [string, string] => Boolean(row));
      if (binomes.length > 0) {
        nextBinomes = cloneBinomes(binomes);
      }
    }
    writeSessionCache(getPlanningBinomesStorageKey(monthKey), nextBinomes);

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
        .gte("date", "2026-01-01")
        .lte("date", "2026-12-31")
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
        .eq("statut", "APPROUVE")
        .range(from, to),
    );
    if (Array.isArray(absencesRows) && absencesRows.length > 0) {
      absencesRows.forEach((row) => {
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

    writeSessionCache(PLANNING_OVERRIDES_KEY, overrides);

    emitPlanningUpdated();
    return true;
  } catch {
    return false;
  }
}

export function loadPlanningOverrides(): PlanningOverrides {
  if (!canUseStorage()) return cloneDefaultPlanningOverrides();
  try {
    purgePlanningLegacyCache();
    const parsed = readSessionCache<PlanningOverrides>(PLANNING_OVERRIDES_KEY);
    if (!parsed) return cloneDefaultPlanningOverrides();
    if (!parsed || typeof parsed !== "object") return cloneDefaultPlanningOverrides();
    return { ...cloneDefaultPlanningOverrides(), ...(parsed as PlanningOverrides) };
  } catch {
    return cloneDefaultPlanningOverrides();
  }
}

export function savePlanningOverrides(overrides: PlanningOverrides) {
  if (!canUseStorage()) return;
  writeSessionCache(PLANNING_OVERRIDES_KEY, overrides);
  emitPlanningUpdated();
}

export function loadPlanningTriData(monthKey = getPlanningMonthKey(new Date())): PlanningTriData {
  if (!canUseStorage()) return cloneTriData(defaultPlanningTriData);
  try {
    purgePlanningLegacyCache();
    const parsed = readSessionCache<Record<string, unknown>>(getPlanningTriStorageKey(monthKey));
    if (!parsed) return cloneTriData(defaultPlanningTriData);
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
  writeSessionCache(getPlanningTriStorageKey(getPlanningMonthKey(new Date())), data);
  emitPlanningUpdated();
}

export function loadPlanningBinomes(monthKey = getPlanningMonthKey(new Date())): PlanningBinomes {
  if (!canUseStorage()) return cloneBinomes(defaultPlanningBinomes);
  try {
    purgePlanningLegacyCache();
    const parsed = readSessionCache<unknown[]>(getPlanningBinomesStorageKey(monthKey));
    if (!parsed) return cloneBinomes(defaultPlanningBinomes);
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
  writeSessionCache(getPlanningBinomesStorageKey(getPlanningMonthKey(new Date())), binomes);
  emitPlanningUpdated();
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
    .select("id,name,type,horaire_standard,horaire_mardi,actif")
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

export async function savePlanningOverridesToSupabase(
  mutations: PlanningOverrideMutation[],
  nextOverrides: PlanningOverrides,
) {
  const supabase = createClient();

  try {
    for (const mutation of mutations) {
      const employeeId = await getEmployeeIdByName(mutation.employeeName);
      const normalizedStatus = normalizePlanningStatusToDb(mutation.status);

      const { data: existingRow, error: existingError } = await supabase
        .from("planning_entries")
        .select("id")
        .eq("date", mutation.date)
        .eq("employee_id", employeeId)
        .maybeSingle();
      if (existingError) throw existingError;

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
        employee_id: employeeId,
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

    writeSessionCache(PLANNING_OVERRIDES_KEY, nextOverrides);
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

    writeSessionCache(getPlanningTriStorageKey(monthKey), nextTriData);
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

    writeSessionCache(getPlanningBinomesStorageKey(monthKey), nextBinomes);
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
