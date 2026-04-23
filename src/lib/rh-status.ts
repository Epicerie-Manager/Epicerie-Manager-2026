export type RhEmployeeRole = "COLLABORATEUR" | "COORDINATEUR" | "GESTIONNAIRE" | "DIRECTRICE";
export type RhEmployeeType = "M" | "S" | "E";
const BALISAGE_EXCLUDED_EMPLOYEE_NAMES = new Set(["ABDOU", "MASSIMO"]);

export const RH_ROLE_META: Record<
  RhEmployeeRole,
  { label: string; color: string; bg: string; border: string }
> = {
  COLLABORATEUR: {
    label: "Collaborateur",
    color: "#1d4ed8",
    bg: "#dbeafe",
    border: "#93c5fd",
  },
  COORDINATEUR: {
    label: "Coordinateur",
    color: "#0f766e",
    bg: "#ccfbf1",
    border: "#5eead4",
  },
  GESTIONNAIRE: {
    label: "Gestionnaire",
    color: "#7c3aed",
    bg: "#ede9fe",
    border: "#c4b5fd",
  },
  DIRECTRICE: {
    label: "Directrice",
    color: "#7c2d12",
    bg: "#ffedd5",
    border: "#fdba74",
  },
};

export const RH_ROLE_OPTIONS = ([
  "COLLABORATEUR",
  "COORDINATEUR",
  "GESTIONNAIRE",
] as RhEmployeeRole[]).map((id) => ({
  id,
  ...RH_ROLE_META[id],
}));

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function isRhEmployeeExcludedByNameFromBalisage(name: unknown) {
  return BALISAGE_EXCLUDED_EMPLOYEE_NAMES.has(normalizeText(name));
}

export function normalizeRhEmployeeRole(value: unknown, employeeType?: RhEmployeeType | string): RhEmployeeRole {
  const normalized = normalizeText(value);
  if (normalized.includes("DIRECTION") || normalized.includes("DIRECTR")) return "DIRECTRICE";
  if (normalized.includes("GEST")) return "GESTIONNAIRE";
  if (normalized.includes("COORD") || normalized.includes("RESP") || normalized.includes("RAYON")) return "COORDINATEUR";
  return "COLLABORATEUR";
}

export function getRhEmployeeDbStatus(value: unknown, employeeType?: RhEmployeeType | string) {
  const role = normalizeRhEmployeeRole(value, employeeType);
  return role;
}

export function getRhEmployeeRoleMeta(value: unknown, employeeType?: RhEmployeeType | string) {
  const role = normalizeRhEmployeeRole(value, employeeType);
  return { id: role, ...RH_ROLE_META[role] };
}

export function getRhEmployeeResolvedRole(
  rhStatusValue: unknown,
  observationValue?: unknown,
  employeeType?: RhEmployeeType | string,
): RhEmployeeRole {
  const normalizedStatus = normalizeText(rhStatusValue);
  if (normalizedStatus) {
    return normalizeRhEmployeeRole(rhStatusValue, employeeType);
  }

  return normalizeRhEmployeeRole(observationValue, employeeType);
}

export function getRhEmployeeRoleLabel(value: unknown, employeeType?: RhEmployeeType | string) {
  return getRhEmployeeRoleMeta(value, employeeType).label;
}

export function isRhEmployeeCoordinatorRole(value: unknown, employeeType?: RhEmployeeType | string) {
  return normalizeRhEmployeeRole(value, employeeType) === "COORDINATEUR";
}

export function isRhEmployeeOfficeRole(value: unknown, employeeType?: RhEmployeeType | string) {
  return normalizeRhEmployeeRole(value, employeeType) === "GESTIONNAIRE";
}

export function isRhEmployeeExcludedFromPlanning(value: unknown, employeeType?: RhEmployeeType | string) {
  const normalized = normalizeText(value);
  return normalized.includes("DIRECTION") || normalized.includes("DIRECTR");
}

export function isRhEmployeeExcludedFromBalisage(value: unknown, employeeType?: RhEmployeeType | string) {
  const role = normalizeRhEmployeeRole(value, employeeType);
  return role === "GESTIONNAIRE" || isRhEmployeeExcludedFromPlanning(value, employeeType);
}
