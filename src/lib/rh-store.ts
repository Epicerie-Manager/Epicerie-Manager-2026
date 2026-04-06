import { hasBrowserWindow, purgeLegacyCacheKeys } from "@/lib/browser-cache";
import { getRhEmployeeRoleLabel } from "@/lib/rh-status";
import { createClient } from "@/lib/supabase";

export type RhEmployeeType = "M" | "S" | "E";

export type RhEmployee = {
  id: number;
  dbId?: string;
  n: string;
  t: RhEmployeeType;
  hs: string | null;
  hm: string | null;
  hsa: string | null;
  obs: string;
  actif: boolean;
  photo: string | null;
  rayons?: string[];
  ruptures_rayons?: number[];
};

export type CreateRhEmployeeResult = {
  employee: RhEmployee;
  email: string;
  initialPin: string;
};

export type RhCycles = Record<string, string[]>;

const EMPLOYEES_KEY = "epicerie.rh.employees.v1";
const CYCLES_KEY = "epicerie.rh.cycles.v1";
const UPDATED_EVENT = "epicerie-rh-updated";

export const defaultRhEmployees: RhEmployee[] = [];

export const defaultRhCycles: RhCycles = {};

let rhEmployeesSnapshot = cloneEmployees(defaultRhEmployees);
let rhEmployeesSerialized = JSON.stringify(rhEmployeesSnapshot);
let rhCyclesSnapshot = cloneCycles(defaultRhCycles);
let rhCyclesSerialized = JSON.stringify(rhCyclesSnapshot);

function canUseStorage() {
  return hasBrowserWindow();
}

function cloneEmployees(employees: RhEmployee[]) {
  return employees.map((employee) => ({
    ...employee,
    obs: getRhEmployeeRoleLabel(employee.obs, employee.t),
    rayons: employee.rayons ? [...employee.rayons] : undefined,
  }));
}

function cloneCycles(cycles: RhCycles) {
  return Object.fromEntries(Object.entries(cycles).map(([name, cycle]) => [name, [...cycle]]));
}

function replaceRhEmployeesSnapshot(employees: RhEmployee[]) {
  const nextEmployees = cloneEmployees(employees);
  const serialized = JSON.stringify(nextEmployees);
  if (serialized === rhEmployeesSerialized) return false;
  rhEmployeesSnapshot = nextEmployees;
  rhEmployeesSerialized = serialized;
  return true;
}

function replaceRhCyclesSnapshot(cycles: RhCycles) {
  const nextCycles = cloneCycles(cycles);
  const serialized = JSON.stringify(nextCycles);
  if (serialized === rhCyclesSerialized) return false;
  rhCyclesSnapshot = nextCycles;
  rhCyclesSerialized = serialized;
  return true;
}

function normalizeRhTypeToDb(value: RhEmployeeType) {
  if (value === "S") return "APRES-MIDI";
  if (value === "E") return "ETUDIANT";
  return "MATIN";
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
  if (normalized.includes("cycle_repos_semaine_cycle_check")) {
    return "La base Supabase n'accepte encore que 2 semaines de cycle. Il faut appliquer le patch SQL cycle_repos 5 semaines.";
  }
  if (normalized.includes("jwt") || normalized.includes("not authenticated")) {
    return "Connexion requise.";
  }
  return message || "Erreur Supabase.";
}

function normalizeEmployeeRayons(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const rayons = value
    .map((item) => String(item ?? "").trim().toUpperCase())
    .filter(Boolean);
  if (!rayons.length) return [];
  return Array.from(new Set(rayons)).sort((a, b) => a.localeCompare(b, "fr"));
}

function normalizeEmployeeRuptureRayons(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item)),
  )).sort((a, b) => a - b);
}

function getPhotoLookup(employees: RhEmployee[]) {
  const byDbId = new Map<string, string | null>();
  const byName = new Map<string, string | null>();
  employees.forEach((employee) => {
    if (typeof employee.dbId === "string") byDbId.set(employee.dbId, employee.photo ?? null);
    byName.set(employee.n, employee.photo ?? null);
  });
  return { byDbId, byName };
}

function mapEmployeeRowToRhEmployee(
  employee: {
    id: string;
    name: string | null;
    type: string | null;
    horaire_standard: string | null;
    horaire_mardi: string | null;
    horaire_samedi: string | null;
    observation: string | null;
    actif: boolean | null;
    tg_rayons?: string[] | null;
    ruptures_rayons?: number[] | null;
  },
  index: number,
  photos?: { byDbId: Map<string, string | null>; byName: Map<string, string | null> },
): RhEmployee {
  const normalizedName = String(employee.name ?? "").trim().toUpperCase();
  const photo =
    photos?.byDbId.get(String(employee.id)) ??
    photos?.byName.get(normalizedName) ??
    null;
  const normalizedType = normalizeRhType(String(employee.type ?? ""));

  return {
    id: index + 1,
    dbId: String(employee.id),
    n: normalizedName,
    t: normalizedType,
    hs: employee.horaire_standard ?? null,
    hm: employee.horaire_mardi ?? null,
    hsa: employee.horaire_samedi ?? null,
    obs: getRhEmployeeRoleLabel(String(employee.observation ?? ""), normalizedType),
    actif: Boolean(employee.actif),
    photo,
    rayons: normalizeEmployeeRayons(employee.tg_rayons),
    ruptures_rayons: normalizeEmployeeRuptureRayons(employee.ruptures_rayons),
  };
}

