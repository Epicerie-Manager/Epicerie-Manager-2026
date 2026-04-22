export const MODULE_ACCESS_KEYS = [
  "planning",
  "ruptures",
  "absences",
  "infos",
  "rh",
  "balisage",
  "plateau",
  "plan_tg",
  "plan_rayon",
  "exports",
] as const;

export type ModuleAccessKey = (typeof MODULE_ACCESS_KEYS)[number];
export type ModulePermissionLevel = "read" | "write";
export type ModulePermissions = Partial<Record<ModuleAccessKey, ModulePermissionLevel>>;

export type ModuleConfig = {
  key: ModuleAccessKey;
  moduleId: "planning" | "ruptures" | "absences" | "infos" | "rh" | "balisage" | "plateau" | "plantg" | "planriz" | "exports";
  label: string;
  href: string;
  description: string;
};

export type OfficeProfileRole = "manager" | "admin" | "gestionnaire" | "viewer" | "collaborateur" | "custom_access" | string;

export const ALL_MODULES: ModuleConfig[] = [
  { key: "planning", moduleId: "planning", label: "Planning", href: "/planning", description: "Horaires et présences" },
  { key: "ruptures", moduleId: "ruptures", label: "Ruptures", href: "/ruptures", description: "Suivi des ruptures du jour" },
  { key: "absences", moduleId: "absences", label: "Absences", href: "/absences", description: "Demandes et validation" },
  { key: "infos", moduleId: "infos", label: "Infos", href: "/infos", description: "Base documentaire" },
  { key: "rh", moduleId: "rh", label: "RH", href: "/rh", description: "Fiches employés" },
  { key: "balisage", moduleId: "balisage", label: "Balisage", href: "/stats", description: "Contrôle étiquetage" },
  { key: "plateau", moduleId: "plateau", label: "Plateaux", href: "/plan-plateau", description: "Implantations terrain" },
  { key: "plan_tg", moduleId: "plantg", label: "Plan TG", href: "/plan-tg", description: "Mécaniques rayon" },
  { key: "plan_rayon", moduleId: "planriz", label: "Plan de rayon", href: "/plan-de-rayon", description: "Réimplantations et plans rayon" },
  { key: "exports", moduleId: "exports", label: "Exports", href: "/exports", description: "Impressions et supports" },
];

function normalizeRole(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeAllowedModule(value: unknown): ModuleAccessKey | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "plan_riz") return "plan_rayon";
  return MODULE_ACCESS_KEYS.find((item) => item === normalized) ?? null;
}

function normalizeModulePermissionLevel(value: unknown): ModulePermissionLevel | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "write" || normalized === "edit" || normalized === "rw") return "write";
  if (normalized === "read" || normalized === "view" || normalized === "ro") return "read";
  return null;
}

export function normalizeAllowedModules(value: unknown): ModuleAccessKey[] {
  if (!Array.isArray(value)) return [];

  const normalized = value
    .map((item) => normalizeAllowedModule(item))
    .filter((item): item is ModuleAccessKey => item !== null);

  return Array.from(new Set(normalized));
}

export function normalizeModulePermissions(value: unknown): ModulePermissions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, permission]) => {
      const normalizedKey = normalizeAllowedModule(key);
      const normalizedPermission = normalizeModulePermissionLevel(permission);
      if (!normalizedKey || !normalizedPermission) return null;
      return [normalizedKey, normalizedPermission] as const;
    })
    .filter((entry): entry is readonly [ModuleAccessKey, ModulePermissionLevel] => entry !== null);

  return Object.fromEntries(entries) as ModulePermissions;
}

