export type RhEmployeeRole = "COORDINATEUR" | "COLLABORATEUR" | "GESTIONNAIRE" | "ETUDIANT" | "STAGIAIRE" | "AUTRE";
export type RhEmployeeType = "M" | "S" | "E";

export const RH_ROLE_META: Record<
  RhEmployeeRole,
  { label: string; color: string; bg: string; border: string }
> = {
  COORDINATEUR: {
    label: "Coordinateur",
    color: "#0f766e",
    bg: "#ccfbf1",
    border: "#5eead4",
  },
  COLLABORATEUR: {
    label: "Collaborateur",
    color: "#1d4ed8",
    bg: "#dbeafe",
    border: "#93c5fd",
  },
  GESTIONNAIRE: {
    label: "Gestionnaire",
    color: "#b91c1c",
    bg: "#fee2e2",
    border: "#fca5a5",
  },
  ETUDIANT: {
    label: "Etudiant",
    color: "#7c3aed",
    bg: "#ede9fe",
    border: "#c4b5fd",
  },
  STAGIAIRE: {
    label: "Stagiaire",
    color: "#d97706",
    bg: "#fef3c7",
    border: "#fcd34d",
  },
  AUTRE: {
    label: "Autre",
    color: "#475569",
    bg: "#e2e8f0",
    border: "#cbd5e1",
  },
};

export const RH_ROLE_OPTIONS = Object.entries(RH_ROLE_META).map(([id, meta]) => ({
  id: id as RhEmployeeRole,
  ...meta,
}));

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function normalizeRhEmployeeRole(value: unknown, employeeType?: RhEmployeeType | string): RhEmployeeRole {
  const normalized = normalizeText(value);
  const normalizedType = normalizeText(employeeType);

  if (normalized.includes("COORD")) return "COORDINATEUR";
  if (normalized.includes("GESTION")) return "GESTIONNAIRE";
  if (normalized.includes("STAG")) return "STAGIAIRE";
  if (normalized.includes("ETUD")) return "ETUDIANT";
  if (normalized.includes("COLLAB") || normalized.includes("EMPLOY")) return "COLLABORATEUR";
  if (normalized.includes("AUTRE")) return "AUTRE";
  if (normalizedType === "E" || normalizedType.includes("ETUD")) return "ETUDIANT";
  return "COLLABORATEUR";
}

export function getRhEmployeeRoleMeta(value: unknown, employeeType?: RhEmployeeType | string) {
  const role = normalizeRhEmployeeRole(value, employeeType);
  return { id: role, ...RH_ROLE_META[role] };
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

export function isRhEmployeeExcludedFromBalisage(value: unknown, employeeType?: RhEmployeeType | string) {
  const role = normalizeRhEmployeeRole(value, employeeType);
  return role === "COORDINATEUR" || role === "GESTIONNAIRE";
}
