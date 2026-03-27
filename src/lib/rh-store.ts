import { hasBrowserWindow, purgeLegacyCacheKeys, readSessionCache, writeSessionCache } from "@/lib/browser-cache";
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
};

export type RhCycles = Record<string, string[]>;

const EMPLOYEES_KEY = "epicerie.rh.employees.v1";
const CYCLES_KEY = "epicerie.rh.cycles.v1";
const UPDATED_EVENT = "epicerie-rh-updated";

export const defaultRhEmployees: RhEmployee[] = [
  { id: 1, n: "ABDOU", t: "M", hs: "3h50-11h20", hm: "3h00-10h30", hsa: null, obs: "Coordonnateur", actif: true, photo: null },
  { id: 2, n: "CECILE", t: "M", hs: "3h50-11h20", hm: "3h00-10h30", hsa: null, obs: "Employe", actif: true, photo: null },
  { id: 3, n: "KAMAR", t: "M", hs: "3h50-11h20", hm: "3h00-10h30", hsa: null, obs: "Conge maternite", actif: false, photo: null },
  { id: 4, n: "YASSINE", t: "M", hs: "3h50-11h20", hm: "3h00-10h30", hsa: null, obs: "Employe", actif: true, photo: null },
  { id: 5, n: "WASIM", t: "M", hs: "3h50-11h20", hm: "3h00-10h30", hsa: null, obs: "Employe", actif: true, photo: null },
  { id: 6, n: "JEREMY", t: "M", hs: "3h50-11h20", hm: "3h00-10h30", hsa: null, obs: "Employe", actif: true, photo: null },
  { id: 7, n: "KAMEL", t: "M", hs: "3h50-11h20", hm: "3h00-10h30", hsa: null, obs: "Employe", actif: true, photo: null },
  { id: 8, n: "PASCALE", t: "M", hs: "3h50-11h20", hm: "3h00-10h30", hsa: null, obs: "Employe", actif: true, photo: null },
  { id: 9, n: "MOHCINE", t: "M", hs: "3h50-11h20", hm: "3h00-10h30", hsa: null, obs: "Employe", actif: true, photo: null },
  { id: 10, n: "LIYAKATH", t: "M", hs: "3h50-11h20", hm: "3h00-10h30", hsa: null, obs: "Employe", actif: true, photo: null },
  { id: 11, n: "KHANH", t: "M", hs: "3h50-11h20", hm: "3h00-10h30", hsa: null, obs: "Employe", actif: true, photo: null },
  { id: 12, n: "ROSALIE", t: "M", hs: "3h50-11h20", hm: "3h00-10h30", hsa: null, obs: "Employe", actif: true, photo: null },
  { id: 13, n: "JAMAA", t: "M", hs: "3h50-11h20", hm: "3h00-10h30", hsa: null, obs: "Employe", actif: true, photo: null },
  { id: 14, n: "EL HASSANE", t: "M", hs: "3h50-11h20", hm: "3h00-10h30", hsa: null, obs: "Employe", actif: true, photo: null },
  { id: 15, n: "MASSIMO", t: "S", hs: "14h-21h30", hm: "12h-19h30", hsa: null, obs: "Employe", actif: true, photo: null },
  { id: 16, n: "DILAXSHAN", t: "S", hs: "14h-21h30", hm: "12h-19h30", hsa: null, obs: "Employe", actif: true, photo: null },
  { id: 17, n: "YLEANA", t: "E", hs: null, hm: null, hsa: "14h-21h30", obs: "Etudiant samedi", actif: true, photo: null },
  { id: 18, n: "MOUNIR", t: "E", hs: null, hm: null, hsa: "14h-21h30", obs: "Etudiant samedi", actif: true, photo: null },
  { id: 19, n: "MAHIN", t: "E", hs: null, hm: null, hsa: "14h-21h30", obs: "Etudiant samedi", actif: true, photo: null },
  { id: 20, n: "MOHAMED", t: "E", hs: null, hm: null, hsa: "14h-21h30", obs: "Etudiant samedi", actif: true, photo: null },
  { id: 21, n: "ACHRAF", t: "E", hs: null, hm: null, hsa: "14h-21h30", obs: "Etudiant samedi", actif: true, photo: null },
];

export const defaultRhCycles: RhCycles = {
  ABDOU: ["VEN", "VEN", "VEN", "VEN", "VEN"],
  CECILE: ["MER", "MER", "MER", "MER", "SAM"],
  MASSIMO: ["JEU", "JEU", "JEU", "JEU", "JEU"],
  DILAXSHAN: ["SAM", "MER", "MER", "MER", "MER"],
  KAMAR: ["MAR", "MAR", "MAR", "MAR", "MAR"],
  YASSINE: ["JEU", "JEU", "JEU", "JEU", "SAM"],
  WASIM: ["VEN", "VEN", "SAM", "VEN", "VEN"],
  JEREMY: ["VEN", "VEN", "VEN", "SAM", "VEN"],
  KAMEL: ["SAM", "MAR", "MAR", "MAR", "MAR"],
  PASCALE: ["SAM", "LUN", "LUN", "LUN", "LUN"],
  MOHCINE: ["MER", "MER", "MER", "SAM", "MER"],
  LIYAKATH: ["LUN", "LUN", "SAM", "LUN", "LUN"],
  KHANH: ["JEU", "JEU", "JEU", "JEU", "SAM"],
  ROSALIE: ["JEU", "SAM", "JEU", "JEU", "JEU"],
  JAMAA: ["MER", "MER", "SAM", "MER", "MER"],
  "EL HASSANE": ["VEN", "SAM", "VEN", "VEN", "VEN"],
};

function canUseStorage() {
  return hasBrowserWindow();
}

