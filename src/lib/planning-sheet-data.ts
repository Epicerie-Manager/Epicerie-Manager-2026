import rawPlanningData from "@/data/planning_data_2026.json";

type RawEmployee = {
  name: string;
  type: "M" | "S" | "E";
  horaire_standard: string | null;
  horaire_mardi: string | null;
  horaire_samedi?: string | null;
  actif: boolean;
};

type RawPlanningDay = {
  date: string;
  cells: Record<string, string>;
};

type RawPlanningData = {
  employees: RawEmployee[];
  cycle_repos: Record<string, string[]>;
  binomes_repos: string[][];
  planning: Record<string, RawPlanningDay[]>;
};

export type SheetPlanningEmployee = {
  n: string;
  t: "M" | "S" | "E";
  hs: string | null;
  hm: string | null;
  hsa?: string | null;
  actif: boolean;
};

type OverrideEntry = {
  s: string;
  h: string | null;
};

const data = rawPlanningData as unknown as RawPlanningData;
const TEMPLATE_MONTH_PREFIXES = ["OCTOBRE", "NOVEMBRE", "DECEMBRE"];

function normalizeName(name: string) {
  return name.trim().replace(/\?+$/, "").trim();
}

function normalizeCellValue(value: string) {
  return value.trim();
}

function normalizeForMatch(value: string) {
  return normalizeCellValue(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function isScheduleValue(value: string) {
  const upper = normalizeForMatch(value);
  return upper.includes("H") && upper.includes("-");
}

function mapCellToOverride(value: string): OverrideEntry | null {
  const clean = normalizeCellValue(value);
  if (!clean || clean === "#N/A") return null;

  const upper = normalizeForMatch(clean);
  if (upper === "RH") return { s: "RH", h: null };
  if (upper === "CP") return { s: "CP", h: null };
  if (upper === "FERIE") return { s: "FERIE", h: null };
  if (upper === "X") return { s: "X", h: null };
  if (upper.includes("CONGE MATERNITE")) return { s: "CONGE_MAT", h: null };
  if (upper.includes("MAL")) return { s: "MAL", h: null };
  if (isScheduleValue(clean)) return { s: "PRESENT", h: clean };
  return null;
}

export const sheetPlanningEmployees: SheetPlanningEmployee[] = data.employees.map((employee) => ({
  n: normalizeName(employee.name),
  t: employee.type,
  hs: employee.horaire_standard,
  hm: employee.horaire_mardi,
  hsa: employee.horaire_samedi ?? null,
  actif: employee.actif,
}));

export const sheetPlanningCycle: Record<string, string[]> = Object.fromEntries(
  Object.entries(data.cycle_repos).map(([name, cycle]) => [normalizeName(name), cycle]),
);

export const sheetPlanningBinomes = data.binomes_repos
  .filter((pair) => Array.isArray(pair) && pair.length >= 2)
  .map((pair) => [normalizeName(pair[0]), normalizeName(pair[1])] as [string, string]);

const employeeSet = new Set(sheetPlanningEmployees.map((employee) => employee.n));

export const sheetPlanningOverrides: Record<string, OverrideEntry> = (() => {
  const overrides: Record<string, OverrideEntry> = {};

  Object.entries(data.planning).forEach(([monthLabel, monthDays]) => {
    const normalizedLabel = normalizeForMatch(monthLabel);
    if (TEMPLATE_MONTH_PREFIXES.some((prefix) => normalizedLabel.startsWith(prefix))) return;

    monthDays.forEach((day) => {
      const dayIso = day.date;
      Object.entries(day.cells).forEach(([rawName, rawValue]) => {
        const employee = normalizeName(rawName);
        if (!employeeSet.has(employee)) return;
        const mapped = mapCellToOverride(rawValue);
        if (!mapped) return;
        overrides[`${employee}_${dayIso}`] = mapped;
      });
    });
  });

  return overrides;
})();
