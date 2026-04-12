import {
  type PlanningOverrides,
  formatPlanningDate,
} from "@/lib/planning-store";
import { type RhCycles, type RhEmployee } from "@/lib/rh-store";
import { isRhEmployeeCoordinatorRole } from "@/lib/rh-status";

export const EXPORT_JOUR_SHORT = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];
export const EXPORT_MOIS_FR = ["janv.", "fevr.", "mars", "avr.", "mai", "juin", "juil.", "aout", "sept.", "oct.", "nov.", "dec."];

export type ExportPlanningFormat = "2s" | "1m";

export type ExportPlanningSectionId =
  | "morningCoordinators"
  | "morningTeam"
  | "afternoonCoordinators"
  | "afternoonTeam"
  | "students";

export type ExportPlanningSection = {
  id: ExportPlanningSectionId;
  label: string;
  bandBg: string;
  bandColor: string;
  nameBg: string;
  cellBg: string;
  employees: RhEmployee[];
};

type ExportStatusCell = {
  text: string;
  bg: string;
  color: string;
  borderColor: string;
  accentColor?: string;
};

const SECTION_META: Record<
  ExportPlanningSectionId,
  Omit<ExportPlanningSection, "employees">
> = {
  morningCoordinators: {
    id: "morningCoordinators",
    label: "Coordo matin",
    bandBg: "#f0fdf4",
    bandColor: "#166534",
    nameBg: "#f8fafc",
    cellBg: "#ffffff",
  },
  morningTeam: {
    id: "morningTeam",
    label: "Equipe matin",
    bandBg: "#eff6ff",
    bandColor: "#1e40af",
    nameBg: "#f8fafc",
    cellBg: "#ffffff",
  },
  afternoonCoordinators: {
    id: "afternoonCoordinators",
    label: "Coordo apres-midi",
    bandBg: "#fff7ed",
    bandColor: "#9a3412",
    nameBg: "#f8fafc",
    cellBg: "#ffffff",
  },
  afternoonTeam: {
    id: "afternoonTeam",
    label: "Equipe apres-midi",
    bandBg: "#fef9c3",
    bandColor: "#854d0e",
    nameBg: "#f8fafc",
    cellBg: "#ffffff",
  },
  students: {
    id: "students",
    label: "Etudiants",
    bandBg: "#f5f3ff",
    bandColor: "#5b21b6",
    nameBg: "#f8fafc",
    cellBg: "#ffffff",
  },
};

const SECTION_ORDER: ExportPlanningSectionId[] = [
  "morningCoordinators",
  "morningTeam",
  "afternoonCoordinators",
  "afternoonTeam",
  "students",
];

const STATUS_STYLE: Record<string, ExportStatusCell> = {
  PRESENT: { text: "", bg: "#ffffff", color: "#166534", borderColor: "#e5e7eb", accentColor: "#16a34a" },
  RH: { text: "RH", bg: "#fffbeb", color: "#92400e", borderColor: "#e5e7eb", accentColor: "#d97706" },
  CP: { text: "CP", bg: "#fff7f7", color: "#991b1b", borderColor: "#e5e7eb", accentColor: "#dc2626" },
  DEPLACEMENT_RH: { text: "DEP RH", bg: "#eef2ff", color: "#4338ca", borderColor: "#c7d2fe", accentColor: "#4338ca" },
  FERIE: { text: "FER", bg: "#fff7f7", color: "#991b1b", borderColor: "#e5e7eb", accentColor: "#dc2626" },
  X: { text: "—", bg: "#f9fafb", color: "#9ca3af", borderColor: "#f3f4f6" },
  ABS: { text: "ABS", bg: "#fff7f7", color: "#991b1b", borderColor: "#e5e7eb", accentColor: "#dc2626" },
  MAL: { text: "MAL", bg: "#fff7f7", color: "#991b1b", borderColor: "#e5e7eb", accentColor: "#dc2626" },
  CONGE_MAT: { text: "C.M", bg: "#fdf2f8", color: "#831843", borderColor: "#e5e7eb", accentColor: "#db2777" },
  FORM: { text: "FOR", bg: "#fff7f7", color: "#991b1b", borderColor: "#e5e7eb", accentColor: "#dc2626" },
};

export function getMondayOfWeek(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - ((next.getDay() + 6) % 7));
  return next;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getPeriodDates(format: ExportPlanningFormat, anchor: Date) {
  if (format === "1m") {
    return Array.from({ length: getDaysInMonth(anchor) }, (_, index) => new Date(anchor.getFullYear(), anchor.getMonth(), index + 1));
  }
  return Array.from({ length: 14 }, (_, index) => addDays(anchor, index));
}