function cloneEmployees(employees: RhEmployee[]) {
  return employees.map((employee) => ({ ...employee, rayons: employee.rayons ? [...employee.rayons] : undefined }));
}

function cloneCycles(cycles: RhCycles) {
  return Object.fromEntries(Object.entries(cycles).map(([name, cycle]) => [name, [...cycle]]));
}

function isRhEmployee(value: unknown): value is RhEmployee {
  if (!value || typeof value !== "object") return false;
  const employee = value as Record<string, unknown>;
  return (
    typeof employee.id === "number" &&
    typeof employee.n === "string" &&
    (employee.t === "M" || employee.t === "S" || employee.t === "E") &&
    (typeof employee.hs === "string" || employee.hs === null) &&
    (typeof employee.hm === "string" || employee.hm === null) &&
    (typeof employee.hsa === "string" || employee.hsa === null) &&
    typeof employee.obs === "string" &&
    typeof employee.actif === "boolean" &&
    (typeof employee.photo === "string" || employee.photo === null || typeof employee.photo === "undefined")
  );
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
  },
  index: number,
  photos?: { byDbId: Map<string, string | null>; byName: Map<string, string | null> },
): RhEmployee {
  const normalizedName = String(employee.name ?? "").trim().toUpperCase();
  const photo =
    photos?.byDbId.get(String(employee.id)) ??
    photos?.byName.get(normalizedName) ??
    null;

  return {
    id: index + 1,
    dbId: String(employee.id),
    n: normalizedName,
    t: normalizeRhType(String(employee.type ?? "")),
    hs: employee.horaire_standard ?? null,
    hm: employee.horaire_mardi ?? null,
    hsa: employee.horaire_samedi ?? null,
    obs: String(employee.observation ?? ""),
    actif: Boolean(employee.actif),
    photo,
  };
}

function writeRhCache(employees: RhEmployee[], cycles: RhCycles) {
  if (!canUseStorage()) return;
  writeSessionCache(EMPLOYEES_KEY, employees);
  writeSessionCache(CYCLES_KEY, cycles);
  emitRhUpdated();
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
    const parsed = readSessionCache<unknown[]>(EMPLOYEES_KEY);
    if (!parsed) return cloneEmployees(defaultRhEmployees);
    if (!Array.isArray(parsed)) return cloneEmployees(defaultRhEmployees);
    const sanitized = parsed.filter(isRhEmployee);
    return sanitized.length || parsed.length === 0 ? cloneEmployees(sanitized) : cloneEmployees(defaultRhEmployees);
  } catch {
    return cloneEmployees(defaultRhEmployees);
  }
}

export function saveRhEmployees(employees: RhEmployee[]) {
  if (!canUseStorage()) return;
  writeSessionCache(EMPLOYEES_KEY, employees);
  emitRhUpdated();
}

export function loadRhCycles(): RhCycles {
  if (!canUseStorage()) return cloneCycles(defaultRhCycles);
  try {
    purgeLegacyCacheKeys([CYCLES_KEY]);
    const parsed = readSessionCache<Record<string, string[]>>(CYCLES_KEY);
    if (!parsed) return cloneCycles(defaultRhCycles);
    if (!parsed || typeof parsed !== "object") return cloneCycles(defaultRhCycles);
    return cloneCycles(parsed as RhCycles);
  } catch {
    return cloneCycles(defaultRhCycles);
  }
}

export function saveRhCycles(cycles: RhCycles) {
  if (!canUseStorage()) return;
  writeSessionCache(CYCLES_KEY, cycles);
  emitRhUpdated();
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
      .select("id,name,type,horaire_standard,horaire_mardi,horaire_samedi,observation,actif")
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
  writeSessionCache(CYCLES_KEY, nextCycles);
  emitRhUpdated();
}

export async function createRhEmployeeInSupabase(
  employee: Omit<RhEmployee, "id"> & { cycle?: string[] },
): Promise<RhEmployee> {
  const supabase = createClient();
  const payload = {
    name: employee.n.trim().toUpperCase(),
    type: normalizeRhTypeToDb(employee.t),
    horaire_standard: employee.hs,
    horaire_mardi: employee.hm,
    horaire_samedi: employee.hsa,
    observation: employee.obs,
    actif: employee.actif,
  };

  try {
    const { data: insertedEmployee, error: insertError } = await supabase
      .from("employees")
      .insert(payload)
      .select("id,name,type,horaire_standard,horaire_mardi,horaire_samedi,observation,actif")
      .single();
    if (insertError) throw insertError;

    const cycle = Array.isArray(employee.cycle) ? employee.cycle : [];
    if (cycle.length) {
      const cyclePayload = cycle.map((jour, index) => ({
        employee_id: insertedEmployee.id,
        semaine_cycle: index + 1,
        jour_repos: jour,
      }));
      const { error: cycleError } = await supabase.from("cycle_repos").insert(cyclePayload);
      if (cycleError) throw cycleError;
    }

    const nextEmployee = {
      ...mapEmployeeRowToRhEmployee(insertedEmployee, loadRhEmployees().length, getPhotoLookup(loadRhEmployees())),
      photo: employee.photo ?? null,
    };
    const employees = [...loadRhEmployees(), nextEmployee];
    const cycles = loadRhCycles();
    if (cycle.length) cycles[nextEmployee.n] = [...cycle];
    writeRhCache(employees, cycles);
    return nextEmployee;
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
    observation: employee.obs,
    actif: employee.actif,
  };

  try {
    const { data: updatedEmployee, error } = await supabase
      .from("employees")
      .update(payload)
      .eq("id", employee.dbId)
      .select("id,name,type,horaire_standard,horaire_mardi,horaire_samedi,observation,actif")
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