function writeRhCache(employees: RhEmployee[], cycles: RhCycles) {
  if (!canUseStorage()) return;
  const employeesChanged = replaceRhEmployeesSnapshot(employees);
  const cyclesChanged = replaceRhCyclesSnapshot(cycles);
  if (employeesChanged || cyclesChanged) emitRhUpdated();
}

export function getRhUpdatedEventName() {
  return UPDATED_EVENT;
}

export function emitRhUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(UPDATED_EVENT));
}

export function loadRhEmployees(): RhEmployee[] {
  if (!canUseStorage()) return cloneEmployees(defaultRhEmployees);
  try {
    purgeLegacyCacheKeys([EMPLOYEES_KEY]);
    return cloneEmployees(rhEmployeesSnapshot);
  } catch {
    return cloneEmployees(defaultRhEmployees);
  }
}

export function saveRhEmployees(employees: RhEmployee[]) {
  if (!canUseStorage()) return;
  if (replaceRhEmployeesSnapshot(employees)) emitRhUpdated();
}

export function loadRhCycles(): RhCycles {
  if (!canUseStorage()) return cloneCycles(defaultRhCycles);
  try {
    purgeLegacyCacheKeys([CYCLES_KEY]);
    return cloneCycles(rhCyclesSnapshot);
  } catch {
    return cloneCycles(defaultRhCycles);
  }
}

export function saveRhCycles(cycles: RhCycles) {
  if (!canUseStorage()) return;
  if (replaceRhCyclesSnapshot(cycles)) emitRhUpdated();
}

export function getRhEmployeeNames(options?: { activeOnly?: boolean }) {
  const activeOnly = options?.activeOnly ?? false;
  return loadRhEmployees()
    .filter((employee) => (activeOnly ? employee.actif : true))
    .map((employee) => employee.n)
    .sort((a, b) => a.localeCompare(b));
}

function normalizeRhType(value: string): RhEmployeeType {
  const upper = String(value || "").toUpperCase();
  if (upper.includes("APRES")) return "S";
  if (upper.includes("ETUD")) return "E";
  return "M";
}

async function getEmployeeDbIdByName(name: string) {
  const normalizedName = String(name || "").trim().toUpperCase();
  const cached = loadRhEmployees().find((employee) => employee.n === normalizedName && employee.dbId);
  if (cached?.dbId) return cached.dbId;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("name", normalizedName)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error(`Employe introuvable: ${normalizedName}`);
  return String(data.id);
}

export async function syncRhFromSupabase() {
  if (!canUseStorage()) return false;

  try {
    const supabase = createClient();
    const cachedEmployees = loadRhEmployees();
    const cachedCycles = loadRhCycles();
    const photos = getPhotoLookup(cachedEmployees);
    const { data: employeeRows, error: employeeError } = await supabase
      .from("employees")
      .select("id,name,type,horaire_standard,horaire_mardi,horaire_samedi,observation,actif,tg_rayons,ruptures_rayons")
      .limit(5000);
    if (employeeError) throw employeeError;
    const mappedEmployees: RhEmployee[] = (employeeRows ?? []).map((employee, index) =>
      mapEmployeeRowToRhEmployee(employee, index, photos),
    );
    const nameById = new Map(
      (employeeRows ?? []).map((employee) => [String(employee.id), String(employee.name ?? "").trim().toUpperCase()]),
    );

    const { data: cycleRows } = await supabase
      .from("cycle_repos")
      .select("employee_id,semaine_cycle,jour_repos")
      .limit(5000);

    const mappedCycles: RhCycles = {};
    mappedEmployees.forEach((employee) => {
      mappedCycles[employee.n] = [
        ...(cachedCycles[employee.n] ?? defaultRhCycles[employee.n] ?? ["LUN", "LUN", "LUN", "LUN", "LUN"]),
      ].slice(0, 5);
      while (mappedCycles[employee.n].length < 5) {
        mappedCycles[employee.n].push("LUN");
      }
    });
    if (Array.isArray(cycleRows)) {
      cycleRows.forEach((row) => {
        const name = nameById.get(String(row.employee_id));
        if (!name) return;
        const current = mappedCycles[name] ? [...mappedCycles[name]] : ["LUN", "LUN", "LUN", "LUN", "LUN"];
        const idx = Number(row.semaine_cycle) - 1;
        if (idx >= 0 && idx < 5) current[idx] = String(row.jour_repos ?? "LUN").toUpperCase();
        mappedCycles[name] = current;
      });
    }
    mappedEmployees.forEach((employee) => {
      const current = mappedCycles[employee.n] ?? [];
      mappedCycles[employee.n] = Array.from({ length: 5 }, (_, index) => String(current[index] ?? "LUN").toUpperCase());
    });

    writeRhCache(mappedEmployees, mappedCycles);
    return true;
  } catch {
    return false;
  }
}