function getIsoWeek(date: Date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function dayToCycleCode(day: number) {
  return ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"][day];
}

function getDefaultStatus(employee: RhEmployee, date: Date, cycles: RhCycles) {
  const dow = date.getDay();
  if (dow === 0) return "X";
  if (employee.t === "E") return dow === 6 ? "PRESENT" : "X";
  if (!employee.actif) return "CONGE_MAT";
  const employeeCycle = cycles[employee.n];
  if (employeeCycle?.length) {
    const cycleWeek = (getIsoWeek(date) - 1) % 5;
    if (employeeCycle[cycleWeek] === dayToCycleCode(dow)) return "RH";
  }
  return "PRESENT";
}

function getDefaultHoraire(employee: RhEmployee, date: Date) {
  const dow = date.getDay();
  if (dow === 2) return employee.hm;
  if (dow === 6 && employee.t === "E") return employee.hsa || "14h-21h30";
  return employee.hs;
}

function normalizeOverrideStatus(value: string | undefined) {
  const upper = String(value || "").trim().toUpperCase();
  if (!upper) return "";
  if (upper === "ABSENT") return "ABS";
  return upper;
}

export function getCellStatus(
  employee: RhEmployee,
  date: Date,
  overrides: PlanningOverrides,
  cycles: RhCycles,
) {
  const key = `${employee.n}_${formatPlanningDate(date)}`;
  const override = overrides[key];
  const status = normalizeOverrideStatus(override?.s) || getDefaultStatus(employee, date, cycles);
  const horaire = override?.h ?? getDefaultHoraire(employee, date);
  if (status === "PRESENT") {
    return {
      status,
      text: horaire || "P",
      shortText: String(horaire || "P").split("-")[0],
      style: STATUS_STYLE.PRESENT,
    };
  }
  const style = STATUS_STYLE[status] || STATUS_STYLE.X;
  return {
    status,
    text: style.text,
    shortText: style.text,
    style,
  };
}

export function getMorningPresentCount(
  date: Date,
  employees: RhEmployee[],
  overrides: PlanningOverrides,
  cycles: RhCycles,
) {
  return employees.filter((employee) => {
    if (employee.t !== "M") return false;
    return getCellStatus(employee, date, overrides, cycles).status === "PRESENT";
  }).length;
}

function getSectionId(employee: RhEmployee): ExportPlanningSectionId {
  if (employee.t === "E") return "students";
  if (employee.t === "S") {
    return isRhEmployeeCoordinatorRole(employee.obs, employee.t) || employee.n === "MASSIMO"
      ? "afternoonCoordinators"
      : "afternoonTeam";
  }
  return isRhEmployeeCoordinatorRole(employee.obs, employee.t) || employee.n === "ABDOU"
    ? "morningCoordinators"
    : "morningTeam";
}

export function getEmployeeBadges(employee: RhEmployee) {
  if (employee.n === "ABDOU") return [{ label: "Coordo", bg: "#fee2e2", color: "#b91c1c" }];
  if (employee.n === "MASSIMO") return [{ label: "Coordo", bg: "#dbeafe", color: "#1d4ed8" }];
  return [];
}

export function groupEmployeesForExport(employees: RhEmployee[]) {
  const grouped: Record<ExportPlanningSectionId, RhEmployee[]> = {
    morningCoordinators: [],
    morningTeam: [],
    afternoonCoordinators: [],
    afternoonTeam: [],
    students: [],
  };
  employees
    .slice()
    .sort((a, b) => a.n.localeCompare(b.n, "fr"))
    .forEach((employee) => {
      grouped[getSectionId(employee)].push(employee);
    });

  return SECTION_ORDER.map((id) => ({
    ...SECTION_META[id],
    employees: grouped[id],
  })).filter((section) => section.employees.length > 0);
}

export function getPeriodLabel(format: ExportPlanningFormat, anchor: Date) {
  if (format === "1m") {
    return `${EXPORT_MOIS_FR[anchor.getMonth()]} ${anchor.getFullYear()}`;
  }
  const start = anchor;
  const end = addDays(anchor, 13);
  return `Sem. ${getIsoWeek(start)}-${getIsoWeek(end)}`;
}

export function getPeriodSubLabel(format: ExportPlanningFormat, anchor: Date) {
  if (format === "1m") {
    return `${anchor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
  }
  const end = addDays(anchor, 13);
  return `${startLabel(anchor)} → ${startLabel(end)} ${end.getFullYear()}`;
}

function startLabel(date: Date) {
  return `${date.getDate()} ${EXPORT_MOIS_FR[date.getMonth()]}`;
}