export function buildModulePermissionsFromAllowedModules(
  allowedModules: unknown,
  level: ModulePermissionLevel = "read",
): ModulePermissions {
  return Object.fromEntries(
    normalizeAllowedModules(allowedModules).map((moduleKey) => [moduleKey, level] as const),
  ) as ModulePermissions;
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

export function isBureauRole(role: string | null | undefined) {
  return normalizeRole(role) === "custom_access";
}

export function getProfileModulePermissions(profile: {
  role: OfficeProfileRole | null | undefined;
  allowed_modules?: ModuleAccessKey[] | null | undefined;
  module_permissions?: ModulePermissions | null | undefined;
}) {
  const explicitPermissions = normalizeModulePermissions(profile.module_permissions);
  if (Object.keys(explicitPermissions).length > 0) {
    return explicitPermissions;
  }

  const allowedModules = normalizeAllowedModules(profile.allowed_modules);
  if (!allowedModules.length) return {};

  const fallbackLevel: ModulePermissionLevel = isGestionnaireRole(profile.role) ? "write" : "read";
  return buildModulePermissionsFromAllowedModules(allowedModules, fallbackLevel);
}

export function hasOfficeModuleAccess(profile: {
  role: OfficeProfileRole | null | undefined;
  allowed_modules?: ModuleAccessKey[] | null | undefined;
  module_permissions?: ModulePermissions | null | undefined;
}) {
  if (isPrivilegedOfficeRole(profile.role)) return true;
  return getVisibleModules(profile).length > 0;
}

export function isReadOnlyOfficeAccessRole(profile: {
  role: OfficeProfileRole | null | undefined;
  allowed_modules?: ModuleAccessKey[] | null | undefined;
  module_permissions?: ModulePermissions | null | undefined;
}) {
  if (isPrivilegedOfficeRole(profile.role)) return false;
  const permissions = getProfileModulePermissions(profile);
  const permissionValues = Object.values(permissions);
  if (permissionValues.length > 0) {
    return permissionValues.every((permission) => permission === "read");
  }
  const allowedModules = normalizeAllowedModules(profile.allowed_modules);
  return isViewerRole(profile.role) || (isCollaborateurRole(profile.role) && allowedModules.length > 0);
}

export function isLimitedOfficeAccessRole(profile: {
  role: OfficeProfileRole | null | undefined;
  allowed_modules?: ModuleAccessKey[] | null | undefined;
  module_permissions?: ModulePermissions | null | undefined;
}) {
  const permissions = getProfileModulePermissions(profile);
  if (Object.keys(permissions).length > 0) return true;
  const allowedModules = normalizeAllowedModules(profile.allowed_modules);
  return (
    isGestionnaireRole(profile.role) ||
    isViewerRole(profile.role) ||
    isBureauRole(profile.role) ||
    (isCollaborateurRole(profile.role) && allowedModules.length > 0)
  );
}

export function getVisibleModules(profile: {
  role: OfficeProfileRole | null | undefined;
  allowed_modules?: ModuleAccessKey[] | null | undefined;
  module_permissions?: ModulePermissions | null | undefined;
}) {
  if (isPrivilegedOfficeRole(profile.role)) {
    return ALL_MODULES;
  }

  if (isLimitedOfficeAccessRole(profile)) {
    const permissions = getProfileModulePermissions(profile);
    const allowedModules = Object.keys(permissions).length > 0
      ? (Object.keys(permissions) as ModuleAccessKey[])
      : normalizeAllowedModules(profile.allowed_modules);
    return ALL_MODULES.filter((moduleItem) => allowedModules.includes(moduleItem.key));
  }

  return [];
}

export function getModulePermissionLevel(
  profile: {
    role: OfficeProfileRole | null | undefined;
    allowed_modules?: ModuleAccessKey[] | null | undefined;
    module_permissions?: ModulePermissions | null | undefined;
  },
  moduleKey: ModuleAccessKey,
) {
  if (isPrivilegedOfficeRole(profile.role)) return "write" satisfies ModulePermissionLevel;
  return getProfileModulePermissions(profile)[moduleKey] ?? null;
}

export function canReadOfficeModule(
  profile: {
    role: OfficeProfileRole | null | undefined;
    allowed_modules?: ModuleAccessKey[] | null | undefined;
    module_permissions?: ModulePermissions | null | undefined;
  },
  moduleKey: ModuleAccessKey,
) {
  return getModulePermissionLevel(profile, moduleKey) !== null;
}

export function canWriteOfficeModule(
  profile: {
    role: OfficeProfileRole | null | undefined;
    allowed_modules?: ModuleAccessKey[] | null | undefined;
    module_permissions?: ModulePermissions | null | undefined;
  },
  moduleKey: ModuleAccessKey,
) {
  return getModulePermissionLevel(profile, moduleKey) === "write";
}

export function getModuleConfigByKey(moduleKey: ModuleAccessKey) {
  return ALL_MODULES.find((moduleItem) => moduleItem.key === moduleKey) ?? null;
}
