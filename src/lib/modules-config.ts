export const MODULE_ACCESS_KEYS = [
  "planning",
  "ruptures",
  "absences",
  "infos",
  "rh",
  "balisage",
  "plateau",
  "plan_tg",
  "plan_riz",
  "exports",
] as const;

export type ModuleAccessKey = (typeof MODULE_ACCESS_KEYS)[number];

export type ModuleConfig = {
  key: ModuleAccessKey;
  moduleId: "planning" | "ruptures" | "absences" | "infos" | "rh" | "balisage" | "plateau" | "plantg" | "planriz" | "exports";
  label: string;
  href: string;
  description: string;
};

export type OfficeProfileRole = "manager" | "admin" | "gestionnaire" | "viewer" | "collaborateur" | string;

export const ALL_MODULES: ModuleConfig[] = [
  { key: "planning", moduleId: "planning", label: "Planning", href: "/planning", description: "Horaires et présences" },
  { key: "ruptures", moduleId: "ruptures", label: "Ruptures", href: "/ruptures", description: "Suivi des ruptures du jour" },
  { key: "absences", moduleId: "absences", label: "Absences", href: "/absences", description: "Demandes et validation" },
  { key: "infos", moduleId: "infos", label: "Infos", href: "/infos", description: "Base documentaire" },
  { key: "rh", moduleId: "rh", label: "RH", href: "/rh", description: "Fiches employés" },
  { key: "balisage", moduleId: "balisage", label: "Balisage", href: "/stats", description: "Contrôle étiquetage" },
  { key: "plateau", moduleId: "plateau", label: "Plateaux", href: "/plan-plateau", description: "Implantations terrain" },
  { key: "plan_tg", moduleId: "plantg", label: "Plan TG", href: "/plan-tg", description: "Mécaniques rayon" },
  { key: "plan_riz", moduleId: "planriz", label: "Plan de rayon", href: "/plan-de-rayon", description: "Réimplantations et plans rayon" },
  { key: "exports", moduleId: "exports", label: "Exports", href: "/exports", description: "Impressions et supports" },
];

function normalizeRole(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeAllowedModule(value: unknown): ModuleAccessKey | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  return MODULE_ACCESS_KEYS.find((item) => item === normalized) ?? null;
}

export function normalizeAllowedModules(value: unknown): ModuleAccessKey[] {
  if (!Array.isArray(value)) return [];

  const normalized = value
    .map((item) => normalizeAllowedModule(item))
    .filter((item): item is ModuleAccessKey => item !== null);

  return Array.from(new Set(normalized));
}

export function isPrivilegedOfficeRole(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "manager" || normalizedRole === "admin";
}

export function isGestionnaireRole(role: string | null | undefined) {
  return normalizeRole(role) === "gestionnaire";
}

export function isViewerRole(role: string | null | undefined) {
  return normalizeRole(role) === "viewer";
}

export function isCollaborateurRole(role: string | null | undefined) {
  return normalizeRole(role) === "collaborateur";
}

export function hasOfficeModuleAccess(profile: {
  role: OfficeProfileRole | null | undefined;
  allowed_modules?: ModuleAccessKey[] | null | undefined;
}) {
  if (isPrivilegedOfficeRole(profile.role)) return true;
  return getVisibleModules(profile).length > 0;
}

export function isReadOnlyOfficeAccessRole(profile: {
  role: OfficeProfileRole | null | undefined;
  allowed_modules?: ModuleAccessKey[] | null | undefined;
}) {
  const allowedModules = normalizeAllowedModules(profile.allowed_modules);
  return isViewerRole(profile.role) || (isCollaborateurRole(profile.role) && allowedModules.length > 0);
}

export function isLimitedOfficeAccessRole(profile: {
  role: OfficeProfileRole | null | undefined;
  allowed_modules?: ModuleAccessKey[] | null | undefined;
}) {
  const allowedModules = normalizeAllowedModules(profile.allowed_modules);
  return isGestionnaireRole(profile.role) || isViewerRole(profile.role) || (isCollaborateurRole(profile.role) && allowedModules.length > 0);
}

export function getVisibleModules(profile: {
  role: OfficeProfileRole | null | undefined;
  allowed_modules?: ModuleAccessKey[] | null | undefined;
}) {
  if (isPrivilegedOfficeRole(profile.role)) {
    return ALL_MODULES;
  }

  if (isLimitedOfficeAccessRole(profile)) {
    const allowedModules = normalizeAllowedModules(profile.allowed_modules);
    return ALL_MODULES.filter((moduleItem) => allowedModules.includes(moduleItem.key));
  }

  return [];
}

export function getModuleConfigByKey(moduleKey: ModuleAccessKey) {
  return ALL_MODULES.find((moduleItem) => moduleItem.key === moduleKey) ?? null;
}
