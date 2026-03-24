import { createClient } from "@/lib/supabase";

export type RhEmployeeType = "M" | "S" | "E";

export type RhEmployee = {
  id: number;
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
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getRhUpdatedEventName() {
  return UPDATED_EVENT;
}

export function emitRhUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(UPDATED_EVENT));
}

export function loadRhEmployees(): RhEmployee[] {
  if (!canUseStorage()) return defaultRhEmployees;
  try {
    const raw = window.localStorage.getItem(EMPLOYEES_KEY);
    if (!raw) return defaultRhEmployees;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultRhEmployees;
    return parsed as RhEmployee[];
  } catch {
    return defaultRhEmployees;
  }
}

export function saveRhEmployees(employees: RhEmployee[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  emitRhUpdated();
}

export function loadRhCycles(): RhCycles {
  if (!canUseStorage()) return defaultRhCycles;
  try {
    const raw = window.localStorage.getItem(CYCLES_KEY);
    if (!raw) return defaultRhCycles;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaultRhCycles;
    return parsed as RhCycles;
  } catch {
    return defaultRhCycles;
  }
}

export function saveRhCycles(cycles: RhCycles) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(CYCLES_KEY, JSON.stringify(cycles));
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

export async function syncRhFromSupabase() {
  if (!canUseStorage()) return false;

  try {
    const supabase = createClient();
    const { data: employeeRows, error: employeeError } = await supabase
      .from("employees")
      .select("id,name,type,horaire_standard,horaire_mardi,horaire_samedi,observation,actif")
      .limit(5000);
    if (employeeError) throw employeeError;
    if (!employeeRows || employeeRows.length === 0) return false;

    const mappedEmployees: RhEmployee[] = employeeRows.map((employee, index) => ({
      id: index + 1,
      n: String(employee.name ?? "").trim().toUpperCase(),
      t: normalizeRhType(String(employee.type ?? "")),
      hs: employee.horaire_standard ?? null,
      hm: employee.horaire_mardi ?? null,
      hsa: employee.horaire_samedi ?? null,
      obs: String(employee.observation ?? ""),
      actif: Boolean(employee.actif),
      photo: null,
    }));
    const nameById = new Map(
      employeeRows.map((employee) => [String(employee.id), String(employee.name ?? "").trim().toUpperCase()]),
    );

    const { data: cycleRows } = await supabase
      .from("cycle_repos")
      .select("employee_id,semaine_cycle,jour_repos")
      .limit(5000);

    const mappedCycles: RhCycles = { ...defaultRhCycles };
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

    window.localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(mappedEmployees));
    window.localStorage.setItem(CYCLES_KEY, JSON.stringify(mappedCycles));
    emitRhUpdated();
    return true;
  } catch {
    return false;
  }
}