export function renameRhCycleCache(previousName: string, nextName: string) {
  if (!canUseStorage() || !previousName || !nextName || previousName === nextName) return;
  const cycles = loadRhCycles();
  const existing = cycles[previousName];
  if (!existing) return;
  const nextCycles = { ...cycles };
  delete nextCycles[previousName];
  nextCycles[nextName] = existing;
  if (replaceRhCyclesSnapshot(nextCycles)) emitRhUpdated();
}

export async function createRhEmployeeInSupabase(
  employee: Omit<RhEmployee, "id"> & { cycle?: string[] },
): Promise<CreateRhEmployeeResult> {
  try {
    const response = await fetch("/api/manager/create-collaborator", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(employee),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      email?: string;
      initialPin?: string;
      employee?: {
        id: string;
        name: string | null;
        type: string | null;
        horaire_standard: string | null;
        horaire_mardi: string | null;
        horaire_samedi: string | null;
        observation: string | null;
        actif: boolean | null;
        tg_rayons?: string[] | null;
        ruptures_rayons?: number[] | null;
      };
    };

    if (!response.ok || !payload.employee) {
      throw new Error(payload.error || "Erreur Supabase.");
    }

    const cycle = Array.isArray(employee.cycle) ? employee.cycle : [];
    const nextEmployee = {
      ...mapEmployeeRowToRhEmployee(payload.employee, loadRhEmployees().length, getPhotoLookup(loadRhEmployees())),
      photo: employee.photo ?? null,
    };
    const employees = [...loadRhEmployees(), nextEmployee];
    const cycles = loadRhCycles();
    if (cycle.length) cycles[nextEmployee.n] = [...cycle];
    writeRhCache(employees, cycles);

    return {
      employee: nextEmployee,
      email: String(payload.email ?? "").trim(),
      initialPin: String(payload.initialPin ?? "000000").trim() || "000000",
    };
  } catch (error) {
    throw new Error(normalizeActionError(error));
  }
}

export async function updateRhEmployeeInSupabase(employee: RhEmployee): Promise<RhEmployee> {
  if (!employee.dbId) throw new Error("Employe non synchronise.");
  const supabase = createClient();
  const payload = {
    name: employee.n.trim().toUpperCase(),
    type: normalizeRhTypeToDb(employee.t),
    horaire_standard: employee.hs,
    horaire_mardi: employee.hm,
    horaire_samedi: employee.hsa,
    observation: getRhEmployeeRoleLabel(employee.obs, employee.t),
    actif: employee.actif,
    tg_rayons: normalizeEmployeeRayons(employee.rayons) ?? [],
    ruptures_rayons: normalizeEmployeeRuptureRayons(employee.ruptures_rayons),
  };

  try {
      const { data: updatedEmployee, error } = await supabase
        .from("employees")
        .update(payload)
        .eq("id", employee.dbId)
        .select("id,name,type,horaire_standard,horaire_mardi,horaire_samedi,observation,actif,tg_rayons,ruptures_rayons")
        .single();
    if (error) throw error;

    const cachedEmployees = loadRhEmployees();
    const photos = getPhotoLookup(cachedEmployees);
    const currentIndex = Math.max(
      cachedEmployees.findIndex((item) => item.dbId === employee.dbId),
      0,
    );
    const nextEmployee = {
      ...mapEmployeeRowToRhEmployee(updatedEmployee, currentIndex, photos),
      id: employee.id,
      photo: employee.photo ?? null,
      rayons: employee.rayons ? [...employee.rayons] : undefined,
    };
    const nextEmployees = cachedEmployees.map((item) => (item.dbId === employee.dbId ? nextEmployee : item));
    writeRhCache(nextEmployees, loadRhCycles());
    return nextEmployee;
  } catch (error) {
    throw new Error(normalizeActionError(error));
  }
}

export async function saveRhCycleInSupabase(employee: RhEmployee, cycle: string[]): Promise<string[]> {
  const supabase = createClient();
  const employeeDbId = employee.dbId ?? await getEmployeeDbIdByName(employee.n);
  const paddedCycle = Array.from({ length: 5 }, (_, index) => cycle[index] ?? "LUN");
  const normalizedCycle = paddedCycle.map((jour) => String(jour || "LUN").toUpperCase());

  try {
    const { error: deleteError } = await supabase.from("cycle_repos").delete().eq("employee_id", employeeDbId);
    if (deleteError) throw deleteError;

    if (normalizedCycle.length) {
      const payload = normalizedCycle.map((jour, index) => ({
        employee_id: employeeDbId,
        semaine_cycle: index + 1,
        jour_repos: jour,
      }));
      const { error: insertError } = await supabase.from("cycle_repos").insert(payload);
      if (insertError) throw insertError;
    }

    const cycles = loadRhCycles();
    cycles[employee.n] = normalizedCycle;
    writeRhCache(loadRhEmployees(), cycles);
    return normalizedCycle;
  } catch (error) {
    throw new Error(normalizeActionError(error));
  }
}
